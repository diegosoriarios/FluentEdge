import { getDb } from './db';
import { DAILY_QUESTIONS } from './questions';
import type { DailyQuestion, DailyQuestionRecord } from './questions';
import { createId } from '../utils/id';

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

export async function getUnansweredDailyQuestions(
  limit: number,
): Promise<DailyQuestionRecord[]> {
  const db = await getDb();
  const [result] = await db.executeSql(
    'SELECT * FROM daily_questions WHERE answered_at IS NULL ORDER BY RANDOM() LIMIT ?',
    [limit],
  );
  const rows: DailyQuestionRecord[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    rows.push(rowToDailyQuestion(result.rows.item(i) as DailyQuestionRow));
  }
  return rows;
}

export async function getDailyQuestionWindow(
  limit: number,
): Promise<DailyQuestionRecord[]> {
  const db = await getDb();
  const [result] = await db.executeSql(
    'SELECT * FROM daily_questions ORDER BY COALESCE(answered_at, 0) ASC, rowid ASC LIMIT ?',
    [limit],
  );
  const questions: DailyQuestionRecord[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    questions.push(rowToDailyQuestion(result.rows.item(i) as DailyQuestionRow));
  }
  return questions;
}

export async function countUnansweredDailyQuestions(): Promise<number> {
  const db = await getDb();
  const [result] = await db.executeSql(
    'SELECT COUNT(*) AS count FROM daily_questions WHERE answered_at IS NULL',
  );
  return result.rows.item(0)?.count ?? 0;
}

export async function getAnsweredDailyQuestions(
  limit: number,
): Promise<DailyQuestionRecord[]> {
  const db = await getDb();
  const [result] = await db.executeSql(
    'SELECT * FROM daily_questions WHERE answered_at IS NOT NULL ORDER BY RANDOM() LIMIT ?',
    [limit],
  );
  const rows: DailyQuestionRecord[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    rows.push(rowToDailyQuestion(result.rows.item(i) as DailyQuestionRow));
  }
  return rows;
}

export async function hasDailyQuestionText(question: string): Promise<boolean> {
  const db = await getDb();
  const [result] = await db.executeSql(
    'SELECT id FROM daily_questions WHERE question = ? LIMIT 1',
    [question],
  );
  return result.rows.length > 0;
}

export async function insertGeneratedDailyQuestion(
  question: Omit<DailyQuestion, 'id'>,
): Promise<boolean> {
  if (await hasDailyQuestionText(question.question)) {
    return false;
  }
  const db = await getDb();
  const [result] = await db.executeSql(
    'INSERT INTO daily_questions (id, question, options_json, answer_index, explanation) VALUES (?, ?, ?, ?, ?)',
    [
      createId('q_gen_'),
      question.question,
      JSON.stringify(question.options),
      question.answerIndex,
      question.explanation,
    ],
  );
  return result.rowsAffected > 0;
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
