import {
  clearSqlResponses,
  mockSqlResponse,
  sqlCalls,
} from '../../test/sqlMock';
import {
  computeStreakDays,
  getRecentErrorTypeLists,
  getSessionStats,
  listSessions,
  updateSessionPrompt,
} from '../index';

beforeEach(() => {
  clearSqlResponses();
});

describe('sessionsRepo', () => {
  it('detects hasMore via limit+1 fetch', async () => {
    const rows = Array.from({ length: 31 }, (_, i) => ({
      id: `s${i}`,
      created_at: i,
      prompt: 'p',
      response: 'r',
      evaluation_json: null,
    }));
    mockSqlResponse('ORDER BY created_at DESC LIMIT', rows);
    const page = await listSessions(30, 0);
    expect(page.sessions).toHaveLength(30);
    expect(page.hasMore).toBe(true);
    const call = sqlCalls().find(([sql]) => sql.includes('LIMIT ? OFFSET ?'));
    expect(call?.[1]).toEqual([31, 0]);
  });

  it('reports hasMore false on a short page', async () => {
    mockSqlResponse('ORDER BY created_at DESC LIMIT', [
      { id: 'a', created_at: 1, prompt: 'p', response: 'r', evaluation_json: null },
    ]);
    const page = await listSessions(30, 0);
    expect(page.sessions).toHaveLength(1);
    expect(page.hasMore).toBe(false);
  });

  it('parses recent error type lists newest first', async () => {
    mockSqlResponse('evaluation_json FROM sessions', [
      {
        evaluation_json: JSON.stringify({
          corrections: [{ error_type: 'Verb Tense' }, { error_type: 'Articles' }],
        }),
      },
      {
        evaluation_json: JSON.stringify({
          corrections: [{ error_type: 'verb tense' }],
        }),
      },
    ]);
    const lists = await getRecentErrorTypeLists(20);
    expect(lists).toEqual([['Verb Tense', 'Articles'], ['verb tense']]);
  });

  it('updates session prompts with the right params', async () => {
    await updateSessionPrompt('s1', 'new prompt');
    const call = sqlCalls().find(([sql]) => sql.includes('SET prompt = ?'));
    expect(call?.[1]).toEqual(['new prompt', 's1']);
  });

  it('aggregates stats and computes streak from distinct days', async () => {
    const dayKey = (timestamp: number) => {
      const date = new Date(timestamp);
      const month = `${date.getMonth() + 1}`.padStart(2, '0');
      const day = `${date.getDate()}`.padStart(2, '0');
      return `${date.getFullYear()}-${month}-${day}`;
    };
    const today = Date.now();
    mockSqlResponse('COUNT(*) AS total', [{ total: 5, last_at: 123 }]);
    mockSqlResponse('strftime', [
      { day: dayKey(today - 86400000) },
      { day: dayKey(today) },
    ]);
    const stats = await getSessionStats();
    expect(stats.totalSessions).toBe(5);
    expect(stats.lastSessionAt).toBe(123);
    expect(stats.streakDays).toBe(2);
  });
});

describe('computeStreakDays', () => {
  it('starts from yesterday when today has no session', () => {
    const today = Date.now();
    const dayKey = (timestamp: number) => {
      const date = new Date(timestamp);
      const month = `${date.getMonth() + 1}`.padStart(2, '0');
      const day = `${date.getDate()}`.padStart(2, '0');
      return `${date.getFullYear()}-${month}-${day}`;
    };
    const streak = computeStreakDays(
      [dayKey(today - 86400000), dayKey(today - 2 * 86400000)],
      today,
    );
    expect(streak).toBe(2);
  });
});
