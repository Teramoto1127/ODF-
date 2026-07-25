// server/src/db.js
import Database from 'better-sqlite3';

export const db = new Database('fuka-log.sqlite3');
db.pragma('journal_mode = WAL');

// 初回起動時にテーブルが無ければ作成する。
// マイグレーションツールは使わず、素朴な IF NOT EXISTS 方式にしている
// （個人開発規模なので、まずはこれで十分。将来スキーマ変更が増えたら
// drizzle 等の導入を検討する）。
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    muscle_group TEXT NOT NULL,
    is_custom INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL,
    date TEXT NOT NULL,
    sets_json TEXT NOT NULL,
    note TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_exercises_user ON exercises(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`);