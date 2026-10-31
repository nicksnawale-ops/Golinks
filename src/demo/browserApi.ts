/**
 * Browser demo backend: the GoLinks API, answered inside the browser.
 *
 * Used only where no GoLinks server exists (static hosting such as Vercel). Link rules run the real
 * server code (server/services/linkService.ts, linkInput.ts); at build time its repository imports
 * are swapped for the localStorage-backed ones in ./repositories (see vite.config.ts). Routes and
 * permission checks mirror server/routes/*.ts. Sign-in is simulated: it protects nothing, because
 * all data lives in the visitor's own browser.
 */
import { SEED_AUDIT_LOGS, SEED_LINKS } from '../../shared/seedData';
import { User, UserRole } from '../../shared/types/auth';
import { validateShortNameFormat } from '../../shared/validation';
import { badRequest, conflict, forbidden, HttpError, notFound, unauthorized } from '../../server/errors';
import { parseCreateLinkInput, parseUpdateLinkInput } from '../../server/services/linkInput';
import {
  checkShortNameAvailable,
  createLink,
  deleteLink,
  getCategories,
  getStats,
  getVisibleLink,
  importLinks,
  LinkQuery,
  queryLinks,
  resolveGoLink,
  updateLink,
} from '../../server/services/linkService';
import { queryAuditLog } from './repositories/auditRepository';
import { dismissMissingLink, getDailyClicks, listMissingLinks, recordClickEvent, recordNotFound } from './repositories/insightsRepository';
import { recordLinkClick } from './repositories/linkRepository';
import { randomUUID } from '../../shared/uuid';
import { DEMO_PASSWORDS, demoDb, DemoDB, DemoUser } from './store';

export interface BrowserApiResponse {
  status: number;
  data?: unknown;
  raw?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+$/;
const MIN_PASSWORD = 8;

function publicUser(u: DemoUser): User {
  return { id: u.id, name: u.name, email: u.email, role: u.role, department: u.department };
}

function managedUser(u: DemoUser) {
  return { ...publicUser(u), isActive: u.isActive, hasPassword: !!u.password, lastLoginAt: u.lastLoginAt, createdAt: u.createdAt };
}

function currentActor(db: DemoDB): User | null {
  const u = db.state.users.find((x) => x.id === db.state.sessionUserId && x.isActive);
  return u ? publicUser(u) : null;
}

function requireActor(db: DemoDB): User {
  const actor = currentActor(db);
  if (!actor) throw unauthorized('Please sign in.');
  return actor;
}

function requireAdmin(db: DemoDB): User {
  const actor = requireActor(db);
  if (actor.role !== 'admin') throw forbidden('Administrator role required.');
  return actor;
}

function weakPassword(p: unknown): string | null {
  if (typeof p !== 'string') return 'Password is required.';
  if (p.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters.`;
  if (p.length > 200) return 'Password must be at most 200 characters.';
  return null;
}

function activeAdminsWithPassword(db: DemoDB, excludeId?: string): number {
  return db.state.users.filter((u) => u.role === 'admin' && u.isActive && u.password && u.id !== excludeId).length;
}

function parseLinkQuery(q: URLSearchParams): LinkQuery {
  const get = (k: string) => q.get(k) ?? undefined;
  const isActive = get('isActive');
  return {
    query: get('query'),
    category: get('category'),
    visibility: get('visibility'),
    shortName: get('shortName'),
    isActive: isActive === undefined ? undefined : isActive === 'true',
    sortBy: get('sortBy') as LinkQuery['sortBy'],
    sortOrder: get('sortOrder') as LinkQuery['sortOrder'],
  };
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const ok = (data?: unknown, status = 200): BrowserApiResponse => ({ status, data });
const noContent = (): BrowserApiResponse => ({ status: 204 });

function route(db: DemoDB, method: string, path: string, q: URLSearchParams, rawQuery: string, body: any): BrowserApiResponse {
  const seg = path.split('/').filter(Boolean).map(decodeURIComponent);
  const is = (m: string, ...parts: string[]) =>
    method === m && seg.length === parts.length && parts.every((p, i) => p === '*' || p === seg[i]);

  // ---- Health & auth ---------------------------------------------------------
  if (is('GET', 'health')) return ok({ status: 'ok', time: new Date().toISOString(), backend: 'browser-demo' });

  if (is('GET', 'auth', 'demo')) {
    const accounts = db.state.users
      .filter((u) => DEMO_PASSWORDS[u.id] && u.password === DEMO_PASSWORDS[u.id].password)
      .map((u) => ({ label: DEMO_PASSWORDS[u.id].label, email: u.email, password: u.password, role: u.role }));
    return ok({ enabled: true, accounts });
  }

  if (is('POST', 'auth', 'login')) {
    const email = str(body?.email).trim().toLowerCase();
    const password = str(body?.password);
    if (!email || !password) throw badRequest('Email and password are required.');
    const user = db.state.users.find((u) => u.email.toLowerCase() === email);
    if (!user || !user.isActive || !user.password || user.password !== password) {
      throw unauthorized('Incorrect email or password.');
    }
    db.mutate((s) => {
      s.sessionUserId = user.id;
      user.lastLoginAt = new Date().toISOString();
    });
    return ok(publicUser(user));
  }

  if (is('POST', 'auth', 'logout')) {
    db.mutate((s) => (s.sessionUserId = null));
    return noContent();
  }

  if (is('GET', 'auth', 'me')) return ok(requireActor(db));

  if (is('POST', 'auth', 'password')) {
    const actor = requireActor(db);
    const user = db.state.users.find((u) => u.id === actor.id)!;
    if (user.password !== str(body?.currentPassword)) throw badRequest('Current password is incorrect.');
    const weak = weakPassword(body?.newPassword);
    if (weak) throw badRequest(weak);
    db.mutate(() => (user.password = body.newPassword));
    return noContent();
  }

  // ---- Users (admin) -----------------------------------------------------------
  if (is('GET', 'users')) {
    requireAdmin(db);
    return ok(db.state.users.map(managedUser));
  }

  if (is('POST', 'users')) {
    requireAdmin(db);
    const email = str(body?.email).trim().toLowerCase();
    const name = str(body?.name).trim();
    if (!EMAIL_RE.test(email)) throw badRequest('A valid email is required.');
    if (!name) throw badRequest('Name is required.');
    if (db.state.users.some((u) => u.email.toLowerCase() === email)) throw conflict(`A user with email ${email} already exists.`);
    const weak = weakPassword(body?.password);
    if (weak) throw badRequest(weak);
    const role: UserRole = body?.role === 'admin' ? 'admin' : 'employee';
    const user: DemoUser = {
      id: 'user_' + randomUUID(),
      name,
      email,
      role,
      department: str(body?.department).trim(),
      password: body.password,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
    };
    db.mutate((s) => s.users.push(user));
    return ok(managedUser(user), 201);
  }

  if (is('PUT', 'users', '*')) {
    const actor = requireAdmin(db);
    const target = db.state.users.find((u) => u.id === seg[1]);
    if (!target) throw notFound('User not found.');
    const role = body?.role as UserRole | undefined;
    if (role !== undefined && role !== 'admin' && role !== 'employee') throw badRequest('"role" must be "admin" or "employee".');
    const isActive = body?.isActive as boolean | undefined;
    if (isActive !== undefined && typeof isActive !== 'boolean') throw badRequest('"isActive" must be true or false.');
    const losesAdmin = target.role === 'admin' && (role === 'employee' || isActive === false);
    if (losesAdmin && activeAdminsWithPassword(db, target.id) === 0) {
      throw badRequest('This is the only admin who can sign in. Make someone else an admin first.');
    }
    if (target.id === actor.id && isActive === false) throw badRequest('You cannot deactivate your own account.');
    db.mutate(() => {
      if (typeof body?.name === 'string' && body.name.trim()) target.name = body.name.trim();
      if (typeof body?.department === 'string') target.department = body.department.trim();
      if (role) target.role = role;
      if (isActive !== undefined) target.isActive = isActive;
    });
    return ok(managedUser(target));
  }

  if (is('POST', 'users', '*', 'password')) {
    requireAdmin(db);
    const target = db.state.users.find((u) => u.id === seg[1]);
    if (!target) throw notFound('User not found.');
    const weak = weakPassword(body?.password);
    if (weak) throw badRequest(weak);
    db.mutate(() => (target.password = body.password));
    return noContent();
  }

  // ---- Links --------------------------------------------------------------------
  if (is('GET', 'links')) return ok(queryLinks(db as any, parseLinkQuery(q), currentActor(db)));

  if (is('GET', 'links', 'validate')) {
    return ok(checkShortNameAvailable(db as any, q.get('shortName') ?? '', q.get('excludeId') ?? undefined, currentActor(db)));
  }

  if (is('POST', 'links')) {
    const actor = requireActor(db);
    return ok(createLink(db as any, parseCreateLinkInput(body), actor), 201);
  }

  if (is('GET', 'links', '*')) {
    const link = getVisibleLink(db as any, seg[1], currentActor(db));
    if (!link) throw notFound(`Link with ID "${seg[1]}" was not found.`);
    return ok(link);
  }

  if (is('GET', 'links', '*', 'clicks')) {
    const link = getVisibleLink(db as any, seg[1], currentActor(db));
    if (!link) throw notFound(`Link with ID "${seg[1]}" was not found.`);
    const days = Math.min(Math.max(Number.parseInt(q.get('days') ?? '30', 10) || 30, 1), 365);
    return ok(getDailyClicks(db, days, [link.id]));
  }

  if (is('PUT', 'links', '*')) {
    const actor = requireActor(db);
    return ok(updateLink(db as any, seg[1], parseUpdateLinkInput(body), actor));
  }

  if (is('DELETE', 'links', '*')) {
    const actor = requireActor(db);
    deleteLink(db as any, seg[1], actor);
    return noContent();
  }

  if (is('POST', 'links', '*', 'click')) {
    const actor = requireActor(db);
    const link = getVisibleLink(db as any, seg[1], actor);
    if (!link) throw notFound(`Link with ID "${seg[1]}" was not found.`);
    db.mutate(() => {
      const at = new Date().toISOString();
      recordLinkClick(db, link.id, at);
      recordClickEvent(db, link.id, actor.id, at);
    });
    return noContent();
  }

  if (is('GET', 'categories')) return ok(getCategories(db as any));

  // ---- Resolve (the in-app go/<name> page) ---------------------------------------------
  if (method === 'GET' && seg[0] === 'resolve') {
    const rawPath = path.replace(/^\/?resolve\/?/, '');
    const viewer = currentActor(db);
    const result = db.transaction(() => {
      const r = resolveGoLink(db as any, rawQuery ? `${rawPath}?${rawQuery}` : rawPath, { viewer });
      // No server-side redirects here, so missing names are counted when the app can't resolve them.
      if (!r.found && !r.isDisabled) {
        const name = decodeURIComponent(rawPath).replace(/^go\//i, '').split('/')[0].toLowerCase();
        if (validateShortNameFormat(name).valid) recordNotFound(db, name);
      }
      return r;
    })();
    return ok(result, result.found ? 200 : result.isDisabled ? 410 : 404);
  }

  // ---- Import / export, audit, stats, insights -------------------------------------
  if (is('GET', 'export')) {
    requireAdmin(db);
    return { status: 200, raw: JSON.stringify(queryLinks(db as any, { sortBy: 'name' }), null, 2) };
  }

  if (is('POST', 'import')) {
    const actor = requireAdmin(db);
    const items = Array.isArray(body) ? body : body?.links;
    const mode = Array.isArray(body) ? 'upsert' : (body?.mode ?? 'upsert');
    if (!Array.isArray(items)) throw badRequest('Body must be a JSON array of links or { "links": [...] }.');
    if (mode !== 'create' && mode !== 'upsert') throw badRequest('mode must be "create" or "upsert".');
    return ok(importLinks(db as any, items, mode, actor));
  }

  if (is('GET', 'audit')) {
    requireAdmin(db);
    const limit = q.get('limit');
    return ok(
      queryAuditLog(db, {
        action: q.get('action') ?? undefined,
        actor: q.get('actor') ?? undefined,
        shortName: q.get('shortName') ?? undefined,
        dateFrom: q.get('dateFrom') ?? undefined,
        dateTo: q.get('dateTo') ?? undefined,
        limit: limit ? Number.parseInt(limit, 10) || undefined : undefined,
      })
    );
  }

  if (is('GET', 'stats')) return ok(getStats(db as any, currentActor(db)));

  if (is('GET', 'insights', 'missing')) {
    requireAdmin(db);
    const limit = Math.min(Math.max(Number.parseInt(q.get('limit') ?? '50', 10) || 50, 1), 500);
    return ok(db.transaction(() => listMissingLinks(db, limit))());
  }

  if (is('DELETE', 'insights', 'missing', '*')) {
    requireAdmin(db);
    if (!db.transaction(() => dismissMissingLink(db, seg[2]))()) throw notFound('Not in the missing-links list.');
    return noContent();
  }

  // Demo data can always be reset (there is nothing real to protect).
  if (is('POST', 'reset')) {
    requireAdmin(db);
    db.mutate((s) => (s.links = SEED_LINKS.map((l) => ({ ...l }))));
    return ok(queryLinks(db as any, {}, currentActor(db)));
  }
  if (is('DELETE', 'audit')) {
    requireAdmin(db);
    db.mutate((s) => (s.audit = []));
    return noContent();
  }
  if (is('POST', 'audit', 'reset')) {
    requireAdmin(db);
    db.mutate((s) => (s.audit = SEED_AUDIT_LOGS.map((a) => ({ ...a }))));
    return noContent();
  }

  throw notFound('Unknown API endpoint.');
}

/** Handles one API request in the browser. `url` is the path after /api, with any query string. */
export async function browserApiRequest(method: string, url: string, body?: unknown): Promise<BrowserApiResponse> {
  const db = demoDb();
  const qIdx = url.indexOf('?');
  const path = qIdx === -1 ? url : url.slice(0, qIdx);
  const rawQuery = qIdx === -1 ? '' : url.slice(qIdx + 1);
  // Clone like a network round-trip would, so callers can't mutate stored state.
  const payload = body === undefined ? undefined : JSON.parse(JSON.stringify(body));
  try {
    const res = route(db, method.toUpperCase(), path, new URLSearchParams(rawQuery), rawQuery, payload);
    return res.data === undefined ? res : { ...res, data: JSON.parse(JSON.stringify(res.data)) };
  } catch (err) {
    if (err instanceof HttpError) {
      return { status: err.status, data: { error: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
    console.error('[browser demo]', err);
    return { status: 500, data: { error: 'Something went wrong in the demo. Try again, or reset the demo data.' } };
  }
}
