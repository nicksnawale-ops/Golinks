/** Browser demo: same exports as server/repositories/linkRepository.ts, backed by DemoDB. */
import { GoLink } from '../../../shared/types/link';
import type { DemoDB } from '../store';

const copy = (l: GoLink): GoLink => ({ ...l, tags: [...(l.tags ?? [])] });

export function listLinks(db: DemoDB): GoLink[] {
  return db.state.links.map(copy);
}

export function listLinkCategories(db: DemoDB): string[] {
  return Array.from(new Set(db.state.links.map((l) => l.category))).sort();
}

export function getLinkById(db: DemoDB, id: string): GoLink | null {
  const l = db.state.links.find((x) => x.id === id);
  return l ? copy(l) : null;
}

export function getLinkByShortName(db: DemoDB, shortName: string): GoLink | null {
  const n = shortName.toLowerCase();
  const l = db.state.links.find((x) => x.shortName.toLowerCase() === n);
  return l ? copy(l) : null;
}

function uniqueViolation(): Error {
  // Same shape the server checks for, so its conflict handling applies unchanged.
  return Object.assign(new Error('UNIQUE constraint failed: links.short_name'), { code: 'SQLITE_CONSTRAINT_UNIQUE' });
}

export function insertLink(db: DemoDB, link: GoLink): void {
  if (getLinkByShortName(db, link.shortName)) throw uniqueViolation();
  db.state.links.push(copy(link));
}

export function saveLink(db: DemoDB, link: GoLink): void {
  const clash = getLinkByShortName(db, link.shortName);
  if (clash && clash.id !== link.id) throw uniqueViolation();
  const i = db.state.links.findIndex((x) => x.id === link.id);
  if (i !== -1) db.state.links[i] = copy(link);
}

export function deleteLinkById(db: DemoDB, id: string): boolean {
  const before = db.state.links.length;
  db.state.links = db.state.links.filter((l) => l.id !== id);
  // Like the server's ON DELETE CASCADE.
  db.state.clicks = db.state.clicks.filter((c) => c.linkId !== id);
  return db.state.links.length < before;
}

export function recordLinkClick(db: DemoDB, id: string, at = new Date().toISOString()): void {
  const l = db.state.links.find((x) => x.id === id);
  if (l) {
    l.clickCount += 1;
    l.lastAccessedAt = at;
  }
}
