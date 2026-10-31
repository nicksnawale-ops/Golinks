import type Database from 'better-sqlite3';
import { GoLink } from '../../shared/types/link';

interface LinkRow {
  id: string;
  short_name: string;
  target_url: string;
  description: string;
  category: string;
  owner: string;
  visibility: 'public' | 'private';
  is_active: number;
  click_count: number;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string;
  tags: string;
}

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

export function rowToLink(row: LinkRow): GoLink {
  return {
    id: row.id,
    shortName: row.short_name,
    targetUrl: row.target_url,
    description: row.description,
    category: row.category,
    owner: row.owner,
    visibility: row.visibility,
    isActive: row.is_active === 1,
    clickCount: row.click_count,
    lastAccessedAt: row.last_accessed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: parseTags(row.tags),
  };
}

function linkToParams(link: GoLink) {
  return {
    id: link.id,
    short_name: link.shortName,
    target_url: link.targetUrl,
    description: link.description ?? '',
    category: link.category,
    owner: link.owner,
    visibility: link.visibility,
    is_active: link.isActive ? 1 : 0,
    click_count: link.clickCount,
    last_accessed_at: link.lastAccessedAt,
    created_at: link.createdAt,
    updated_at: link.updatedAt,
    tags: JSON.stringify(link.tags ?? []),
  };
}

export function listLinks(db: Database.Database): GoLink[] {
  return (db.prepare('SELECT * FROM links').all() as LinkRow[]).map(rowToLink);
}

export function getLinkById(db: Database.Database, id: string): GoLink | null {
  const row = db.prepare('SELECT * FROM links WHERE id = ?').get(id) as LinkRow | undefined;
  return row ? rowToLink(row) : null;
}

export function getLinkByShortName(db: Database.Database, shortName: string): GoLink | null {
  const row = db
    .prepare('SELECT * FROM links WHERE lower(short_name) = lower(?)')
    .get(shortName) as LinkRow | undefined;
  return row ? rowToLink(row) : null;
}

export function insertLink(db: Database.Database, link: GoLink): void {
  db.prepare(
    `INSERT INTO links (id, short_name, target_url, description, category, owner, visibility,
       is_active, click_count, last_accessed_at, created_at, updated_at, tags)
     VALUES (@id, @short_name, @target_url, @description, @category, @owner, @visibility,
       @is_active, @click_count, @last_accessed_at, @created_at, @updated_at, @tags)`
  ).run(linkToParams(link));
}

export function saveLink(db: Database.Database, link: GoLink): void {
  db.prepare(
    `UPDATE links SET short_name = @short_name, target_url = @target_url, description = @description,
       category = @category, owner = @owner, visibility = @visibility, is_active = @is_active,
       click_count = @click_count, last_accessed_at = @last_accessed_at, created_at = @created_at,
       updated_at = @updated_at, tags = @tags
     WHERE id = @id`
  ).run(linkToParams(link));
}

export function deleteLinkById(db: Database.Database, id: string): boolean {
  return db.prepare('DELETE FROM links WHERE id = ?').run(id).changes > 0;
}

/** Atomically increments clickCount and stamps lastAccessedAt. */
export function recordLinkClick(db: Database.Database, id: string, at = new Date().toISOString()): void {
  db.prepare('UPDATE links SET click_count = click_count + 1, last_accessed_at = ? WHERE id = ?').run(at, id);
}
