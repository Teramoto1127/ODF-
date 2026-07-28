import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import { db } from './db.js';
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

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
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

function migrateUserData(userId, { exercises = [], sessions = [] }) {
  const insertExercise = db.prepare(
    `INSERT OR IGNORE INTO exercises (id, user_id, name, muscle_group, is_custom)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const insertSession = db.prepare(
    `INSERT OR IGNORE INTO sessions (id, user_id, exercise_id, date, sets_json, note, workout_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  const tx = db.transaction(() => {
    for (const ex of exercises) {
      if (!ex.isCustom) continue;
      insertExercise.run(ex.id, userId, ex.name, ex.muscleGroup, 1);
    }
    for (const s of sessions) {
      insertSession.run(
        s.id,
        userId,
        s.exerciseId,
        s.date,
        JSON.stringify(s.sets),
        s.note ?? null,
        s.workoutId ?? null,
      );
    }
  });
  tx();
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

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'このメールアドレスは既に登録されています。' });
  }

  const userId = randomUUID();
  const passwordHash = await hashPassword(password);
  db.prepare(
    'INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
  ).run(userId, email, passwordHash, new Date().toISOString());

  if (migrate && typeof migrate === 'object') {
    migrateUserData(userId, migrate);
  }

  const token = signToken(userId);
  res.cookie('token', token, COOKIE_OPTS);
  res.status(201).json({ id: userId, email });
});

app.post('/api/login', authLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
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

app.get('/api/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(req.userId);
  res.json(user);
});

// --- パスワードリセット ---

app.post('/api/password-reset/request', authLimiter, async (req, res) => {
  const { email } = req.body ?? {};
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'メールアドレスの形式が正しくありません。' });
  }

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  // ユーザーの存在有無を外部に漏らさないため、見つからない場合も同じ成功レスポンスを返す。
  if (user) {
    const token = generateResetToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 60分
    db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(
      token,
      expires,
      user.id,
    );
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

  const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
  if (!user || !user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
    return res.status(400).json({ error: 'リンクの有効期限が切れています。もう一度お試しください。' });
  }

  const passwordHash = await hashPassword(newPassword);
  db.prepare(
    'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
  ).run(passwordHash, user.id);

  res.json({ ok: true });
});

// --- アカウント設定 ---

app.patch('/api/account/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);

  const valid = await verifyPassword(currentPassword ?? '', user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: '現在のパスワードが正しくありません。' });
  }
  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ error: '新しいパスワードは8文字以上にしてください。' });
  }

  const passwordHash = await hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, req.userId);
  res.json({ ok: true });
});

app.delete('/api/account', requireAuth, (req, res) => {
  // users テーブルへの外部キーが ON DELETE CASCADE のため、
  // exercises / sessions も連動して削除される。
  db.prepare('DELETE FROM users WHERE id = ?').run(req.userId);
  res.clearCookie('token', COOKIE_OPTS);
  res.status(204).end();
});

// --- 種目 ---

app.get('/api/exercises', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM exercises WHERE user_id = ?').all(req.userId);
  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      muscleGroup: r.muscle_group,
      isCustom: !!r.is_custom,
    })),
  );
});

app.post('/api/exercises', requireAuth, (req, res) => {
  const { name, muscleGroup } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: '種目名を入力してください。' });
  }
  const id = randomUUID();
  db.prepare(
    'INSERT INTO exercises (id, user_id, name, muscle_group, is_custom) VALUES (?, ?, ?, ?, 1)',
  ).run(id, req.userId, name.trim(), muscleGroup ?? 'その他');
  res.status(201).json({ id, name: name.trim(), muscleGroup: muscleGroup ?? 'その他', isCustom: true });
});

app.patch('/api/exercises/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const existing = db
    .prepare('SELECT * FROM exercises WHERE id = ? AND user_id = ?')
    .get(id, req.userId);
  if (!existing) {
    return res.status(404).json({ error: '種目が見つかりません。' });
  }

  const { name, muscleGroup } = req.body ?? {};
  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ error: '種目名を入力してください。' });
  }

  const nextName = name !== undefined ? name.trim() : existing.name;
  const nextGroup = muscleGroup ?? existing.muscle_group;

  db.prepare('UPDATE exercises SET name = ?, muscle_group = ? WHERE id = ? AND user_id = ?').run(
    nextName,
    nextGroup,
    id,
    req.userId,
  );

  res.json({ id, name: nextName, muscleGroup: nextGroup, isCustom: true });
});

app.delete('/api/exercises/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const existing = db
    .prepare('SELECT id FROM exercises WHERE id = ? AND user_id = ?')
    .get(id, req.userId);
  if (!existing) {
    return res.status(404).json({ error: '種目が見つかりません。' });
  }

  // 種目を削除する際、紐づく過去セッションも一緒に削除する。
  // (孤立した記録を残さず、データの一貫性を優先する設計判断)
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM sessions WHERE exercise_id = ? AND user_id = ?').run(id, req.userId);
    db.prepare('DELETE FROM exercises WHERE id = ? AND user_id = ?').run(id, req.userId);
  });
  tx();

  res.status(204).end();
});

// --- セッション ---

app.get('/api/sessions', requireAuth, (req, res) => {
  const { exerciseId, from, to } = req.query;
  let query = 'SELECT * FROM sessions WHERE user_id = ?';
  const params = [req.userId];
  if (exerciseId) {
    query += ' AND exercise_id = ?';
    params.push(exerciseId);
  }
  if (from) {
    query += ' AND date >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND date <= ?';
    params.push(to);
  }
  query += ' ORDER BY date ASC';
  const rows = db.prepare(query).all(...params);
  res.json(
    rows.map((r) => ({
      id: r.id,
      exerciseId: r.exercise_id,
      date: r.date,
      sets: JSON.parse(r.sets_json),
      note: r.note ?? undefined,
      workoutId: r.workout_id ?? undefined,
    })),
  );
});

app.post('/api/sessions', requireAuth, (req, res) => {
  const { exerciseId, date, sets, note, workoutId } = req.body ?? {};
  if (!exerciseId || !date || !Array.isArray(sets) || sets.length === 0) {
    return res.status(400).json({ error: 'セッションの形式が正しくありません。' });
  }
  const id = randomUUID();
  db.prepare(
    'INSERT INTO sessions (id, user_id, exercise_id, date, sets_json, note, workout_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(id, req.userId, exerciseId, date, JSON.stringify(sets), note ?? null, workoutId ?? null);
  res.status(201).json({ id, exerciseId, date, sets, note, workoutId });
});

app.patch('/api/sessions/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const existing = db
    .prepare('SELECT * FROM sessions WHERE id = ? AND user_id = ?')
    .get(id, req.userId);
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

  db.prepare('UPDATE sessions SET date = ?, sets_json = ?, note = ? WHERE id = ? AND user_id = ?').run(
    nextDate,
    nextSetsJson,
    nextNote,
    id,
    req.userId,
  );

  res.json({
    id,
    exerciseId: existing.exercise_id,
    date: nextDate,
    sets: JSON.parse(nextSetsJson),
    note: nextNote ?? undefined,
    workoutId: existing.workout_id ?? undefined,
  });
});

app.delete('/api/sessions/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?').run(id, req.userId);
  if (result.changes === 0) {
    return res.status(404).json({ error: '記録が見つかりません。' });
  }
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`fuka-log server running on http://localhost:${PORT}`);
});