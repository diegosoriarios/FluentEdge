import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import {
  ChecksumMismatchError,
  ConfigError,
  DownloadError,
  LowStorageError,
  assertModelConfigured,
  checkFreeSpace,
  deleteModelFiles,
  findExistingTask,
  getDownloadedVariant,
  removePartFile,
  startDownload,
  toManagerError,
  watchTask,
} from '../services/modelManager';
import type {
  DownloadCallbacks,
  NetworkChoice,
} from '../services/modelManager';
import type { ModelVariant } from '../ai/modelConfig';
import {
  checkDeviceCapabilities,
} from '../services/deviceCapabilities';
import type { DeviceCapability } from '../services/deviceCapabilities';
import {
  evaluateWriting,
  generateWritingPrompt,
  releaseModel as releaseTutorModel,
} from '../ai/tutor';
import type { EvaluateCallbacks } from '../ai/tutor';
import type { Evaluation, Profile } from '../navigation/types';

export type ModelState =
  | 'not-downloaded'
  | 'downloading'
  | 'paused'
  | 'verifying'
  | 'ready'
  | 'error';

type ModelContextValue = {
  modelState: ModelState;
  progress: number;
  errorMessage: string | null;
  activeVariant: ModelVariant;
  deviceCapability: DeviceCapability | null;
  refreshCapability: () => Promise<void>;
  startDownload: (network: NetworkChoice, variant?: ModelVariant) => void;
  pauseDownload: () => void;
  resumeDownload: () => void;
  cancelDownload: () => void;
  deleteModel: (variant?: ModelVariant) => void;
  evaluate: (
    profile: Profile,
    prompt: string,
    response: string,
    weakSpotsSummary?: string,
    callbacks?: EvaluateCallbacks,
  ) => Promise<Evaluation>;
  generatePrompt: (profile: Profile, weakSpotsSummary?: string) => Promise<string>;
};

const ModelContext = createContext<ModelContextValue | null>(null);

export const MODEL_IDLE_RELEASE_MS = 5 * 60_000;

function describeError(error: unknown): string {
  if (error instanceof LowStorageError) {
    return 'Not enough free storage on this device. Free up space and try again.';
  }
  if (error instanceof ChecksumMismatchError) {
    return 'Download failed verification. The file was removed — please retry.';
  }
  if (error instanceof ConfigError) {
    return error.message;
  }
  if (error instanceof DownloadError) {
    return `Download failed${error.code ? ` (code ${error.code})` : ''}. Retrying resumes where it stopped.`;
  }
  return error instanceof Error ? error.message : 'Unexpected error.';
}

export function ModelProvider({ children }: { children: ReactNode }) {
  const [modelState, setModelState] = useState<ModelState>('not-downloaded');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeVariant, setActiveVariant] = useState<ModelVariant>('full');
  const [deviceCapability, setDeviceCapability] =
    useState<DeviceCapability | null>(null);
  const taskRef = useRef<ReturnType<typeof startDownload> | null>(null);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(0);

  const makeCallbacks = useCallback((): DownloadCallbacks => {
    return {
      onProgress: percent => setProgress(percent),
      onVerifying: () => setModelState('verifying'),
      onReady: () => {
        taskRef.current = null;
        setProgress(1);
        setErrorMessage(null);
        setModelState('ready');
      },
      onError: error => {
        taskRef.current = null;
        setErrorMessage(describeError(error));
        setModelState('error');
      },
    };
  }, []);

  const refreshCapability = useCallback(async () => {
    try {
      setDeviceCapability(await checkDeviceCapabilities());
    } catch (error) {
      console.warn('Failed to check device capabilities', error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshCapability();
      try {
        const downloaded = await getDownloadedVariant();
        if (downloaded && !cancelled) {
          setActiveVariant(downloaded);
          setProgress(1);
          setModelState('ready');
          return;
        }
        for (const variant of ['full', 'small'] as ModelVariant[]) {
          const existing = await findExistingTask(variant);
          if (existing && !cancelled) {
            taskRef.current = existing;
            setActiveVariant(variant);
            setProgress(existing.percent);
            setModelState(
              existing.state === 'PAUSED' ? 'paused' : 'downloading',
            );
            watchTask(existing, variant, makeCallbacks());
            return;
          }
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(describeError(toManagerError(error)));
          setModelState('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [makeCallbacks, refreshCapability]);

  const startDownloadImpl = useCallback(
    (network: NetworkChoice, variant: ModelVariant = 'full') => {
      try {
        assertModelConfigured(variant);
      } catch (error) {
        setErrorMessage(describeError(toManagerError(error)));
        setModelState('error');
        return;
      }
      checkFreeSpace(variant)
        .then(() => {
          setActiveVariant(variant);
          taskRef.current = startDownload(variant, network, makeCallbacks());
          setProgress(0);
          setErrorMessage(null);
          setModelState('downloading');
        })
        .catch(error => {
          setErrorMessage(describeError(toManagerError(error)));
          setModelState('error');
        });
    },
    [makeCallbacks],
  );

  const pauseDownload = useCallback(() => {
    taskRef.current?.pause();
    setModelState('paused');
  }, []);

  const resumeDownload = useCallback(() => {
    taskRef.current?.resume();
    setModelState('downloading');
  }, []);

  const cancelDownload = useCallback(async () => {
    taskRef.current?.stop();
    taskRef.current = null;
    await removePartFile(activeVariant).catch(() => {});
    setProgress(0);
    setErrorMessage(null);
    setModelState('not-downloaded');
  }, [activeVariant]);

  const deleteModelImpl = useCallback(
    async (variant: ModelVariant = activeVariant) => {
      taskRef.current?.stop();
      taskRef.current = null;
      await releaseTutorModel().catch(() => {});
      await deleteModelFiles(variant).catch(() => {});
      await refreshCapability();
      const remaining = await getDownloadedVariant().catch(() => null);
      if (remaining) {
        setActiveVariant(remaining);
        setModelState('ready');
      } else {
        setProgress(0);
        setErrorMessage(null);
        setModelState('not-downloaded');
      }
    },
    [activeVariant, refreshCapability],
  );

  const evaluate = useCallback(
    async (
      profile: Profile,
      prompt: string,
      response: string,
      weakSpotsSummary = '',
      callbacks?: EvaluateCallbacks,
    ) => {
      inFlightRef.current += 1;
      try {
        return await evaluateWriting(
          profile,
          prompt,
          response,
          weakSpotsSummary,
          callbacks,
        );
      } finally {
        inFlightRef.current -= 1;
      }
    },
    [],
  );

  const generatePrompt = useCallback(
    async (profile: Profile, weakSpotsSummary = '') => {
      inFlightRef.current += 1;
      try {
        return await generateWritingPrompt(profile, weakSpotsSummary);
      } finally {
        inFlightRef.current -= 1;
      }
    },
    [],
  );

  useEffect(() => {
    const clearReleaseTimer = () => {
      if (releaseTimerRef.current != null) {
        clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }
    };
    const scheduleRelease = () => {
      if (releaseTimerRef.current != null) {
        return;
      }
      releaseTimerRef.current = setTimeout(() => {
        releaseTimerRef.current = null;
        if (inFlightRef.current === 0) {
          releaseTutorModel().catch(() => {});
        }
      }, MODEL_IDLE_RELEASE_MS);
    };
    const subscription = AppState.addEventListener('change', state => {
      if (state.match('background')) {
        scheduleRelease();
      } else if (state === 'active') {
        clearReleaseTimer();
      }
    });
    return () => {
      subscription.remove();
      clearReleaseTimer();
    };
  }, []);

  const value = useMemo(
    () => ({
      modelState,
      progress,
      errorMessage,
      activeVariant,
      deviceCapability,
      refreshCapability,
      startDownload: startDownloadImpl,
      pauseDownload,
      resumeDownload,
      cancelDownload,
      deleteModel: deleteModelImpl,
      evaluate,
      generatePrompt,
    }),
    [
      modelState,
      progress,
      errorMessage,
      activeVariant,
      deviceCapability,
      refreshCapability,
      startDownloadImpl,
      pauseDownload,
      resumeDownload,
      cancelDownload,
      deleteModelImpl,
      evaluate,
      generatePrompt,
    ],
  );

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>;
}

export function useModel(): ModelContextValue {
  const value = useContext(ModelContext);
  if (!value) {
    throw new Error('useModel must be used within ModelProvider');
  }
  return value;
}
