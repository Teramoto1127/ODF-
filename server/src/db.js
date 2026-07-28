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

/**
 * 素朴なマイグレーション: 指定テーブルに指定カラムが無ければ ALTER TABLE で追加する。
 * 個人開発規模のため、専用マイグレーションツールは導入せずこの方式で済ませている。
 */
function addColumnIfMissing(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = columns.some((c) => c.name === column);
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

addColumnIfMissing('sessions', 'workout_id', 'TEXT');
addColumnIfMissing('users', 'reset_token', 'TEXT');
addColumnIfMissing('users', 'reset_token_expires', 'TEXT');