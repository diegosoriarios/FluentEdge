import { getDb } from './db';
import type { Correction } from '../navigation/types';
import { createId } from '../utils/id';

const DAY_MS = 86_400_000;

export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30, 60];

export type MistakeRecord = {
  id: string;
  errorType: string;
  originalPhrase: string;
  correctedPhrase: string;
  explanation: string;
  quickTip: string;
  timesSeen: number;
  firstSeenAt: number;
  lastSeenAt: number;
  intervalIndex: number;
  lapses: number;
  dueAt: number;
};

type MistakeRow = {
  id: string;
  dedupe_key: string;
  error_type: string;
  original_phrase: string;
  corrected_phrase: string;
  explanation: string;
  quick_tip: string;
  times_seen: number;
  first_seen_at: number;
  last_seen_at: number;
  interval_index: number;
  lapses: number;
  due_at: number;
};

function rowToMistake(row: MistakeRow): MistakeRecord {
  return {
    id: row.id,
    errorType: row.error_type,
    originalPhrase: row.original_phrase,
    correctedPhrase: row.corrected_phrase,
    explanation: row.explanation,
    quickTip: row.quick_tip,
    timesSeen: row.times_seen,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    intervalIndex: row.interval_index,
    lapses: row.lapses,
    dueAt: row.due_at,
  };
}

export function buildDedupeKey(
  originalPhrase: string,
  correctedPhrase: string,
): string {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/^[\s.,!?;:'"()\u2013\u2014]+|[\s.,!?;:'"()\u2013\u2014]+$/g, '')
      .trim();
  return `${normalize(originalPhrase)}::${normalize(correctedPhrase)}`;
}

export function nextReviewState(
  current: Pick<MistakeRecord, 'intervalIndex' | 'lapses'>,
  correct: boolean,
  now = Date.now(),
): Pick<MistakeRecord, 'intervalIndex' | 'lapses' | 'dueAt'> {
  const intervalIndex = correct
    ? Math.min(current.intervalIndex + 1, REVIEW_INTERVAL_DAYS.length - 1)
    : 0;
  const lapses = correct ? current.lapses : current.lapses + 1;
  const dueAt = now + REVIEW_INTERVAL_DAYS[intervalIndex] * DAY_MS;
  return { intervalIndex, lapses, dueAt };
}

export async function upsertFromCorrections(
  corrections: Correction[],
  now = Date.now(),
): Promise<void> {
  if (corrections.length === 0) {
    return;
  }
  const db = await getDb();
  for (const correction of corrections) {
    const original = correction.original_phrase.trim();
    const corrected = correction.corrected_phrase.trim();
    if (
      original.length === 0 ||
      corrected.length === 0 ||
      buildDedupeKey(original, corrected) ===
        buildDedupeKey(corrected, corrected)
    ) {
      continue;
    }
    const key = buildDedupeKey(original, corrected);
    const [result] = await db.executeSql(
      'SELECT * FROM mistakes WHERE dedupe_key = ?',
      [key],
    );
    if (result.rows.length > 0) {
      const row = result.rows.item(0) as MistakeRow;
      await db.executeSql(
        'UPDATE mistakes SET times_seen = times_seen + 1, last_seen_at = ?, due_at = ? WHERE id = ?',
        [now, now + REVIEW_INTERVAL_DAYS[0] * DAY_MS, row.id],
      );
    } else {
      await db.executeSql(
        'INSERT INTO mistakes (id, dedupe_key, error_type, original_phrase, corrected_phrase, explanation, quick_tip, times_seen, first_seen_at, last_seen_at, interval_index, lapses, due_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0, 0, ?)',
        [
          createId('m_'),
          key,
          correction.error_type,
          original,
          corrected,
          correction.explanation,
          correction.quick_tip,
          now,
          now,
          now + REVIEW_INTERVAL_DAYS[0] * DAY_MS,
        ],
      );
    }
  }
}

export async function getMistake(id: string): Promise<MistakeRecord | null> {
  const db = await getDb();
  const [result] = await db.executeSql('SELECT * FROM mistakes WHERE id = ?', [
    id,
  ]);
  return result.rows.length > 0
    ? rowToMistake(result.rows.item(0) as MistakeRow)
    : null;
}

export async function listDueMistakes(
  limit: number,
  now = Date.now(),
): Promise<MistakeRecord[]> {
  const db = await getDb();
  const [result] = await db.executeSql(
    'SELECT * FROM mistakes WHERE due_at <= ? ORDER BY due_at ASC, times_seen DESC, lapses DESC LIMIT ?',
    [now, limit],
  );
  const mistakes: MistakeRecord[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    mistakes.push(rowToMistake(result.rows.item(i) as MistakeRow));
  }
  return mistakes;
}

export async function countDueMistakes(now = Date.now()): Promise<number> {
  const db = await getDb();
  const [result] = await db.executeSql(
    'SELECT COUNT(*) AS count FROM mistakes WHERE due_at <= ?',
    [now],
  );
  return result.rows.item(0)?.count ?? 0;
}

export async function recordReviewOutcome(
  id: string,
  correct: boolean,
  now = Date.now(),
): Promise<void> {
  const mistake = await getMistake(id);
  if (!mistake) {
    return;
  }
  const next = nextReviewState(mistake, correct, now);
  const db = await getDb();
  await db.executeSql(
    'UPDATE mistakes SET interval_index = ?, lapses = ?, due_at = ? WHERE id = ?',
    [next.intervalIndex, next.lapses, next.dueAt, id],
  );
}
