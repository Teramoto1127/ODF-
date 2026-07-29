import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import { db, initDb } from './db.js';
import {
  hashPassword,
  verifyPassword,
  signToken,
  requireAuth,
  generateResetToken,
} from './auth.js';
import { sendPasswordResetEmail } from './mail.js';

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const APP_URL = process.env.APP_URL || CLIENT_ORIGIN;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));

// 本番はフロントとバックエンドが別ドメイン(Vercel/Render)になるため、
// クロスサイトCookieを許可する sameSite:'none' + secure:true が必須。
// ローカル開発(http)ではsecure:trueだとCookieが送られないため'lax'にする。
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'リクエストが多すぎます。しばらく待ってから再度お試しください。' },
});

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

async function migrateUserData(userId, { exercises = [], sessions = [] }) {
  for (const ex of exercises) {
    if (!ex.isCustom) continue;
    await db.execute({
      sql: `INSERT OR IGNORE INTO exercises (id, user_id, name, muscle_group, is_custom) VALUES (?, ?, ?, ?, ?)`,
      args: [ex.id, userId, ex.name, ex.muscleGroup, 1],
    });
  }
  for (const s of sessions) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO sessions (id, user_id, exercise_id, date, sets_json, note, workout_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [s.id, userId, s.exerciseId, s.date, JSON.stringify(s.sets), s.note ?? null, s.workoutId ?? null],
    });
  }
}

// --- 認証 ---

app.post('/api/register', authLimiter, async (req, res) => {
  const { email, password, migrate } = req.body ?? {};

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'メールアドレスの形式が正しくありません。' });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'パスワードは8文字以上にしてください。' });
  }

  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [email],
  });
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'このメールアドレスは既に登録されています。' });
  }

  const userId = randomUUID();
  const passwordHash = await hashPassword(password);
  await db.execute({
    sql: 'INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
    args: [userId, email, passwordHash, new Date().toISOString()],
  });

  if (migrate && typeof migrate === 'object') {
    await migrateUserData(userId, migrate);
  }

  const token = signToken(userId);
  res.cookie('token', token, COOKIE_OPTS);
  res.status(201).json({ id: userId, email });
});

app.post('/api/login', authLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [email],
  });
  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: 'メールアドレスまたはパスワードが違います。' });
  }
  const valid = await verifyPassword(password ?? '', user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'メールアドレスまたはパスワードが違います。' });
  }
  const token = signToken(user.id);
  res.cookie('token', token, COOKIE_OPTS);
  res.json({ id: user.id, email: user.email });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token', COOKIE_OPTS);
  res.status(204).end();
});

app.get('/api/me', requireAuth, async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT id, email FROM users WHERE id = ?',
    args: [req.userId],
  });
  res.json(result.rows[0]);
});

// --- パスワードリセット ---

app.post('/api/password-reset/request', authLimiter, async (req, res) => {
  const { email } = req.body ?? {};
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'メールアドレスの形式が正しくありません。' });
  }

  const result = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [email],
  });
  const user = result.rows[0];

  if (user) {
    const token = generateResetToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await db.execute({
      sql: 'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      args: [token, expires, user.id],
    });
    const resetUrl = `${APP_URL}/?resetToken=${token}`;
    try {
      await sendPasswordResetEmail(email, resetUrl);
    } catch (err) {
      console.error('[password-reset] Failed to send email', err);
      return res.status(500).json({ error: 'メールの送信に失敗しました。時間を置いて再度お試しください。' });
    }
  }

  res.json({ ok: true });
});

app.post('/api/password-reset/confirm', authLimiter, async (req, res) => {
  const { token, newPassword } = req.body ?? {};
  if (typeof token !== 'string' || !token) {
    return res.status(400).json({ error: 'トークンが正しくありません。' });
  }
  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ error: 'パスワードは8文字以上にしてください。' });
  }

  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE reset_token = ?',
    args: [token],
  });
  const user = result.rows[0];
  if (!user || !user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
    return res.status(400).json({ error: 'リンクの有効期限が切れています。もう一度お試しください。' });
  }

  const passwordHash = await hashPassword(newPassword);
  await db.execute({
    sql: 'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
    args: [passwordHash, user.id],
  });

  res.json({ ok: true });
});

// --- アカウント設定 ---

app.patch('/api/account/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [req.userId],
  });
  const user = result.rows[0];

  const valid = await verifyPassword(currentPassword ?? '', user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: '現在のパスワードが正しくありません。' });
  }
  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ error: '新しいパスワードは8文字以上にしてください。' });
  }

  const passwordHash = await hashPassword(newPassword);
  await db.execute({
    sql: 'UPDATE users SET password_hash = ? WHERE id = ?',
    args: [passwordHash, req.userId],
  });
  res.json({ ok: true });
});

app.delete('/api/account', requireAuth, async (req, res) => {
  // 外部キーのON DELETE CASCADEに頼らず、明示的に関連データを削除する。
  await db.execute({ sql: 'DELETE FROM sessions WHERE user_id = ?', args: [req.userId] });
  await db.execute({ sql: 'DELETE FROM exercises WHERE user_id = ?', args: [req.userId] });
  await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [req.userId] });
  res.clearCookie('token', COOKIE_OPTS);
  res.status(204).end();
});

// --- 種目 ---

app.get('/api/exercises', requireAuth, async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM exercises WHERE user_id = ?',
    args: [req.userId],
  });
  res.json(
    result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      muscleGroup: r.muscle_group,
      isCustom: !!r.is_custom,
    })),
  );
});

app.post('/api/exercises', requireAuth, async (req, res) => {
  const { name, muscleGroup } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: '種目名を入力してください。' });
  }
  const id = randomUUID();
  await db.execute({
    sql: 'INSERT INTO exercises (id, user_id, name, muscle_group, is_custom) VALUES (?, ?, ?, ?, 1)',
    args: [id, req.userId, name.trim(), muscleGroup ?? 'その他'],
  });
  res.status(201).json({ id, name: name.trim(), muscleGroup: muscleGroup ?? 'その他', isCustom: true });
});

app.patch('/api/exercises/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const existingResult = await db.execute({
    sql: 'SELECT * FROM exercises WHERE id = ? AND user_id = ?',
    args: [id, req.userId],
  });
  const existing = existingResult.rows[0];
  if (!existing) {
    return res.status(404).json({ error: '種目が見つかりません。' });
  }

  const { name, muscleGroup } = req.body ?? {};
  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ error: '種目名を入力してください。' });
  }

  const nextName = name !== undefined ? name.trim() : existing.name;
  const nextGroup = muscleGroup ?? existing.muscle_group;

  await db.execute({
    sql: 'UPDATE exercises SET name = ?, muscle_group = ? WHERE id = ? AND user_id = ?',
    args: [nextName, nextGroup, id, req.userId],
  });

  res.json({ id, name: nextName, muscleGroup: nextGroup, isCustom: true });
});

app.delete('/api/exercises/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const existingResult = await db.execute({
    sql: 'SELECT id FROM exercises WHERE id = ? AND user_id = ?',
    args: [id, req.userId],
  });
  if (existingResult.rows.length === 0) {
    return res.status(404).json({ error: '種目が見つかりません。' });
  }

  await db.execute({
    sql: 'DELETE FROM sessions WHERE exercise_id = ? AND user_id = ?',
    args: [id, req.userId],
  });
  await db.execute({
    sql: 'DELETE FROM exercises WHERE id = ? AND user_id = ?',
    args: [id, req.userId],
  });

  res.status(204).end();
});

// --- セッション ---

app.get('/api/sessions', requireAuth, async (req, res) => {
  const { exerciseId, from, to } = req.query;
  let sql = 'SELECT * FROM sessions WHERE user_id = ?';
  const args = [req.userId];
  if (exerciseId) {
    sql += ' AND exercise_id = ?';
    args.push(exerciseId);
  }
  if (from) {
    sql += ' AND date >= ?';
    args.push(from);
  }
  if (to) {
    sql += ' AND date <= ?';
    args.push(to);
  }
  sql += ' ORDER BY date ASC';

  const result = await db.execute({ sql, args });
  res.json(
    result.rows.map((r) => ({
      id: r.id,
      exerciseId: r.exercise_id,
      date: r.date,
      sets: JSON.parse(r.sets_json),
      note: r.note ?? undefined,
      workoutId: r.workout_id ?? undefined,
    })),
  );
});

app.post('/api/sessions', requireAuth, async (req, res) => {
  const { exerciseId, date, sets, note, workoutId } = req.body ?? {};
  if (!exerciseId || !date || !Array.isArray(sets) || sets.length === 0) {
    return res.status(400).json({ error: 'セッションの形式が正しくありません。' });
  }
  const id = randomUUID();
  await db.execute({
    sql: 'INSERT INTO sessions (id, user_id, exercise_id, date, sets_json, note, workout_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [id, req.userId, exerciseId, date, JSON.stringify(sets), note ?? null, workoutId ?? null],
  });
  res.status(201).json({ id, exerciseId, date, sets, note, workoutId });
});

app.patch('/api/sessions/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const existingResult = await db.execute({
    sql: 'SELECT * FROM sessions WHERE id = ? AND user_id = ?',
    args: [id, req.userId],
  });
  const existing = existingResult.rows[0];
  if (!existing) {
    return res.status(404).json({ error: '記録が見つかりません。' });
  }

  const { date, sets, note } = req.body ?? {};
  if (sets !== undefined && (!Array.isArray(sets) || sets.length === 0)) {
    return res.status(400).json({ error: 'セットの形式が正しくありません。' });
  }

  const nextDate = date ?? existing.date;
  const nextSetsJson = sets !== undefined ? JSON.stringify(sets) : existing.sets_json;
  const nextNote = note !== undefined ? note : existing.note;

  await db.execute({
    sql: 'UPDATE sessions SET date = ?, sets_json = ?, note = ? WHERE id = ? AND user_id = ?',
    args: [nextDate, nextSetsJson, nextNote, id, req.userId],
  });

  res.json({
    id,
    exerciseId: existing.exercise_id,
    date: nextDate,
    sets: JSON.parse(nextSetsJson),
    note: nextNote ?? undefined,
    workoutId: existing.workout_id ?? undefined,
  });
});

app.delete('/api/sessions/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const result = await db.execute({
    sql: 'DELETE FROM sessions WHERE id = ? AND user_id = ?',
    args: [id, req.userId],
  });
  if (result.rowsAffected === 0) {
    return res.status(404).json({ error: '記録が見つかりません。' });
  }
  res.status(204).end();
});

async function main() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`fuka-log server running on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});