import { getDb } from '../db/index.js';
import { WebSession, WebSessionRow, toWebSession } from './types.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const SESSION_DURATION_HOURS = 24 * 7; // 7 days

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function createSession(userId: string): { session: WebSession; token: string } {
  const db = getDb();
  const id = uuidv4();
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

  const stmt = db.prepare(`
    INSERT INTO web_sessions (id, user_id, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(id, userId, tokenHash, expiresAt.toISOString(), now.toISOString());

  const session = getSessionById(id)!;
  return { session, token };
}

export function getSessionById(id: string): WebSession | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM web_sessions WHERE id = ?');
  const row = stmt.get(id) as WebSessionRow | undefined;
  return row ? toWebSession(row) : null;
}

export function getSessionByToken(token: string): WebSession | null {
  const db = getDb();
  const tokenHash = hashToken(token);
  const stmt = db.prepare('SELECT * FROM web_sessions WHERE token_hash = ?');
  const row = stmt.get(tokenHash) as WebSessionRow | undefined;
  return row ? toWebSession(row) : null;
}

export function getValidSessionByToken(token: string): WebSession | null {
  const session = getSessionByToken(token);
  if (!session) return null;

  const now = new Date();
  const expiresAt = new Date(session.expiresAt);

  if (now > expiresAt) {
    deleteSession(session.id);
    return null;
  }

  return session;
}

export function deleteSession(id: string): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM web_sessions WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function deleteSessionByToken(token: string): boolean {
  const db = getDb();
  const tokenHash = hashToken(token);
  const stmt = db.prepare('DELETE FROM web_sessions WHERE token_hash = ?');
  const result = stmt.run(tokenHash);
  return result.changes > 0;
}

export function deleteUserSessions(userId: string): number {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM web_sessions WHERE user_id = ?');
  const result = stmt.run(userId);
  return result.changes;
}

export function cleanExpiredSessions(): number {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare('DELETE FROM web_sessions WHERE expires_at < ?');
  const result = stmt.run(now);
  return result.changes;
}
