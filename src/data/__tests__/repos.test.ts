import {
  clearSqlResponses,
  mockSqlResponse,
  sqlCalls,
} from '../../test/sqlMock';
import {
  computeStreakDays,
  deleteSession,
  getRecentErrorTypeLists,
  getSession,
  getSessionStats,
  insertSession,
  lastNDaysActivity,
  listSessions,
  setChosenIndex,
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

  it('deletes a session by id', async () => {
    await deleteSession('s1');
    const call = sqlCalls().find(([sql]) =>
      sql.startsWith('DELETE FROM sessions'),
    );
    expect(call?.[0]).toBe('DELETE FROM sessions WHERE id = ?');
    expect(call?.[1]).toEqual(['s1']);
  });

  it('inserts sessions with type and exercise payload', async () => {
    const exercise = {
      question: 'Pick the correct form.',
      options: ['I go', 'I went', 'I gone'],
      answerIndex: 1,
      explanation: 'Past simple for a finished action.',
    };
    await insertSession(
      's9',
      'Describe your routine.',
      'multiple_choice',
      exercise,
    );
    const call = sqlCalls().find(([sql]) => sql.startsWith('INSERT INTO sessions'));
    expect(call?.[1]).toEqual([
      's9',
      expect.any(Number),
      'Describe your routine.',
      '',
      'multiple_choice',
      JSON.stringify(exercise),
    ]);
  });

  it('defaults insertSession to paragraph type', async () => {
    await insertSession('s10', 'Write about your day.');
    const call = sqlCalls().find(([sql]) => sql.startsWith('INSERT INTO sessions'));
    expect(call?.[1]).toEqual([
      's10',
      expect.any(Number),
      'Write about your day.',
      '',
      'paragraph',
      null,
    ]);
  });

  it('maps type, exercise, and chosenIndex when reading sessions', async () => {
    mockSqlResponse('SELECT * FROM sessions WHERE id = ?', [
      {
        id: 's9',
        created_at: 123,
        prompt: 'q',
        response: 'a',
        evaluation_json: null,
        type: 'multiple_choice',
        exercise_json: JSON.stringify({
          question: 'q',
          options: ['a', 'b', 'c'],
          answerIndex: 2,
          explanation: 'e',
        }),
        chosen_index: 1,
      },
    ]);
    const session = await getSession('s9');
    expect(session?.type).toBe('multiple_choice');
    expect(session?.exercise?.answerIndex).toBe(2);
    expect(session?.chosenIndex).toBe(1);
  });

  it('defaults legacy rows to paragraph type', async () => {
    mockSqlResponse('SELECT * FROM sessions WHERE id = ?', [
      { id: 's1', created_at: 1, prompt: 'p', response: 'r', evaluation_json: null },
    ]);
    const session = await getSession('s1');
    expect(session?.type).toBe('paragraph');
    expect(session?.exercise).toBeNull();
    expect(session?.chosenIndex).toBeNull();
  });

  it('sets chosen index on a session', async () => {
    await setChosenIndex('s9', 2);
    const call = sqlCalls().find(([sql]) =>
      sql.includes('SET chosen_index = ?'),
    );
    expect(call?.[1]).toEqual([2, 's9']);
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
    expect(stats.practiceDays).toEqual([
      dayKey(today - 86400000),
      dayKey(today),
    ]);
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

describe('lastNDaysActivity', () => {
  const today = Date.now();
  const dayKey = (timestamp: number) => {
    const date = new Date(timestamp);
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  };

  it('marks today as active when practiced today', () => {
    const activity = lastNDaysActivity([dayKey(today)], 7, today);
    expect(activity).toHaveLength(7);
    expect(activity[6]).toBe(true);
    expect(activity.slice(0, 6)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('keeps past days active and today inactive when today has no session', () => {
    const activity = lastNDaysActivity(
      [dayKey(today - 86400000), dayKey(today - 2 * 86400000)],
      7,
      today,
    );
    expect(activity[4]).toBe(true);
    expect(activity[5]).toBe(true);
    expect(activity[6]).toBe(false);
  });

  it('orders results oldest to newest', () => {
    const activity = lastNDaysActivity([dayKey(today)], 3, today);
    expect(activity).toEqual([false, false, true]);
  });

  it('ignores practice days older than the window', () => {
    const activity = lastNDaysActivity([dayKey(today - 30 * 86400000)], 7, today);
    expect(activity).toEqual([false, false, false, false, false, false, false]);
  });

  it('returns an empty array for a zero-day window', () => {
    expect(lastNDaysActivity([dayKey(today)], 0, today)).toEqual([]);
  });
});
