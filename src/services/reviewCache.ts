import { generateClozeReviewQuestion } from '../ai/tutor';
import type { ClozeMistakeInput } from '../ai/tutor';
import type { MultipleChoiceExercise, Profile } from '../navigation/types';
import { logDebug } from './debugLog';

const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export type ReviewMistake = ClozeMistakeInput & { id: string };

type CacheEntry = {
  exercise: MultipleChoiceExercise;
  fingerprint: string;
  createdAt: number;
};

const entries = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<MultipleChoiceExercise | null>>();

export function buildReviewFingerprint(profile: Profile): string {
  return [
    profile.level,
    profile.targetLanguage ?? 'en',
    profile.explanationLanguage ?? profile.targetLanguage ?? 'en',
    profile.modelVariant ?? 'full',
  ].join('|');
}

export function reviewCacheKey(mistakeId: string, fingerprint: string): string {
  return `${mistakeId}|${fingerprint}`;
}

export function clearReviewCache(): void {
  entries.clear();
  inFlight.clear();
}

export async function prefetchReviewQuestion(
  mistake: ReviewMistake,
  profile: Profile,
): Promise<MultipleChoiceExercise | null> {
  const fingerprint = buildReviewFingerprint(profile);
  const key = reviewCacheKey(mistake.id, fingerprint);
  const existing = entries.get(key);
  if (existing && Date.now() - existing.createdAt <= MAX_AGE_MS) {
    return existing.exercise;
  }
  const pending = inFlight.get(key);
  if (pending) {
    return pending;
  }
  const task = (async () => {
    try {
      const exercise = await generateClozeReviewQuestion(mistake, profile);
      entries.set(key, { exercise, fingerprint, createdAt: Date.now() });
      logDebug('ai', `prefetched review question (${mistake.id})`);
      return exercise;
    } catch (error) {
      logDebug(
        'ai',
        `review prefetch failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    } finally {
      inFlight.delete(key);
    }
  })();
  inFlight.set(key, task);
  return task;
}

export function takeCachedReviewQuestion(
  mistakeId: string,
  profile: Profile,
): MultipleChoiceExercise | null {
  const key = reviewCacheKey(mistakeId, buildReviewFingerprint(profile));
  const entry = entries.get(key);
  if (!entry || Date.now() - entry.createdAt > MAX_AGE_MS) {
    entries.delete(key);
    return null;
  }
  entries.delete(key);
  return entry.exercise;
}
