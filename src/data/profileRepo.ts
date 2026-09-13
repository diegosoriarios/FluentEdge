import { getDb } from './db';

export async function getProfileRow(): Promise<string | null> {
  const db = await getDb();
  const [result] = await db.executeSql('SELECT json FROM profile WHERE id = 1');
  return result.rows.length > 0
    ? ((result.rows.item(0) as { json: string }).json)
    : null;
}

export async function saveProfileRow(json: string): Promise<void> {
  const db = await getDb();
  await db.executeSql(
    'INSERT OR REPLACE INTO profile (id, json) VALUES (1, ?)',
    [json],
  );
}

export async function clearProfileRow(): Promise<void> {
  const db = await getDb();
  await db.executeSql('DELETE FROM profile WHERE id = 1');
}
