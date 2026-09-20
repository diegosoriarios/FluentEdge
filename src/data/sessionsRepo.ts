import { getDb } from './db';
import type {
  Evaluation,
  ExerciseType,
  MultipleChoiceExercise,
  SessionSummary,
} from '../navigation/types';

type SessionRow = {
  id: string;
  created_at: number;
  prompt: string;
  response: string;
  evaluation_json: string | null;
  type?: string | null;
  exercise_json?: string | null;
  chosen_index?: number | null;
};

function parseExercise(json: string | null): MultipleChoiceExercise | null {
  if (!json) {
    return null;
  }
  try {
    return JSON.parse(json) as MultipleChoiceExercise;
  } catch {
    return null;
  }
}

function rowToSession(row: SessionRow): SessionSummary {
  return {
    id: row.id,
    createdAt: row.created_at,
    prompt: row.prompt,
    response: row.response,
    evaluation: row.evaluation_json
      ? (JSON.parse(row.evaluation_json) as Evaluation)
      : null,
    type: (row.type ?? 'paragraph') as ExerciseType,
    exercise: parseExercise(row.exercise_json ?? null),
    chosenIndex: row.chosen_index ?? null,
  };
}

export async function insertSession(
  id: string,
  prompt: string,
  type: ExerciseType = 'paragraph',
  exercise: MultipleChoiceExercise | null = null,
): Promise<void> {
  const db = await getDb();
  await db.executeSql(
    'INSERT INTO sessions (id, created_at, prompt, response, evaluation_json, type, exercise_json, chosen_index) VALUES (?, ?, ?, ?, NULL, ?, ?, NULL)',
    [id, Date.now(), prompt, '', type, exercise ? JSON.stringify(exercise) : null],
  );
}

export async function setChosenIndex(
  id: string,
  index: number,
): Promise<void> {
  const db = await getDb();
  await db.executeSql('UPDATE sessions SET chosen_index = ? WHERE id = ?', [
    index,
    id,
  ]);
}

export async function updateSessionResponse(
  id: string,
  response: string,
): Promise<void> {
  const db = await getDb();
  await db.executeSql('UPDATE sessions SET response = ? WHERE id = ?', [
    response,
    id,
  ]);
}

export async function updateSessionPrompt(
  id: string,
  prompt: string,
): Promise<void> {
  const db = await getDb();
  await db.executeSql('UPDATE sessions SET prompt = ? WHERE id = ?', [
    prompt,
    id,
  ]);
}

export async function updateSessionEvaluation(
  id: string,
  evaluation: Evaluation,
): Promise<void> {
  const db = await getDb();
  await db.executeSql('UPDATE sessions SET evaluation_json = ? WHERE id = ?', [
    JSON.stringify(evaluation),
    id,
  ]);
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDb();
  await db.executeSql('DELETE FROM sessions WHERE id = ?', [id]);
}

export async function getSession(id: string): Promise<SessionSummary | null> {
  const db = await getDb();
  const [result] = await db.executeSql(
    'SELECT * FROM sessions WHERE id = ?',
    [id],
  );
  return result.rows.length > 0
    ? rowToSession(result.rows.item(0) as SessionRow)
    : null;
}

export type SessionPage = {
  sessions: SessionSummary[];
  hasMore: boolean;
};

export async function listSessions(
  limit = 30,
  offset = 0,
): Promise<SessionPage> {
  const db = await getDb();
  const [result] = await db.executeSql(
    'SELECT * FROM sessions ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit + 1, offset],
  );
  const rows: SessionSummary[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    rows.push(rowToSession(result.rows.item(i) as SessionRow));
  }
  const hasMore = rows.length > limit;
  return { sessions: rows.slice(0, limit), hasMore };
}

export async function getRecentErrorTypeLists(
  limit = 20,
): Promise<string[][]> {
  const db = await getDb();
  const [result] = await db.executeSql(
    'SELECT evaluation_json FROM sessions WHERE evaluation_json IS NOT NULL ORDER BY created_at DESC LIMIT ?',
    [limit],
  );
  const lists: string[][] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    const row = result.rows.item(i) as { evaluation_json: string };
    const evaluation = JSON.parse(row.evaluation_json) as Evaluation;
    lists.push(evaluation.corrections.map(item => item.error_type));
  }
  return lists;
}

export async function getRecentSessions(
  limit = 12,
): Promise<SessionSummary[]> {
  const db = await getDb();
  const [result] = await db.executeSql(
    'SELECT id, created_at, response, evaluation_json, type, exercise_json, chosen_index FROM sessions ORDER BY created_at DESC LIMIT ?',
    [limit],
  );
  const rows: SessionSummary[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    const row = result.rows.item(i) as Omit<SessionRow, 'prompt'>;
    rows.push({
      id: row.id,
      createdAt: row.created_at,
      prompt: '',
      response: row.response,
      evaluation: row.evaluation_json
        ? (JSON.parse(row.evaluation_json) as Evaluation)
        : null,
      type: (row.type ?? 'paragraph') as ExerciseType,
      exercise: parseExercise(row.exercise_json ?? null),
      chosenIndex: row.chosen_index ?? null,
    });
  }
  return rows;
}

export type SessionStatsData = {
  totalSessions: number;
  lastSessionAt: number | null;
  streakDays: number;
};

function localDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function computeStreakDays(
  days: string[],
  now = Date.now(),
): number {
  const unique = new Set(days);
  let streak = 0;
  const cursor = new Date(now);
  if (!unique.has(localDayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (unique.has(localDayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function getSessionStats(): Promise<SessionStatsData> {
  const db = await getDb();
  const [totals] = await db.executeSql(
    'SELECT COUNT(*) AS total, MAX(created_at) AS last_at FROM sessions',
  );
  const [daysResult] = await db.executeSql(
    "SELECT DISTINCT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch', 'localtime') AS day FROM sessions ORDER BY day DESC",
  );
  const days: string[] = [];
  for (let i = 0; i < daysResult.rows.length; i += 1) {
    const day = (daysResult.rows.item(i) as { day: string }).day;
    if (day) {
      days.push(day);
    }
  }
  const row = totals.rows.item(0) as { total: number; last_at: number | null };
  return {
    totalSessions: Number(row?.total ?? 0),
    lastSessionAt: row?.last_at ?? null,
    streakDays: computeStreakDays(days),
  };
}
