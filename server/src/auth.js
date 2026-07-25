// server/src/auth.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// 本番運用時は環境変数から読むこと。ここではローカル開発用の
// フォールバック値を用意しているだけなので、必ず .env で上書きする。
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me';
const TOKEN_EXPIRY = '30d';

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.sub;
  } catch {
    return null;
  }
}

/** Express ミドルウェア: Cookie の token を検証し、req.userId にセットする */
export function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  const userId = token ? verifyToken(token) : null;
  if (!userId) {
    return res.status(401).json({ error: '認証が必要です。' });
  }
  req.userId = userId;
  next();
}