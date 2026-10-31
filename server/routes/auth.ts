import { Router } from 'express';
import { currentActor, LoginRateLimiter, requireActor, SESSION_COOKIE, sessionCookieOptions } from '../auth';
import { ServerConfig } from '../config';
import { DB } from '../db/database';
import { getDemoAccounts } from '../db/demo';
import { badRequest, unauthorized } from '../errors';
import { createSession, deleteSession, deleteUserSessions } from '../repositories/sessionRepository';
import {
  getPasswordHash,
  getUserCredentials,
  setPasswordHash,
  stampLogin,
} from '../repositories/userRepository';
import { hashPassword, validatePasswordStrength, verifyAgainstDummy, verifyPassword } from '../security/passwords';

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** /api/auth: sign in, sign out, current user, change own password. */
export function authRouter(db: DB, config: ServerConfig): Router {
  const router = Router();
  const limiter = new LoginRateLimiter();

  // Sign-in page asks whether to show demo accounts. Only ever returns credentials in demo mode.
  router.get('/demo', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(config.demoMode ? { enabled: true, accounts: getDemoAccounts(db) } : { enabled: false, accounts: [] });
  });

  router.post('/login', (req, res) => {
    const email = str(req.body?.email).trim();
    const password = str(req.body?.password);
    if (!email || !password) throw badRequest('Email and password are required.');

    const ip = req.ip || 'unknown';
    limiter.check(ip, email);

    const creds = getUserCredentials(db, email);
    const ok = creds ? verifyPassword(password, creds.passwordHash) : (verifyAgainstDummy(password), false);
    if (!creds || !ok || !creds.isActive) {
      limiter.fail(ip, email);
      // One message for every failure, so it never reveals which accounts exist.
      throw unauthorized('Incorrect email or password.');
    }

    limiter.succeed(ip, email);
    const token = createSession(db, creds.user.id, config.sessionTtlHours);
    stampLogin(db, creds.user.id);
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions(config));
    res.json(creds.user);
  });

  router.post('/logout', (req, res) => {
    const token = res.locals.sessionToken as string | null;
    if (token) deleteSession(db, token);
    const { maxAge: _maxAge, ...cookieOptions } = sessionCookieOptions(config);
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    res.status(204).end();
  });

  router.get('/me', (_req, res) => {
    const actor = currentActor(res);
    if (!actor) throw unauthorized('Not signed in.');
    res.set('Cache-Control', 'no-store').json(actor);
  });

  router.post('/password', (req, res) => {
    const actor = requireActor(res);
    const currentPassword = str(req.body?.currentPassword);
    const newPassword = str(req.body?.newPassword);
    if (!verifyPassword(currentPassword, getPasswordHash(db, actor.id))) {
      throw badRequest('Current password is incorrect.');
    }
    const weak = validatePasswordStrength(newPassword);
    if (weak) throw badRequest(weak);
    setPasswordHash(db, actor.id, hashPassword(newPassword));
    // Sign out every other device that had the old password.
    deleteUserSessions(db, actor.id, res.locals.sessionToken as string);
    res.status(204).end();
  });

  return router;
}
