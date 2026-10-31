import { createHash, randomBytes } from 'node:crypto';
import type Database from 'better-sqlite3';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Creates a session and returns the raw token (goes only into the httpOnly cookie). */
export function createSession(db: Database.Database, userId: string, ttlHours: number): string {
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  const expires = new Date(now.getTime() + ttlHours * 3_600_000);
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    hashToken(token),
    userId,
    now.toISOString(),
    expires.toISOString()
  );
  return token;
}

/** Returns the user id for a valid, unexpired session token. */
export function getSessionUserId(db: Database.Database, token: string): string | null {
  const row = db
    .prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?')
    .get(hashToken(token), new Date().toISOString()) as { user_id: string } | undefined;
  return row?.user_id ?? null;
}

export function deleteSession(db: Database.Database, token: string): void {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

/** Signs a user out everywhere, optionally keeping the session that made the change. */
export function deleteUserSessions(db: Database.Database, userId: string, keepToken?: string): void {
  if (keepToken) {
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').run(userId, hashToken(keepToken));
  } else {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  }
}

export function pruneExpiredSessions(db: Database.Database): number {
  return db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString()).changes;
}
