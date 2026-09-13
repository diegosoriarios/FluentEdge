import type { SessionSummary } from '../../navigation/types';
import {
  ADAPTIVE_CONFIG,
  errorRatePer100Words,
  nextLevel,
  normalizeErrorType,
  summarizeWeakSpots,
} from '../adaptive';

function makeSession(
  createdAt: number,
  corrections: string[],
  words: number,
): SessionSummary {
  return {
    id: `s_${createdAt}`,
    createdAt,
    prompt: 'Write about your day.',
    response: 'word '.repeat(words).trim(),
    evaluation: {
      has_errors: corrections.length > 0,
      corrections: corrections.map(error_type => ({
        original_phrase: 'x',
        corrected_phrase: 'y',
        error_type,
        explanation: 'e',
        quick_tip: 't',
      })),
      improved_paragraph: '',
      strengths: '',
    },
  };
}

const HOUR_MS = 3600000;

describe('normalizeErrorType', () => {
  it('canonicalizes casing, spacing, and punctuation', () => {
    expect(normalizeErrorType('Subject-Verb Agreement')).toBe(
      'subject_verb_agreement',
    );
    expect(normalizeErrorType('  Articles ')).toBe('articles');
    expect(normalizeErrorType('Verb Tense!')).toBe('verb_tense');
  });

  it('returns empty string for punctuation-only tags', () => {
    expect(normalizeErrorType('  --  ')).toBe('');
  });
});

describe('summarizeWeakSpots', () => {
  it('merges casing variants into one canonical tag', () => {
    const sessions = [
      makeSession(3 * HOUR_MS, ['Verb Tense'], 50),
      makeSession(2 * HOUR_MS, ['verb tense'], 50),
    ];
    expect(summarizeWeakSpots(sessions)).toBe('verb_tense:2');
  });

  it('weights recent sessions higher than old ones', () => {
    const sessions = [
      makeSession(3 * HOUR_MS, ['articles'], 50),
      makeSession(1, Array(10).fill('prepositions'), 50),
    ];
    expect(summarizeWeakSpots(sessions)).toBe('prepositions:8, articles:1');
  });

  it('limits output to the top three tags', () => {
    const sessions = [
      makeSession(5 * HOUR_MS, ['a', 'b', 'c', 'd'], 100),
    ];
    const summary = summarizeWeakSpots(sessions);
    expect(summary.split(', ')).toHaveLength(3);
    expect(summary).toBe('a:1, b:1, c:1');
  });

  it('skips unevaluated sessions', () => {
    const unevaluated: SessionSummary = {
      ...makeSession(2 * HOUR_MS, ['articles'], 50),
      evaluation: null,
    };
    expect(summarizeWeakSpots([unevaluated])).toBe('');
  });

  it('truncates to the character cap on a tag boundary', () => {
    const longTag = 'a'.repeat(80);
    const sessions = [
      makeSession(3 * HOUR_MS, [
        `${longTag}_one`,
        `${longTag}_two`,
        `${longTag}_three`,
        `${longTag}_four`,
      ], 100),
    ];
    const summary = summarizeWeakSpots(sessions);
    expect(summary.length).toBeLessThanOrEqual(ADAPTIVE_CONFIG.maxSummaryChars);
    expect(summary).not.toMatch(/,$/);
  });
});

describe('errorRatePer100Words', () => {
  it('normalizes corrections by response length', () => {
    expect(errorRatePer100Words(makeSession(1, ['a', 'b', 'c', 'd', 'e'], 200))).toBe(2.5);
    expect(errorRatePer100Words(makeSession(1, [], 100))).toBe(0);
  });

  it('returns zero for empty responses', () => {
    expect(errorRatePer100Words(makeSession(1, ['a'], 0))).toBe(0);
  });
});

describe('nextLevel', () => {
  it('does not adjust before the minimum session count', () => {
    const sessions = [1, 2, 3, 4].map((h, i) =>
      makeSession((4 - i) * HOUR_MS, [], 100),
    );
    expect(nextLevel('B1', sessions, null)).toEqual({
      level: 'B1',
      changed: false,
    });
  });

  it('promotes after a good streak', () => {
    const sessions = [1, 2, 3, 4, 5].map((h, i) =>
      makeSession((5 - i) * HOUR_MS, [], 150),
    );
    const result = nextLevel('B1', sessions, null);
    expect(result.changed).toBe(true);
    expect(result.direction).toBe('up');
    expect(result.level).toBe('B2');
  });

  it('demotes after a bad streak', () => {
    const sessions = [1, 2, 3, 4, 5].map((h, i) =>
      makeSession((5 - i) * HOUR_MS, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'], 100),
    );
    const result = nextLevel('B2', sessions, null);
    expect(result.changed).toBe(true);
    expect(result.direction).toBe('down');
    expect(result.level).toBe('B1');
  });

  it('does not adjust when the streak is broken', () => {
    const rates = [[], [], ['a', 'b', 'c', 'd'], [], []];
    const sessions = rates.map((corrections, i) =>
      makeSession((5 - i) * HOUR_MS, corrections, 100),
    );
    expect(nextLevel('B1', sessions, null).changed).toBe(false);
  });

  it('respects the cooldown after an adjustment', () => {
    const lastAdjustAt = 2 * HOUR_MS;
    const sessions = [1, 2, 3, 4, 5, 6].map((h, i) =>
      makeSession((6 - i) * HOUR_MS, [], 150),
    );
    const since = sessions.filter(s => s.createdAt > lastAdjustAt).length;
    expect(since).toBeLessThan(ADAPTIVE_CONFIG.cooldownSessions);
    expect(nextLevel('B1', sessions, lastAdjustAt).changed).toBe(false);
  });

  it('blocks promotion at the C1 ceiling', () => {
    const sessions = [1, 2, 3, 4, 5].map((h, i) =>
      makeSession((5 - i) * HOUR_MS, [], 150),
    );
    expect(nextLevel('C1', sessions, null).changed).toBe(false);
  });

  it('blocks demotion at the B1 floor', () => {
    const sessions = [1, 2, 3, 4, 5].map((h, i) =>
      makeSession((5 - i) * HOUR_MS, ['a', 'b', 'c', 'd', 'e', 'f'], 100),
    );
    expect(nextLevel('B1', sessions, null).changed).toBe(false);
  });

  it('skips unevaluated sessions entirely', () => {
    const sessions = [1, 2, 3, 4, 5, 6].map((h, i) => ({
      ...makeSession((6 - i) * HOUR_MS, [], 150),
      evaluation: null,
    }));
    expect(nextLevel('B1', sessions, null).changed).toBe(false);
  });
});
