import Database from 'better-sqlite3';

export const db = new Database('fuka-log.sqlite3');
db.pragma('journal_mode = WAL');

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

// マイグレーション: 既存のDBファイルに workout_id 列が無ければ追加する。
// 「1回のワークアウトで複数種目を記録する」機能のために、
// 同じワークアウトに属するセッションをグルーピングするためのID。
const sessionColumns = db.prepare(`PRAGMA table_info(sessions)`).all();
const hasWorkoutId = sessionColumns.some((c) => c.name === 'workout_id');
if (!hasWorkoutId) {
  db.exec(`ALTER TABLE sessions ADD COLUMN workout_id TEXT`);
}