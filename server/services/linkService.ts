import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { findSimilarLinks } from '../../shared/fuzzyMatch';
import { parseGoInput, resolveShortUrl } from '../../shared/resolver';
import { DEFAULT_CATEGORIES } from '../../shared/seedData';
import { AuditAction } from '../../shared/types/audit';
import { User } from '../../shared/types/auth';
import { CreateLinkInput, GoLink, ResolveResult, UpdateLinkInput } from '../../shared/types/link';
import { normalizeShortName, validateShortNameFormat } from '../../shared/validation';
import { conflict, forbidden, notFound } from '../errors';
import { recordAuditEvent } from '../repositories/auditRepository';
import {
  deleteLinkById,
  getLinkById,
  getLinkByShortName,
  insertLink,
  listLinks,
  recordLinkClick,
  saveLink,
} from '../repositories/linkRepository';
import { parseCreateLinkInput } from './linkInput';

/** Same rule as the client's canUserManageLink: admins manage everything, employees their own links. */
export function canManageLink(actor: User, link: { owner: string }): boolean {
  return actor.role === 'admin' || actor.email.toLowerCase() === link.owner.toLowerCase();
}

function duplicateError(existing: GoLink) {
  return conflict(`go/${existing.shortName} already exists and is owned by ${existing.owner}.`);
}

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === 'SQLITE_CONSTRAINT_UNIQUE';
}

export function checkShortNameAvailable(
  db: Database.Database,
  shortName: string,
  excludeId?: string
): { valid: boolean; error?: string } {
  const format = validateShortNameFormat(shortName);
  if (!format.valid) return format;
  const existing = getLinkByShortName(db, normalizeShortName(shortName));
  if (existing && existing.id !== excludeId) {
    return { valid: false, error: `go/${existing.shortName} already exists and is owned by ${existing.owner}.` };
  }
  return { valid: true };
}

export interface LinkQuery {
  query?: string;
  category?: string;
  visibility?: string;
  isActive?: boolean;
  shortName?: string;
  sortBy?: 'clicks' | 'recent' | 'name' | 'lastAccessed';
  sortOrder?: 'asc' | 'desc';
}

/** Filtering and sorting identical to the original localStorage implementation. */
export function queryLinks(db: Database.Database, params: LinkQuery = {}): GoLink[] {
  let links = listLinks(db);

  if (params.shortName) {
    const normalized = normalizeShortName(params.shortName);
    links = links.filter((l) => l.shortName.toLowerCase() === normalized);
  }

  if (params.category && params.category !== 'All') {
    links = links.filter((link) => link.category.toLowerCase() === params.category?.toLowerCase());
  }

  if (params.visibility && params.visibility !== 'all') {
    links = links.filter((link) => link.visibility === params.visibility);
  }

  if (params.isActive !== undefined) {
    links = links.filter((link) => link.isActive === params.isActive);
  }

  if (params.query && params.query.trim()) {
    const q = params.query.toLowerCase().trim().replace(/^go\//, '');
    links = links.filter((link) => {
      const matchShort = link.shortName.toLowerCase().includes(q);
      const matchDesc = (link.description || '').toLowerCase().includes(q);
      const matchUrl = link.targetUrl.toLowerCase().includes(q);
      const matchOwner = link.owner.toLowerCase().includes(q);
      const matchCat = link.category.toLowerCase().includes(q);
      const matchTags = (link.tags || []).some((t) => t.toLowerCase().includes(q));
      return matchShort || matchDesc || matchUrl || matchOwner || matchCat || matchTags;
    });
  }

  // Each comparison below already yields the field's natural order (most clicks / newest / A→Z);
  // "asc" reverses it. The UI relies on this, so the default is always "desc".
  const sortBy = params.sortBy || 'clicks';
  const order = params.sortOrder || 'desc';

  links.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'clicks') {
      comparison = b.clickCount - a.clickCount;
    } else if (sortBy === 'recent') {
      comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === 'lastAccessed') {
      const timeA = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
      const timeB = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
      comparison = timeB - timeA;
    } else if (sortBy === 'name') {
      comparison = a.shortName.localeCompare(b.shortName);
    }
    return order === 'asc' ? -comparison : comparison;
  });

  return links;
}

export function getCategories(db: Database.Database): string[] {
  const set = new Set<string>(DEFAULT_CATEGORIES);
  const rows = db.prepare('SELECT DISTINCT category FROM links ORDER BY category').all() as Array<{
    category: string;
  }>;
  rows.forEach((r) => r.category && set.add(r.category));
  return Array.from(set);
}

export function createLink(db: Database.Database, input: CreateLinkInput, actor: User): GoLink {
  const existing = getLinkByShortName(db, input.shortName);
  if (existing) throw duplicateError(existing);

  const now = new Date().toISOString();
  const link: GoLink = {
    id: 'link_' + randomUUID(),
    shortName: input.shortName,
    targetUrl: input.targetUrl,
    description: input.description || '',
    category: input.category || 'General',
    // Employees always own what they create; only admins may assign another owner.
    owner: actor.role === 'admin' && input.owner ? input.owner : actor.email,
    visibility: input.visibility || 'public',
    isActive: input.isActive !== undefined ? input.isActive : true,
    clickCount: 0,
    lastAccessedAt: null,
    createdAt: now,
    updatedAt: now,
    tags: input.tags || [],
  };

  try {
    db.transaction(() => {
      insertLink(db, link);
      recordAuditEvent(db, {
        actor,
        action: 'create',
        linkId: link.id,
        shortName: link.shortName,
        newValues: {
          shortName: link.shortName,
          targetUrl: link.targetUrl,
          category: link.category,
          owner: link.owner,
          visibility: link.visibility,
        },
        notes: 'Created new shortcut',
      });
    })();
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict(`go/${link.shortName} already exists.`);
    throw err;
  }

  return link;
}

export function updateLink(db: Database.Database, id: string, input: UpdateLinkInput, actor: User): GoLink {
  const current = getLinkById(db, id);
  if (!current) throw notFound(`Link with ID "${id}" was not found.`);
  if (!canManageLink(actor, current)) throw forbidden('You can only edit shortcuts you own.');

  const oldValues: Partial<GoLink> = { ...current };
  const next: GoLink = { ...current };
  let auditAction: AuditAction = 'edit';
  let auditNotes = 'Updated shortcut configuration';

  if (input.shortName && input.shortName !== current.shortName) {
    const existing = getLinkByShortName(db, input.shortName);
    if (existing && existing.id !== id) throw duplicateError(existing);
    next.shortName = input.shortName;
  }
  if (input.targetUrl !== undefined) next.targetUrl = input.targetUrl;
  if (input.description !== undefined) next.description = input.description;
  if (input.category !== undefined) next.category = input.category;

  if (input.owner !== undefined && input.owner.toLowerCase() !== current.owner.toLowerCase()) {
    if (actor.role !== 'admin') throw forbidden('Only administrators can reassign link ownership.');
    auditAction = 'reassign_owner';
    auditNotes = `Ownership reassigned from ${current.owner} to ${input.owner}`;
    next.owner = input.owner;
  }

  if (input.visibility !== undefined) next.visibility = input.visibility;

  if (input.isActive !== undefined && input.isActive !== current.isActive) {
    next.isActive = input.isActive;
    auditAction = input.isActive ? 'activate' : 'deactivate';
    auditNotes = input.isActive ? 'Reactivated shortcut' : 'Deactivated / disabled shortcut';
  }

  if (input.tags !== undefined) next.tags = input.tags;
  next.updatedAt = new Date().toISOString();

  try {
    db.transaction(() => {
      saveLink(db, next);
      recordAuditEvent(db, {
        actor,
        action: auditAction,
        linkId: next.id,
        shortName: next.shortName,
        oldValues,
        newValues: { ...next },
        notes: auditNotes,
      });
    })();
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict(`go/${next.shortName} already exists.`);
    throw err;
  }

  return next;
}

export function deleteLink(db: Database.Database, id: string, actor: User): void {
  const existing = getLinkById(db, id);
  if (!existing) throw notFound(`Link with ID "${id}" was not found.`);
  if (!canManageLink(actor, existing)) throw forbidden('You can only delete shortcuts you own.');

  db.transaction(() => {
    deleteLinkById(db, id);
    recordAuditEvent(db, {
      actor,
      action: 'delete',
      linkId: id,
      shortName: existing.shortName,
      oldValues: existing,
      notes: `Permanently removed go/${existing.shortName}`,
    });
  })();
}

export interface ImportResult {
  imported: number;
  created: number;
  updated: number;
  skipped: Array<{ index: number; shortName: string; error: string }>;
}

/**
 * Imports links in one transaction.
 * - mode "create": new links only; rows whose shortName already exists are skipped.
 * - mode "upsert": rows whose shortName exists replace that link (keeping its id).
 * Every row is validated with the same rules as POST /api/links; invalid rows are skipped and reported.
 */
export function importLinks(
  db: Database.Database,
  items: unknown[],
  mode: 'create' | 'upsert',
  actor: User
): ImportResult {
  const result: ImportResult = { imported: 0, created: 0, updated: 0, skipped: [] };
  const now = new Date().toISOString();

  db.transaction(() => {
    items.forEach((raw, index) => {
      const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
      const label = typeof item.shortName === 'string' ? item.shortName : '';
      let input: CreateLinkInput;
      try {
        input = parseCreateLinkInput(item);
      } catch (err) {
        result.skipped.push({ index, shortName: label, error: (err as Error).message });
        return;
      }

      const existing = getLinkByShortName(db, input.shortName);
      if (existing && mode === 'create') {
        result.skipped.push({ index, shortName: input.shortName, error: `go/${input.shortName} already exists.` });
        return;
      }

      const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
      const date = (v: unknown) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : null);

      const link: GoLink = {
        id: existing?.id ?? 'link_' + randomUUID(),
        shortName: input.shortName,
        targetUrl: input.targetUrl,
        description: input.description || '',
        category: input.category || 'General',
        owner: input.owner || actor.email,
        visibility: input.visibility,
        isActive: input.isActive ?? true,
        clickCount: mode === 'upsert' ? num(item.clickCount) || existing?.clickCount || 0 : 0,
        lastAccessedAt: mode === 'upsert' ? date(item.lastAccessedAt) ?? existing?.lastAccessedAt ?? null : null,
        createdAt: (mode === 'upsert' && date(item.createdAt)) || existing?.createdAt || now,
        updatedAt: now,
        tags: input.tags || [],
      };

      if (existing) {
        saveLink(db, link);
        result.updated++;
      } else {
        insertLink(db, link);
        result.created++;
      }
      result.imported++;
    });

    if (result.imported > 0) {
      recordAuditEvent(db, {
        actor,
        action: 'bulk_import',
        linkId: 'bulk_batch',
        shortName: `batch (${result.imported} links)`,
        notes: `Imported ${result.imported} shortcuts (${result.created} created, ${result.updated} updated, ${result.skipped.length} skipped)`,
      });
    }
  })();

  return result;
}

function isSafeRedirectTarget(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Resolves a go-link path with the shared resolver, recording the click on success.
 * Returns the same shape the React RedirectPage expects.
 */
export function resolveGoLink(
  db: Database.Database,
  rawPath: string,
  options: { recordClick?: boolean } = {}
): ResolveResult {
  const links = listLinks(db);
  const resolution = resolveShortUrl(rawPath, links);

  if (resolution.status === 'success' && isSafeRedirectTarget(resolution.resolvedUrl)) {
    let link = resolution.link;
    if (options.recordClick !== false) {
      const at = new Date().toISOString();
      recordLinkClick(db, link.id, at);
      link = { ...link, clickCount: link.clickCount + 1, lastAccessedAt: at };
    }
    return {
      found: true,
      isDisabled: false,
      link,
      resolvedUrl: resolution.resolvedUrl,
      isParameterMatch: resolution.isParameterMatch,
      suffix: resolution.remainder,
      matchedPrefix: resolution.matchedPrefix,
    };
  }

  const activeLinks = links.filter((l) => l.isActive);

  if (resolution.status === 'inactive') {
    return {
      found: false,
      isDisabled: true,
      link: resolution.link,
      owner: resolution.owner,
      attempted: resolution.attemptedPath,
      suggestions: findSimilarLinks(resolution.attemptedPath, activeLinks),
      inactiveLink: resolution.link,
    };
  }

  const parsed = parseGoInput(rawPath);
  return {
    found: false,
    isDisabled: false,
    attempted: parsed.originalCasePath || rawPath,
    suggestions: findSimilarLinks(parsed.cleanPath, activeLinks),
  };
}

export function getStats(db: Database.Database) {
  const totals = db
    .prepare(
      `SELECT COUNT(*) AS totalLinks,
              COALESCE(SUM(is_active), 0) AS activeLinks,
              COALESCE(SUM(click_count), 0) AS totalClicks
       FROM links`
    )
    .get() as { totalLinks: number; activeLinks: number; totalClicks: number };

  const byCategory = db
    .prepare(
      `SELECT category, COUNT(*) AS links, COALESCE(SUM(click_count), 0) AS clicks
       FROM links GROUP BY category ORDER BY clicks DESC`
    )
    .all();

  const pick = (l: GoLink) => ({
    id: l.id,
    shortName: l.shortName,
    clickCount: l.clickCount,
    lastAccessedAt: l.lastAccessedAt,
    createdAt: l.createdAt,
  });
  const top = queryLinks(db, { sortBy: 'clicks' }).slice(0, 10).map(pick);
  const recent = queryLinks(db, { sortBy: 'recent' }).slice(0, 10).map(pick);

  return {
    totalLinks: totals.totalLinks,
    activeLinks: totals.activeLinks,
    inactiveLinks: totals.totalLinks - totals.activeLinks,
    totalClicks: totals.totalClicks,
    byCategory,
    topLinks: top,
    recentlyCreated: recent,
    generatedAt: new Date().toISOString(),
  };
}
