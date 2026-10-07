import { generateExercise } from '../ai/tutor';
import type { GeneratedExercise } from '../ai/tutor';
import type { ExerciseType, Profile } from '../navigation/types';
import { nextExerciseType } from '../utils/exercises';
import { logDebug } from './debugLog';

const MAX_AGE_MS = 12 * 60 * 60 * 1000;

type CacheEntry = {
  generated: GeneratedExercise;
  fingerprint: string;
  createdAt: number;
};

let entry: CacheEntry | null = null;
let inFlight: Promise<void> | null = null;
let queue: Promise<unknown> = Promise.resolve();

export function enqueueGeneration<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task, task);
  queue = result.catch(() => {});
  return result;
}

export function buildExerciseFingerprint(
  profile: Profile,
  weakSpotsSummary: string,
): string {
  return [
    profile.level,
    profile.goal,
    profile.targetLanguage ?? 'en',
    profile.explanationLanguage ?? '',
    profile.focusAreas.join('|'),
    profile.modelVariant ?? 'full',
    weakSpotsSummary.trim(),
  ].join('\n');
}

function isFresh(fingerprint: string, now = Date.now()): boolean {
  return (
    entry != null &&
    entry.fingerprint === fingerprint &&
    now - entry.createdAt <= MAX_AGE_MS
  );
}

export function takeCachedExercise(
  profile: Profile,
  weakSpotsSummary = '',
): GeneratedExercise | null {
  if (!isFresh(buildExerciseFingerprint(profile, weakSpotsSummary))) {
    return null;
  }
  const generated = (entry as CacheEntry).generated;
  entry = null;
  return generated;
}

export function clearExerciseCache(): void {
  entry = null;
}

export function prefetchNextExercise(
  profile: Profile,
  weakSpotsSummary = '',
): Promise<void> {
  const fingerprint = buildExerciseFingerprint(profile, weakSpotsSummary);
  if (isFresh(fingerprint)) {
    return Promise.resolve();
  }
  if (inFlight) {
    return inFlight;
  }
  const type: ExerciseType = nextExerciseType();
  inFlight = enqueueGeneration(async () => {
    try {
      const generated = await generateExercise(type, profile, weakSpotsSummary);
      entry = { generated, fingerprint, createdAt: Date.now() };
      logDebug('ai', `prefetched exercise (${generated.type})`);
    } catch (error) {
      logDebug(
        'ai',
        `prefetch failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      inFlight = null;
    }
  });
  return inFlight;
}
