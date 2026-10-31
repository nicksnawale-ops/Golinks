/**
 * Request identity from a server-side session.
 *
 * Signing in sets an httpOnly, SameSite=Lax cookie holding a random token; only its SHA-256 is
 * stored in the sessions table. The browser cannot read or forge it, unlike the old
 * self-asserted X-GoLinks-User-Id header (which is now ignored).
 */
import type { NextFunction, Request, Response } from 'express';
import { User } from '../shared/types/auth';
import { ServerConfig } from './config';
import { DB } from './db/database';
import { forbidden, HttpError, unauthorized } from './errors';
import { getSessionUserId } from './repositories/sessionRepository';
import { getActiveUserById } from './repositories/userRepository';

export const SESSION_COOKIE = 'golinks_session';

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function sessionCookieOptions(config: ServerConfig) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.cookieSecure,
    path: '/',
    maxAge: config.sessionTtlHours * 3_600_000,
  };
}

/** Sets res.locals.actor (User | null) and res.locals.sessionToken from the session cookie. */
export function actorMiddleware(db: DB) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = readCookie(req, SESSION_COOKIE);
    const userId = token ? getSessionUserId(db, token) : null;
    res.locals.actor = userId ? getActiveUserById(db, userId) : null;
    res.locals.sessionToken = res.locals.actor ? token : null;
    next();
  };
}

export function currentActor(res: Response): User | null {
  return (res.locals.actor as User | null) ?? null;
}

export function requireActor(res: Response): User {
  const actor = currentActor(res);
  if (!actor) throw unauthorized('Please sign in.');
  return actor;
}

export function requireAdmin(res: Response): User {
  const actor = requireActor(res);
  if (actor.role !== 'admin') throw forbidden('Administrator role required.');
  return actor;
}

/**
 * CSRF guard for state-changing API calls: a browser always sends Origin on cross-site POST/PUT/
 * DELETE, so reject any whose Origin host differs from the Host we are served on. Requests with
 * no Origin (curl, scripts) pass — they don't carry a victim's cookie.
 */
export function sameOriginGuard(req: Request, _res: Response, next: NextFunction) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const origin = req.header('origin');
  if (!origin) return next();
  let originHost: string; // an opaque "null" origin fails to parse and is rejected
  try {
    originHost = new URL(origin).host;
  } catch {
    return next(forbidden('Cross-site request blocked.'));
  }
  const host = req.header('x-forwarded-host') && req.app.get('trust proxy') ? req.header('x-forwarded-host') : req.header('host');
  if (originHost.toLowerCase() !== (host || '').toLowerCase()) return next(forbidden('Cross-site request blocked.'));
  next();
}

/**
 * Small in-memory limiter for sign-in attempts: after `max` failures for the same IP + email
 * within the window, further attempts get 429 until the window passes.
 */
export class LoginRateLimiter {
  private failures = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly max = 10,
    private readonly windowMs = 15 * 60_000
  ) {}

  private key(ip: string, email: string) {
    return `${ip}|${email.trim().toLowerCase()}`;
  }

  check(ip: string, email: string): void {
    const entry = this.failures.get(this.key(ip, email));
    if (entry && entry.resetAt > Date.now() && entry.count >= this.max) {
      const minutes = Math.ceil((entry.resetAt - Date.now()) / 60_000);
      throw new HttpError(429, `Too many failed sign-in attempts. Try again in ${minutes} minute(s).`);
    }
  }

  fail(ip: string, email: string): void {
    const key = this.key(ip, email);
    const now = Date.now();
    const entry = this.failures.get(key);
    if (!entry || entry.resetAt <= now) this.failures.set(key, { count: 1, resetAt: now + this.windowMs });
    else entry.count++;
    if (this.failures.size > 10_000) {
      for (const [k, v] of this.failures) if (v.resetAt <= now) this.failures.delete(k);
    }
  }

  succeed(ip: string, email: string): void {
    this.failures.delete(this.key(ip, email));
  }
}
