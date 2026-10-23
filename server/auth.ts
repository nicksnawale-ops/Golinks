/**
 * Request identity.
 *
 * The React app has a mock "user switcher" (no real SSO yet). It sends the selected user's id in
 * the X-GoLinks-User-Id header, and the server looks that id up in the users table.
 * This header is self-asserted — anyone on the LAN can set it. Put the app behind an SSO-aware
 * reverse proxy (or replace resolveActor) before relying on these roles for security.
 */
import type { NextFunction, Request, Response } from 'express';
import { User } from '../shared/types/auth';
import { DB } from './db/database';
import { forbidden, unauthorized } from './errors';
import { getUserById } from './repositories/userRepository';

export const USER_HEADER = 'x-golinks-user-id';

export function actorMiddleware(db: DB) {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.header(USER_HEADER);
    res.locals.actor = id ? getUserById(db, id) : null;
    next();
  };
}

export function requireActor(res: Response): User {
  const actor = res.locals.actor as User | null;
  if (!actor) throw unauthorized(`Missing or unknown ${USER_HEADER} header.`);
  return actor;
}

export function requireAdmin(res: Response): User {
  const actor = requireActor(res);
  if (actor.role !== 'admin') throw forbidden('Administrator role required.');
  return actor;
}
