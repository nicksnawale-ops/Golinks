import express, { Router } from 'express';
import { listUsers } from '../repositories/userRepository';
import { queryAuditLog } from '../repositories/auditRepository';
import { getLinkById, recordLinkClick } from '../repositories/linkRepository';
import { requireActor, requireAdmin } from '../auth';
import { ServerConfig } from '../config';
import { DB } from '../db/database';
import { resetAuditLog, resetToSampleLinks } from '../db/seed';
import { badRequest, forbidden, notFound } from '../errors';
import { parseCreateLinkInput, parseUpdateLinkInput } from '../services/linkInput';
import {
  checkShortNameAvailable,
  createLink,
  deleteLink,
  getCategories,
  getStats,
  importLinks,
  LinkQuery,
  queryLinks,
  resolveGoLink,
  updateLink,
} from '../services/linkService';

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

function parseLinkQuery(q: Record<string, unknown>): LinkQuery {
  const sortBy = str(q.sortBy);
  const sortOrder = str(q.sortOrder);
  const isActive = str(q.isActive);
  if (sortBy && !['clicks', 'recent', 'name', 'lastAccessed'].includes(sortBy)) {
    throw badRequest('sortBy must be one of clicks, recent, name, lastAccessed.');
  }
  if (sortOrder && !['asc', 'desc'].includes(sortOrder)) throw badRequest('sortOrder must be asc or desc.');
  if (isActive && !['true', 'false'].includes(isActive)) throw badRequest('isActive must be true or false.');

  return {
    query: str(q.query),
    category: str(q.category),
    visibility: str(q.visibility),
    shortName: str(q.shortName),
    isActive: isActive === undefined ? undefined : isActive === 'true',
    sortBy: sortBy as LinkQuery['sortBy'],
    sortOrder: sortOrder as LinkQuery['sortOrder'],
  };
}

/** Raw (still percent-encoded) query string of the request, without the leading "?". */
function rawQueryString(originalUrl: string): string {
  const idx = originalUrl.indexOf('?');
  return idx === -1 ? '' : originalUrl.slice(idx + 1);
}

export function apiRouter(db: DB, config: ServerConfig): Router {
  const router = Router();
  router.use(express.json({ limit: '5mb' }));

  router.get('/health', (_req, res) => {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // ---- Links ---------------------------------------------------------------
  router.get('/links', (req, res) => {
    res.json(queryLinks(db, parseLinkQuery(req.query)));
  });

  router.get('/links/validate', (req, res) => {
    const shortName = str(req.query.shortName) ?? '';
    res.json(checkShortNameAvailable(db, shortName, str(req.query.excludeId)));
  });

  router.post('/links', (req, res) => {
    const actor = requireActor(res);
    const link = createLink(db, parseCreateLinkInput(req.body), actor);
    res.status(201).location(`/api/links/${encodeURIComponent(link.id)}`).json(link);
  });

  router.get('/links/:id', (req, res) => {
    const link = getLinkById(db, req.params.id);
    if (!link) throw notFound(`Link with ID "${req.params.id}" was not found.`);
    res.json(link);
  });

  router.put('/links/:id', (req, res) => {
    const actor = requireActor(res);
    res.json(updateLink(db, req.params.id, parseUpdateLinkInput(req.body), actor));
  });

  router.delete('/links/:id', (req, res) => {
    const actor = requireActor(res);
    deleteLink(db, req.params.id, actor);
    res.status(204).end();
  });

  router.post('/links/:id/click', (req, res) => {
    if (!getLinkById(db, req.params.id)) throw notFound(`Link with ID "${req.params.id}" was not found.`);
    recordLinkClick(db, req.params.id);
    res.status(204).end();
  });

  router.get('/categories', (_req, res) => {
    res.json(getCategories(db));
  });

  // ---- Resolution (used by the in-app omnibar / redirect page) --------------
  router.get('/resolve/*', (req, res) => {
    const path = (req.params as Record<string, string>)[0] ?? '';
    const query = rawQueryString(req.originalUrl);
    const result = resolveGoLink(db, query ? `${path}?${query}` : path);
    const status = result.found ? 200 : result.isDisabled ? 410 : 404;
    res.status(status).set('Cache-Control', 'no-store').json(result);
  });

  // ---- Import / export ------------------------------------------------------
  router.get('/export', (_req, res) => {
    const stamp = new Date().toISOString().slice(0, 10);
    res
      .set('Content-Disposition', `attachment; filename="golinks-export-${stamp}.json"`)
      .json(queryLinks(db, { sortBy: 'name' }));
  });

  router.post('/import', (req, res) => {
    const actor = requireAdmin(res);
    const body = req.body as { links?: unknown; mode?: unknown } | unknown[];
    const items = Array.isArray(body) ? body : body?.links;
    const mode = Array.isArray(body) ? 'upsert' : (body?.mode ?? 'upsert');
    if (!Array.isArray(items)) throw badRequest('Body must be a JSON array of links or { "links": [...] }.');
    if (mode !== 'create' && mode !== 'upsert') throw badRequest('mode must be "create" or "upsert".');
    if (items.length > 10000) throw badRequest('Import at most 10000 links per request.');
    res.json(importLinks(db, items, mode, actor));
  });

  // ---- Users, audit, stats --------------------------------------------------
  router.get('/users', (_req, res) => {
    res.json(listUsers(db));
  });

  router.get('/audit', (req, res) => {
    requireAdmin(res);
    const limit = str(req.query.limit);
    res.json(
      queryAuditLog(db, {
        action: str(req.query.action),
        actor: str(req.query.actor),
        shortName: str(req.query.shortName),
        dateFrom: str(req.query.dateFrom),
        dateTo: str(req.query.dateTo),
        limit: limit ? Number.parseInt(limit, 10) || undefined : undefined,
      })
    );
  });

  router.get('/stats', (_req, res) => {
    res.json(getStats(db));
  });

  // ---- Destructive admin actions (disabled unless ALLOW_DATA_RESET=true) ----
  const requireReset = () => {
    if (!config.allowDataReset) {
      throw forbidden('Data reset is disabled on this server (set ALLOW_DATA_RESET=true to enable).');
    }
  };

  router.post('/reset', (_req, res) => {
    requireAdmin(res);
    requireReset();
    resetToSampleLinks(db);
    res.json(queryLinks(db));
  });

  router.delete('/audit', (_req, res) => {
    requireAdmin(res);
    requireReset();
    resetAuditLog(db, false);
    res.status(204).end();
  });

  router.post('/audit/reset', (_req, res) => {
    requireAdmin(res);
    requireReset();
    resetAuditLog(db, true);
    res.status(204).end();
  });

  router.use((_req, _res, next) => next(notFound('Unknown API endpoint.')));

  return router;
}
