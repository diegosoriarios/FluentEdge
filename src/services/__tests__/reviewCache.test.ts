import { generateClozeReviewQuestion } from '../../ai/tutor';
import {
  buildReviewFingerprint,
  clearReviewCache,
  prefetchReviewQuestion,
  reviewCacheKey,
  takeCachedReviewQuestion,
} from '../reviewCache';
import type { Profile } from '../../navigation/types';

jest.mock('../../ai/tutor', () => ({
  generateClozeReviewQuestion: jest.fn(),
}));

const PROFILE: Profile = {
  level: 'B1',
  goal: 'business',
  nativeLanguage: null,
  focusAreas: ['grammar'],
  completedAt: null,
};

const MISTAKE = {
  id: 'm1',
  errorType: 'Articles',
  originalPhrase: 'a engineer',
  correctedPhrase: 'an engineer',
  explanation: 'an before vowel sound',
};

const EXERCISE = {
  question: 'She is ___ engineer.',
  options: ['a', 'an', 'the'],
  answerIndex: 1,
  explanation: 'Use "an" before vowel sounds.',
};

const generateMock = generateClozeReviewQuestion as jest.Mock;

beforeEach(() => {
  clearReviewCache();
  generateMock.mockReset();
  generateMock.mockResolvedValue(EXERCISE);
});

describe('buildReviewFingerprint', () => {
  it('varies by level, languages, and model variant', () => {
    expect(buildReviewFingerprint(PROFILE)).toBe('B1|en|en|full');
    expect(buildReviewFingerprint({ ...PROFILE, modelVariant: 'small' })).toBe(
      'B1|en|en|small',
    );
  });
});

describe('reviewCacheKey', () => {
  it('combines mistake id and fingerprint', () => {
    expect(reviewCacheKey('m9', 'B1|en')).toBe('m9|B1|en');
  });
});

describe('prefetchReviewQuestion', () => {
  it('stores the generated exercise for a single take', async () => {
    await prefetchReviewQuestion(MISTAKE, PROFILE);
    expect(takeCachedReviewQuestion('m1', PROFILE)).toEqual(EXERCISE);
    expect(takeCachedReviewQuestion('m1', PROFILE)).toBeNull();
  });

  it('collapses concurrent prefetches into one generation', async () => {
    await Promise.all([
      prefetchReviewQuestion(MISTAKE, PROFILE),
      prefetchReviewQuestion(MISTAKE, PROFILE),
    ]);
    expect(generateMock).toHaveBeenCalledTimes(1);
  });

  it('skips generation when a fresh entry already exists', async () => {
    await prefetchReviewQuestion(MISTAKE, PROFILE);
    await prefetchReviewQuestion(MISTAKE, PROFILE);
    expect(generateMock).toHaveBeenCalledTimes(1);
  });

  it('misses when the profile fingerprint changes', async () => {
    await prefetchReviewQuestion(MISTAKE, PROFILE);
    expect(
      takeCachedReviewQuestion('m1', { ...PROFILE, modelVariant: 'small' }),
    ).toBeNull();
  });

  it('misses once the entry expires', async () => {
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1_000);
    await prefetchReviewQuestion(MISTAKE, PROFILE);
    nowSpy.mockReturnValue(1_000 + 12 * 60 * 60 * 1000 + 1);
    expect(takeCachedReviewQuestion('m1', PROFILE)).toBeNull();
    nowSpy.mockRestore();
  });

  it('resolves null on failure and allows a retry', async () => {
    generateMock.mockRejectedValueOnce(new Error('model busy'));
    await expect(prefetchReviewQuestion(MISTAKE, PROFILE)).resolves.toBeNull();
    await expect(prefetchReviewQuestion(MISTAKE, PROFILE)).resolves.toEqual(
      EXERCISE,
    );
  });
});
