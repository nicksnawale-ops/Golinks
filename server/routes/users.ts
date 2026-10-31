import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { User, UserRole } from '../../shared/types/auth';
import { requireAdmin } from '../auth';
import { DB } from '../db/database';
import { badRequest, conflict, notFound } from '../errors';
import { deleteUserSessions } from '../repositories/sessionRepository';
import {
  countActiveAdminsWithPassword,
  getManagedUser,
  getUserCredentials,
  insertUser,
  listManagedUsers,
  setPasswordHash,
  updateUserFields,
} from '../repositories/userRepository';
import { hashPassword, validatePasswordStrength } from '../security/passwords';

const EMAIL_RE = /^[^\s@]+@[^\s@]+$/;

function parseRole(v: unknown): UserRole | undefined {
  if (v === undefined) return undefined;
  if (v !== 'admin' && v !== 'employee') throw badRequest('"role" must be "admin" or "employee".');
  return v;
}

function optionalText(v: unknown, field: string, max = 120): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'string') throw badRequest(`"${field}" must be a string.`);
  const t = v.trim();
  if (t.length > max) throw badRequest(`"${field}" must be at most ${max} characters.`);
  return t;
}

function logUserAdmin(actor: User, message: string) {
  console.log(`[users] ${actor.email}: ${message}`);
}

/** /api/users — user management. Everything here is admin-only. */
export function usersRouter(db: DB): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    requireAdmin(res);
    res.json(listManagedUsers(db));
  });

  router.post('/', (req, res) => {
    const actor = requireAdmin(res);
    const email = optionalText(req.body?.email, 'email', 200)?.toLowerCase() ?? '';
    const name = optionalText(req.body?.name, 'name') ?? '';
    if (!EMAIL_RE.test(email)) throw badRequest('A valid email is required.');
    if (!name) throw badRequest('Name is required.');
    if (getUserCredentials(db, email)) throw conflict(`A user with email ${email} already exists.`);

    const password = req.body?.password;
    const weak = validatePasswordStrength(password);
    if (weak) throw badRequest(weak);

    const id = 'user_' + randomUUID();
    insertUser(db, {
      id,
      email,
      name,
      role: parseRole(req.body?.role) ?? 'employee',
      department: optionalText(req.body?.department, 'department') ?? '',
      passwordHash: hashPassword(password as string),
    });
    logUserAdmin(actor, `created ${email}`);
    res.status(201).json(getManagedUser(db, id));
  });

  router.put('/:id', (req, res) => {
    const actor = requireAdmin(res);
    const target = getManagedUser(db, req.params.id);
    if (!target) throw notFound('User not found.');

    const role = parseRole(req.body?.role);
    const isActive = req.body?.isActive;
    if (isActive !== undefined && typeof isActive !== 'boolean') throw badRequest('"isActive" must be true or false.');

    // Never leave the system with no admin who can sign in.
    const losesAdmin = target.role === 'admin' && (role === 'employee' || isActive === false);
    if (losesAdmin && countActiveAdminsWithPassword(db, target.id) === 0) {
      throw badRequest('This is the only admin who can sign in. Make someone else an admin first.');
    }
    if (target.id === actor.id && isActive === false) throw badRequest('You cannot deactivate your own account.');

    updateUserFields(db, target.id, {
      name: optionalText(req.body?.name, 'name') || undefined,
      department: optionalText(req.body?.department, 'department'),
      role,
      isActive,
    });
    if (isActive === false || (role && role !== target.role)) deleteUserSessions(db, target.id);
    logUserAdmin(actor, `updated ${target.email} ${JSON.stringify({ role, isActive })}`);
    res.json(getManagedUser(db, target.id));
  });

  router.post('/:id/password', (req, res) => {
    const actor = requireAdmin(res);
    const target = getManagedUser(db, req.params.id);
    if (!target) throw notFound('User not found.');
    const weak = validatePasswordStrength(req.body?.password);
    if (weak) throw badRequest(weak);
    setPasswordHash(db, target.id, hashPassword(req.body.password));
    if (target.id !== actor.id) deleteUserSessions(db, target.id);
    logUserAdmin(actor, `reset password for ${target.email}`);
    res.status(204).end();
  });

  return router;
}
