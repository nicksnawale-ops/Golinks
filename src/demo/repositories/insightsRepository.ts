/** Browser demo: same exports as server/repositories/insightsRepository.ts, backed by DemoDB. */
import type { DemoDB } from '../store';

export interface MissingLinkRequest {
  shortName: string;
  requestCount: number;
  firstRequestedAt: string;
  lastRequestedAt: string;
}

export interface DailyClicks {
  date: string;
  clicks: number;
  uniqueUsers: number;
}

export function recordNotFound(db: DemoDB, shortName: string, at = new Date().toISOString()): void {
  const e = db.state.notFound[shortName];
  db.state.notFound[shortName] = e
    ? { ...e, requestCount: e.requestCount + 1, lastRequestedAt: at }
    : { requestCount: 1, firstRequestedAt: at, lastRequestedAt: at };
}

export function listMissingLinks(db: DemoDB, limit = 50): MissingLinkRequest[] {
  const existing = new Set(db.state.links.map((l) => l.shortName.toLowerCase()));
  for (const name of Object.keys(db.state.notFound)) if (existing.has(name)) delete db.state.notFound[name];
  return Object.entries(db.state.notFound)
    .map(([shortName, e]) => ({ shortName, ...e }))
    .sort((a, b) => b.requestCount - a.requestCount || (a.lastRequestedAt < b.lastRequestedAt ? 1 : -1))
    .slice(0, limit);
}

export function dismissMissingLink(db: DemoDB, shortName: string): boolean {
  const key = shortName.toLowerCase();
  if (!(key in db.state.notFound)) return false;
  delete db.state.notFound[key];
  return true;
}

export function recordClickEvent(db: DemoDB, linkId: string, userId: string | null, at = new Date().toISOString()): void {
  db.state.clicks.push({ linkId, userId, timestamp: at });
}

export function getDailyClicks(db: DemoDB, days: number, linkIds?: string[]): DailyClicks[] {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end.getTime() - (days - 1) * 86_400_000);
  const startIso = start.toISOString();
  const allowed = linkIds ? new Set(linkIds) : null;

  const byDate = new Map<string, { clicks: number; users: Set<string> }>();
  for (const c of db.state.clicks) {
    if (c.timestamp < startIso || (allowed && !allowed.has(c.linkId))) continue;
    const day = c.timestamp.slice(0, 10);
    const entry = byDate.get(day) ?? { clicks: 0, users: new Set<string>() };
    entry.clicks++;
    if (c.userId) entry.users.add(c.userId);
    byDate.set(day, entry);
  }

  return Array.from({ length: days }, (_, i) => {
    const date = new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    const hit = byDate.get(date);
    return { date, clicks: hit?.clicks ?? 0, uniqueUsers: hit?.users.size ?? 0 };
  });
}

export function pruneClickEvents(db: DemoDB, retentionDays: number): number {
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000).toISOString();
  const before = db.state.clicks.length;
  db.state.clicks = db.state.clicks.filter((c) => c.timestamp >= cutoff);
  return before - db.state.clicks.length;
}
