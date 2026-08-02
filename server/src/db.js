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
 * テーブル・カラムが無ければ作成する。起動時に一度だけまとめて実行する。
 */
export async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      reset_token TEXT,
      reset_token_expires TEXT,
      goal_weight REAL
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

  // 体重ログ: 1ユーザーにつき1日1件を想定するが、DB側では特に制約しない
  // (同日に複数回記録した場合はUI側で「最新のものを採用」等の判断をする)。
  await db.execute(`
    CREATE TABLE IF NOT EXISTS body_weight_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      weight REAL NOT NULL
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_exercises_user ON exercises(user_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_body_weight_user ON body_weight_logs(user_id)`,
  );

  // 既存DBに goal_weight カラムが無い場合の後方互換対応
  try {
    await db.execute(`ALTER TABLE users ADD COLUMN goal_weight REAL`);
  } catch {
    // 既にカラムが存在する場合はエラーになるが、無視して問題ない
  }
}