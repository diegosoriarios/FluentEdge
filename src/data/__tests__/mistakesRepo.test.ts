import {
  clearSqlResponses,
  mockSqlResponse,
  sqlCalls,
} from '../../test/sqlMock';
import {
  buildDedupeKey,
  countDueMistakes,
  listDueMistakes,
  nextReviewState,
  recordReviewOutcome,
  upsertFromCorrections,
} from '../mistakesRepo';
import type { Correction } from '../../navigation/types';

const DAY_MS = 86_400_000;

beforeEach(() => {
  clearSqlResponses();
});

const correction: Correction = {
  original_phrase: 'He go to school.',
  corrected_phrase: 'He goes to school.',
  error_type: 'Verb Tense',
  explanation: 'Third person singular takes -s.',
  quick_tip: 'He/she/it + verb-s.',
};

describe('nextReviewState', () => {
  it('advances the interval ladder on correct answers', () => {
    const next = nextReviewState({ intervalIndex: 1, lapses: 0 }, true, 1000);
    expect(next.intervalIndex).toBe(2);
    expect(next.lapses).toBe(0);
    expect(next.dueAt).toBe(1000 + 7 * DAY_MS);
  });

  it('caps at the final ladder rung', () => {
    const next = nextReviewState({ intervalIndex: 5, lapses: 0 }, true, 1000);
    expect(next.intervalIndex).toBe(5);
    expect(next.dueAt).toBe(1000 + 60 * DAY_MS);
  });

  it('resets to the first rung and counts a lapse on misses', () => {
    const next = nextReviewState({ intervalIndex: 3, lapses: 2 }, false, 1000);
    expect(next.intervalIndex).toBe(0);
    expect(next.lapses).toBe(3);
    expect(next.dueAt).toBe(1000 + DAY_MS);
  });
});

describe('buildDedupeKey', () => {
  it('normalizes case, whitespace, and punctuation', () => {
    expect(buildDedupeKey('He go.', 'he  goes')).toBe(
      buildDedupeKey(' he GO ', 'He goes...'),
    );
    expect(buildDedupeKey('He go', 'He goes')).toBe('he go::he goes');
  });
});

describe('upsertFromCorrections', () => {
  it('inserts new mistakes due tomorrow', async () => {
    mockSqlResponse('SELECT * FROM mistakes WHERE dedupe_key', []);
    await upsertFromCorrections([correction], 5000);
    const insert = sqlCalls().find(([sql]) =>
      sql.startsWith('INSERT INTO mistakes'),
    );
    expect(insert?.[1]).toEqual([
      expect.stringMatching(/^m_/),
      'he go to school::he goes to school',
      'Verb Tense',
      'He go to school.',
      'He goes to school.',
      'Third person singular takes -s.',
      'He/she/it + verb-s.',
      5000,
      5000,
      5000 + DAY_MS,
    ]);
  });

  it('bumps times_seen and reschedules when the mistake already exists', async () => {
    mockSqlResponse('SELECT * FROM mistakes WHERE dedupe_key', [
      { id: 'm_existing' },
    ]);
    await upsertFromCorrections([correction], 5000);
    const update = sqlCalls().find(([sql]) =>
      sql.startsWith('UPDATE mistakes SET times_seen'),
    );
    expect(update?.[1]).toEqual([5000, 5000 + DAY_MS, 'm_existing']);
    expect(
      sqlCalls().some(([sql]) => sql.startsWith('INSERT INTO mistakes')),
    ).toBe(false);
  });

  it('skips corrections that are identical to their fix', async () => {
    await upsertFromCorrections(
      [
        {
          ...correction,
          original_phrase: 'same text',
          corrected_phrase: 'Same text.',
        },
      ],
      1,
    );
    expect(
      sqlCalls().some(([sql]) =>
        sql.startsWith('SELECT * FROM mistakes WHERE dedupe_key'),
      ),
    ).toBe(false);
  });
});

describe('due mistakes', () => {
  it('lists due mistakes with now and limit params', async () => {
    mockSqlResponse('WHERE due_at <= ?', [
      {
        id: 'm1',
        dedupe_key: 'k',
        error_type: 'Articles',
        original_phrase: 'a',
        corrected_phrase: 'b',
        explanation: 'e',
        quick_tip: 't',
        times_seen: 2,
        first_seen_at: 1,
        last_seen_at: 1,
        interval_index: 1,
        lapses: 0,
        due_at: 999,
      },
    ]);
    const mistakes = await listDueMistakes(5, 1000);
    expect(mistakes).toHaveLength(1);
    expect(mistakes[0]).toMatchObject({ id: 'm1', intervalIndex: 1 });
    const call = sqlCalls().find(([sql]) => sql.includes('WHERE due_at <= ?'));
    expect(call?.[1]).toEqual([1000, 5]);
  });

  it('counts due mistakes', async () => {
    mockSqlResponse('COUNT(*) AS count FROM mistakes', [{ count: 3 }]);
    expect(await countDueMistakes(1000)).toBe(3);
  });
});

describe('recordReviewOutcome', () => {
  it('applies the next review state after a correct answer', async () => {
    mockSqlResponse('SELECT * FROM mistakes WHERE id = ?', [
      {
        id: 'm1',
        dedupe_key: 'k',
        error_type: 'Articles',
        original_phrase: 'a',
        corrected_phrase: 'b',
        explanation: 'e',
        quick_tip: 't',
        times_seen: 1,
        first_seen_at: 1,
        last_seen_at: 1,
        interval_index: 0,
        lapses: 0,
        due_at: 1,
      },
    ]);
    await recordReviewOutcome('m1', true, 1000);
    const update = sqlCalls().find(([sql]) =>
      sql.startsWith('UPDATE mistakes SET interval_index'),
    );
    expect(update?.[1]).toEqual([1, 0, 1000 + 3 * DAY_MS, 'm1']);
  });

  it('does nothing when the mistake is missing', async () => {
    mockSqlResponse('SELECT * FROM mistakes WHERE id = ?', []);
    await recordReviewOutcome('m_missing', true);
    expect(
      sqlCalls().some(([sql]) =>
        sql.startsWith('UPDATE mistakes SET interval_index'),
      ),
    ).toBe(false);
  });
});
