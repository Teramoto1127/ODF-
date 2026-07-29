import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  throw new Error(
    'TURSO_DATABASE_URL が設定されていません。server/.env を確認してください。',
  );
}

export const db = createClient({ url, authToken });

/**
 * テーブルが無ければ作成する。Turso(libSQL)はネットワーク越しの呼び出しのため、
 * 起動時に一度だけまとめて実行する。
 * 新規作成が前提のスキーマなので、以前のSQLite版にあった
 * ALTER TABLEマイグレーションは不要にしている。
 */
export async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      reset_token TEXT,
      reset_token_expires TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      muscle_group TEXT NOT NULL,
      is_custom INTEGER NOT NULL DEFAULT 0
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      exercise_id TEXT NOT NULL,
      date TEXT NOT NULL,
      sets_json TEXT NOT NULL,
      note TEXT,
      workout_id TEXT
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_exercises_user ON exercises(user_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`);
}