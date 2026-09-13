import RNFS from 'react-native-fs';
import {
  createDownloadTask,
  getExistingDownloadTasks,
} from '@kesha-antonov/react-native-background-downloader';
import type { DownloadTask } from '@kesha-antonov/react-native-background-downloader';
import {
  FREE_MARGIN_BYTES,
  MODEL_VARIANTS,
  downloadIdFor,
  isModelConfigured,
  modelPaths,
} from '../ai/modelConfig';
import type { ModelVariant } from '../ai/modelConfig';
import { logDebug } from './debugLog';

export class ModelManagerError extends Error {}

export class ConfigError extends ModelManagerError {}

export class LowStorageError extends ModelManagerError {}

export class ChecksumMismatchError extends ModelManagerError {}

export class DownloadError extends ModelManagerError {
  code?: number;

  constructor(message: string, code?: number) {
    super(message);
    this.code = code;
  }
}

export type NetworkChoice = 'wifi' | 'all';

export type DownloadCallbacks = {
  onProgress: (percent: number) => void;
  onVerifying: () => void;
  onReady: () => void;
  onError: (error: ModelManagerError) => void;
};

export function assertModelConfigured(variant: ModelVariant): void {
  if (!isModelConfigured(variant)) {
    const config = MODEL_VARIANTS[variant];
    throw new ConfigError(
      `The ${config.shortLabel} model checksum is not pinned yet. ` +
        `Run "curl -sI ${config.url}" and copy the hex value from the ` +
        `X-Linked-Etag header into MODEL_VARIANTS.${variant}.sha256 in ` +
        `src/ai/modelConfig.ts.`,
    );
  }
}

export async function checkFreeSpace(variant: ModelVariant): Promise<void> {
  const info = await RNFS.getFSInfo();
  const required = MODEL_VARIANTS[variant].bytes + FREE_MARGIN_BYTES;
  logDebug(
    'modelManager',
    `checkFreeSpace variant=${variant} free=${info.freeSpace} required=${required}`,
  );
  if (info.freeSpace < required) {
    throw new LowStorageError(
      `Not enough free storage: about ${Math.round(required / 1_000_000_000)} GB are required.`,
    );
  }
}

async function readMarker(variant: ModelVariant): Promise<string | null> {
  const { markerPath } = modelPaths(variant);
  try {
    return (await RNFS.readFile(markerPath, 'utf8')).trim().toLowerCase();
  } catch {
    return null;
  }
}

export async function hasVerifiedModel(
  variant: ModelVariant,
): Promise<boolean> {
  const { finalPath } = modelPaths(variant);
  if (!(await RNFS.exists(finalPath))) {
    return false;
  }
  return (await readMarker(variant)) === MODEL_VARIANTS[variant].sha256;
}

export async function getDownloadedVariant(): Promise<ModelVariant | null> {
  for (const variant of ['full', 'small'] as ModelVariant[]) {
    if (await hasVerifiedModel(variant)) {
      return variant;
    }
  }
  return null;
}

export type ModelInfo = {
  variant: ModelVariant;
  label: string;
  sizeBytes: number | null;
  sha256: string;
};

export async function getModelInfo(variant: ModelVariant): Promise<ModelInfo> {
  const config = MODEL_VARIANTS[variant];
  const { finalPath } = modelPaths(variant);
  let sizeBytes: number | null = null;
  if (await hasVerifiedModel(variant)) {
    try {
      const stat = await RNFS.stat(finalPath);
      sizeBytes = Number(stat.size);
    } catch {
      sizeBytes = null;
    }
  }
  return {
    variant,
    label: config.label,
    sizeBytes,
    sha256: config.sha256,
  };
}

export async function findExistingTask(
  variant: ModelVariant,
): Promise<DownloadTask | null> {
  const tasks = await getExistingDownloadTasks();
  logDebug(
    'modelManager',
    `existing download tasks: ${tasks.length}`,
    tasks.map(task => `${task.id}:${task.state}`),
  );
  const match = tasks.find(task => task.id === downloadIdFor(variant)) ?? null;
  if (match) {
    logDebug(
      'modelManager',
      `reattaching task id=${match.id} state=${match.state} bytes=${match.bytesDownloaded}/${match.bytesTotal}`,
    );
  }
  return match;
}

export function watchTask(
  task: DownloadTask,
  variant: ModelVariant,
  callbacks: DownloadCallbacks,
): void {
  let lastLoggedPercent = -1;
  task
    .begin(({ expectedBytes }) => {
      logDebug(
        'download',
        `begin id=${task.id} expectedBytes=${expectedBytes}`,
      );
    })
    .progress(({ bytesDownloaded, bytesTotal }) => {
      const percent = clamp01(
        bytesTotal > 0 ? bytesDownloaded / bytesTotal : 0,
      );
      const wholePercent = Math.floor(percent * 100);
      if (wholePercent !== lastLoggedPercent) {
        lastLoggedPercent = wholePercent;
        logDebug(
          'download',
          `progress ${wholePercent}% (${bytesDownloaded}/${bytesTotal})`,
        );
      }
      callbacks.onProgress(percent);
    })
    .done(({ location }) => {
      logDebug('download', `done id=${task.id} location=${location}`);
      callbacks.onVerifying();
      (async () => {
        try {
          await verifyAndFinalize(variant);
          callbacks.onReady();
        } catch (error) {
          callbacks.onError(toManagerError(error));
        }
      })();
    })
    .error(({ error, errorCode }) => {
      logDebug('download', `ERROR id=${task.id} code=${errorCode} ${error}`);
      callbacks.onError(new DownloadError(String(error), errorCode));
    });
}

export function startDownload(
  variant: ModelVariant,
  network: NetworkChoice,
  callbacks: DownloadCallbacks,
): DownloadTask {
  const { partPath } = modelPaths(variant);
  const config = MODEL_VARIANTS[variant];
  logDebug('modelManager', 'startDownload', {
    variant,
    url: config.url,
    destination: partPath,
    network,
    isAllowedOverMetered: network === 'all',
    isAllowedOverRoaming: network === 'all',
  });
  const task = createDownloadTask({
    id: downloadIdFor(variant),
    url: config.url,
    destination: partPath,
    isAllowedOverMetered: network === 'all',
    isAllowedOverRoaming: network === 'all',
  });
  watchTask(task, variant, callbacks);
  task.start();
  logDebug('modelManager', `task.start() called id=${task.id}`);
  return task;
}

async function verifyAndFinalize(variant: ModelVariant): Promise<void> {
  const { finalPath, partPath, markerPath } = modelPaths(variant);
  logDebug(
    'modelManager',
    `verifying sha256 of ${partPath} — hashing ~2 GB can take a while`,
  );
  const hashStart = Date.now();
  const actual = await RNFS.hash(partPath, 'sha256');
  logDebug(
    'modelManager',
    `sha256 computed in ${Date.now() - hashStart}ms: ${actual}`,
  );
  if (actual.toLowerCase() !== MODEL_VARIANTS[variant].sha256) {
    logDebug(
      'modelManager',
      `checksum mismatch, expected ${MODEL_VARIANTS[variant].sha256}`,
    );
    await removePartFile(variant);
    throw new ChecksumMismatchError(
      'Checksum mismatch — the downloaded file is corrupt or incomplete.',
    );
  }
  await RNFS.moveFile(partPath, finalPath);
  await RNFS.writeFile(markerPath, MODEL_VARIANTS[variant].sha256, 'utf8');
  logDebug('modelManager', `model verified and finalized at ${finalPath}`);
}

export async function removePartFile(variant: ModelVariant): Promise<void> {
  const { partPath } = modelPaths(variant);
  if (await RNFS.exists(partPath)) {
    await RNFS.unlink(partPath);
  }
}

export async function deleteModelFiles(variant: ModelVariant): Promise<void> {
  const { finalPath, markerPath } = modelPaths(variant);
  await removePartFile(variant);
  if (await RNFS.exists(finalPath)) {
    await RNFS.unlink(finalPath);
  }
  if (await RNFS.exists(markerPath)) {
    await RNFS.unlink(markerPath);
  }
}

export async function getVerifiedModelPath(
  variant: ModelVariant,
): Promise<string> {
  if (!(await hasVerifiedModel(variant))) {
    throw new ModelManagerError('Model file is missing or not verified.');
  }
  return modelPaths(variant).finalPath;
}

export function toManagerError(error: unknown): ModelManagerError {
  if (error instanceof ModelManagerError) {
    return error;
  }
  const message = error instanceof Error ? error.message : String(error);
  return new ModelManagerError(message);
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}
