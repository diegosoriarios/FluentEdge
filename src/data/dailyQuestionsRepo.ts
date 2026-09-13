import { getDb } from './db';
import { DAILY_QUESTIONS } from './questions';
import type { DailyQuestionRecord } from './questions';

type DailyQuestionRow = {
  id: string;
  question: string;
  options_json: string;
  answer_index: number;
  explanation: string;
  chosen_index: number | null;
  answered_at: number | null;
  viewed_at: number | null;
};

function rowToDailyQuestion(row: DailyQuestionRow): DailyQuestionRecord {
  return {
    id: row.id,
    question: row.question,
    options: JSON.parse(row.options_json) as string[],
    answerIndex: row.answer_index,
    explanation: row.explanation,
    chosenIndex: row.chosen_index,
    answeredAt: row.answered_at,
    viewedAt: row.viewed_at,
  };
}

export async function ensureQuestionsSeeded(): Promise<void> {
  const db = await getDb();
  for (const question of DAILY_QUESTIONS) {
    await db.executeSql(
      'INSERT OR IGNORE INTO daily_questions (id, question, options_json, answer_index, explanation) VALUES (?, ?, ?, ?, ?)',
      [
        question.id,
        question.question,
        JSON.stringify(question.options),
        question.answerIndex,
        question.explanation,
      ],
    );
  }
}

export async function getDailyQuestion(
  id: string,
): Promise<DailyQuestionRecord | null> {
  const db = await getDb();
  const [result] = await db.executeSql(
    'SELECT * FROM daily_questions WHERE id = ?',
    [id],
  );
  return result.rows.length > 0
    ? rowToDailyQuestion(result.rows.item(0) as DailyQuestionRow)
    : null;
}

export async function getUnansweredDailyQuestion(): Promise<DailyQuestionRecord | null> {
  const db = await getDb();
  const [result] = await db.executeSql(
    'SELECT * FROM daily_questions ORDER BY COALESCE(answered_at, 0) ASC, rowid ASC LIMIT 1',
  );
  return result.rows.length > 0
    ? rowToDailyQuestion(result.rows.item(0) as DailyQuestionRow)
    : null;
}

export async function recordDailyAnswer(
  id: string,
  chosenIndex: number,
): Promise<void> {
  const db = await getDb();
  await db.executeSql(
    'UPDATE daily_questions SET chosen_index = ?, answered_at = ?, viewed_at = NULL WHERE id = ?',
    [chosenIndex, Date.now(), id],
  );
}

export async function getAnsweredUnviewedDailyQuestion(): Promise<DailyQuestionRecord | null> {
  const db = await getDb();
  const [result] = await db.executeSql(
    'SELECT * FROM daily_questions WHERE chosen_index IS NOT NULL AND viewed_at IS NULL ORDER BY answered_at DESC LIMIT 1',
  );
  return result.rows.length > 0
    ? rowToDailyQuestion(result.rows.item(0) as DailyQuestionRow)
    : null;
}

export async function markDailyQuestionViewed(id: string): Promise<void> {
  const db = await getDb();
  await db.executeSql('UPDATE daily_questions SET viewed_at = ? WHERE id = ?', [
    Date.now(),
    id,
  ]);
}
