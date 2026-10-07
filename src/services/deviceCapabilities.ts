import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { FREE_MARGIN_BYTES, MODEL_VARIANTS } from '../ai/modelConfig';
import type { ModelVariant } from '../ai/modelConfig';

export type VariantVerdict = {
  ramOk: boolean | null;
  storageOk: boolean;
};

export type DeviceCapability = {
  ramBytes: number | null;
  freeSpaceBytes: number;
  totalSpaceBytes: number;
  variants: Record<ModelVariant, VariantVerdict>;
  recommendation: 'full' | 'small' | 'block';
};

export function readTotalRamBytesSync(meminfo: string): number | null {
  const match = meminfo.match(/MemTotal:\s+(\d+)\s+kB/);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 1024;
}

export function readCoreCountSync(cpuinfo: string): number | null {
  const matches = cpuinfo.match(/^processor\s*:/gm);
  return matches == null ? null : matches.length;
}

export async function readCoreCount(): Promise<number | null> {
  if (Platform.OS !== 'android') {
    return null;
  }
  try {
    const cpuinfo = await RNFS.readFile('/proc/cpuinfo', 'utf8');
    return readCoreCountSync(cpuinfo);
  } catch {
    return null;
  }
}

export const DEFAULT_N_THREADS = 4;
export const IOS_N_THREADS = 6;
export const MAX_N_THREADS = 8;

export async function resolveNThreads(): Promise<number> {
  if (Platform.OS === 'ios') {
    return IOS_N_THREADS;
  }
  const cores = await readCoreCount();
  if (cores == null) {
    return DEFAULT_N_THREADS;
  }
  return Math.min(MAX_N_THREADS, Math.max(DEFAULT_N_THREADS, cores));
}

export async function readTotalRamBytes(): Promise<number | null> {
  if (Platform.OS !== 'android') {
    return null;
  }
  try {
    const meminfo = await RNFS.readFile('/proc/meminfo', 'utf8');
    return readTotalRamBytesSync(meminfo);
  } catch {
    return null;
  }
}

export function evaluateCapabilities(
  ramBytes: number | null,
  freeSpaceBytes: number,
): DeviceCapability {
  const variants = {} as Record<ModelVariant, VariantVerdict>;
  for (const key of Object.keys(MODEL_VARIANTS) as ModelVariant[]) {
    const config = MODEL_VARIANTS[key];
    variants[key] = {
      ramOk: ramBytes == null ? null : ramBytes >= config.ramMinimumBytes,
      storageOk: freeSpaceBytes >= config.bytes + FREE_MARGIN_BYTES,
    };
  }

  let recommendation: DeviceCapability['recommendation'] = 'block';
  if (meetsVariant(variants.full)) {
    recommendation = 'full';
  } else if (meetsVariant(variants.small)) {
    recommendation = 'small';
  }

  return {
    ramBytes,
    freeSpaceBytes,
    totalSpaceBytes: 0,
    variants,
    recommendation,
  };
}

function meetsVariant(verdict: VariantVerdict): boolean {
  const ramOk = verdict.ramOk !== false;
  return ramOk && verdict.storageOk;
}

export async function checkDeviceCapabilities(): Promise<DeviceCapability> {
  const [ramBytes, fsInfo] = await Promise.all([
    readTotalRamBytes(),
    RNFS.getFSInfo(),
  ]);
  const capability = evaluateCapabilities(ramBytes, fsInfo.freeSpace);
  capability.totalSpaceBytes = fsInfo.totalSpace;
  return capability;
}
