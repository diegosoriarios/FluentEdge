import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const MIGRATIONS: string[][] = [
  [
    'CREATE TABLE IF NOT EXISTS profile (id INTEGER PRIMARY KEY CHECK (id = 1), json TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, prompt TEXT NOT NULL, response TEXT NOT NULL, evaluation_json TEXT)',
    'CREATE TABLE IF NOT EXISTS daily_questions (id TEXT PRIMARY KEY, question TEXT NOT NULL, options_json TEXT NOT NULL, answer_index INTEGER NOT NULL, explanation TEXT NOT NULL, chosen_index INTEGER, answered_at INTEGER, viewed_at INTEGER)',
  ],
  [
    "ALTER TABLE sessions ADD COLUMN type TEXT NOT NULL DEFAULT 'paragraph'",
    'ALTER TABLE sessions ADD COLUMN exercise_json TEXT',
    'ALTER TABLE sessions ADD COLUMN chosen_index INTEGER',
  ],
  [
    `CREATE TABLE IF NOT EXISTS mistakes (
      id TEXT PRIMARY KEY,
      dedupe_key TEXT NOT NULL UNIQUE,
      error_type TEXT NOT NULL,
      original_phrase TEXT NOT NULL,
      corrected_phrase TEXT NOT NULL,
      explanation TEXT NOT NULL,
      quick_tip TEXT NOT NULL,
      times_seen INTEGER NOT NULL DEFAULT 1,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      interval_index INTEGER NOT NULL DEFAULT 0,
      lapses INTEGER NOT NULL DEFAULT 0,
      due_at INTEGER NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_mistakes_due ON mistakes (due_at)',
    'ALTER TABLE sessions ADD COLUMN mistake_id TEXT',
  ],
];

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDb();
  }
  return dbPromise;
}

async function openDb(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabase({
    name: 'fluentedge.db',
    location: 'default',
  });
  const [versionResult] = await db.executeSql('PRAGMA user_version');
  const currentVersion = Number(versionResult.rows.item(0)?.user_version ?? 0);
  for (let v = currentVersion; v < MIGRATIONS.length; v += 1) {
    for (const statement of MIGRATIONS[v]) {
      await db.executeSql(statement);
    }
  }
  if (currentVersion < MIGRATIONS.length) {
    await db.executeSql(`PRAGMA user_version = ${MIGRATIONS.length}`);
  }
  return db;
}
