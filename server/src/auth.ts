import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { DB } from './db';

const SESSION_MS = 30 * 24 * 3600 * 1000;
export const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;

export class AuthError extends Error {
  constructor(public status: number, msg: string) {
    super(msg);
  }
}

function hash(password: string, salt: string) {
  return scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
}

export function register(db: DB, username: string, password: string): { userId: number; token: string } {
  if (typeof username !== 'string' || !USERNAME_RE.test(username)) throw new AuthError(400, 'Username must be 3–16 letters, numbers or underscores.');
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new AuthError(400, 'Password must be 8–128 characters.');
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) throw new AuthError(409, 'That name is already taken.');
  const salt = randomBytes(16).toString('hex');
  const now = Date.now();
  const res = db.prepare('INSERT INTO users (username, pass_hash, salt, created, last_login) VALUES (?, ?, ?, ?, ?)').run(username, hash(password, salt), salt, now, now);
  const userId = Number(res.lastInsertRowid);
  return { userId, token: createSession(db, userId) };
}

export function login(db: DB, username: string, password: string): { userId: number; token: string } {
  if (typeof username !== 'string' || typeof password !== 'string') throw new AuthError(400, 'Missing credentials.');
  const row = db.prepare('SELECT id, pass_hash, salt FROM users WHERE username = ?').get(username) as { id: number; pass_hash: string; salt: string } | undefined;
  // constant-ish work even if user does not exist
  const h = hash(password, row?.salt ?? 'x'.repeat(32));
  if (!row || !timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(row.pass_hash, 'hex'))) throw new AuthError(401, 'Wrong name or password.');
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(Date.now(), row.id);
  return { userId: row.id, token: createSession(db, row.id) };
}

export function createSession(db: DB, userId: number) {
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, expires) VALUES (?, ?, ?)').run(token, userId, Date.now() + SESSION_MS);
  db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
  return token;
}

export function userForToken(db: DB, token: string | undefined | null): { id: number; username: string } | null {
  if (!token || typeof token !== 'string' || token.length !== 64) return null;
  const row = db.prepare('SELECT u.id as id, u.username as username, s.expires as expires FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?').get(token) as { id: number; username: string; expires: number } | undefined;
  if (!row || row.expires < Date.now()) return null;
  return { id: row.id, username: row.username };
}

export function logout(db: DB, token: string) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}
