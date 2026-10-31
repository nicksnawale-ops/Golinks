import type Database from 'better-sqlite3';

// ---- Missing links ----------------------------------------------------------

export interface MissingLinkRequest {
  shortName: string;
  requestCount: number;
  firstRequestedAt: string;
  lastRequestedAt: string;
}

/** Records a go/<name> request that matched no link (upsert + increment). */
export function recordNotFound(db: Database.Database, shortName: string, at = new Date().toISOString()): void {
  db.prepare(
    `INSERT INTO not_found_requests (short_name, request_count, first_requested_at, last_requested_at)
     VALUES (?, 1, ?, ?)
     ON CONFLICT(short_name) DO UPDATE SET request_count = request_count + 1, last_requested_at = excluded.last_requested_at`
  ).run(shortName, at, at);
}

/**
 * Most-requested missing names. Names that have since been created as links are left out
 * (and cleaned up), so the list only ever shows real gaps.
 */
export function listMissingLinks(db: Database.Database, limit = 50): MissingLinkRequest[] {
  db.prepare(
    `DELETE FROM not_found_requests
     WHERE short_name IN (SELECT lower(short_name) FROM links)`
  ).run();
  const rows = db
    .prepare(
      `SELECT short_name, request_count, first_requested_at, last_requested_at
       FROM not_found_requests ORDER BY request_count DESC, last_requested_at DESC LIMIT ?`
    )
    .all(limit) as Array<{
    short_name: string;
    request_count: number;
    first_requested_at: string;
    last_requested_at: string;
  }>;
  return rows.map((r) => ({
    shortName: r.short_name,
    requestCount: r.request_count,
    firstRequestedAt: r.first_requested_at,
    lastRequestedAt: r.last_requested_at,
  }));
}

export function dismissMissingLink(db: Database.Database, shortName: string): boolean {
  return db.prepare('DELETE FROM not_found_requests WHERE short_name = ?').run(shortName.toLowerCase()).changes > 0;
}

// ---- Click history ----------------------------------------------------------

export function recordClickEvent(
  db: Database.Database,
  linkId: string,
  userId: string | null,
  at = new Date().toISOString()
): void {
  db.prepare('INSERT INTO click_events (link_id, user_id, timestamp) VALUES (?, ?, ?)').run(linkId, userId, at);
}

export interface DailyClicks {
  date: string; // YYYY-MM-DD (UTC)
  clicks: number;
  uniqueUsers: number;
}

/**
 * Clicks per UTC day for the last `days` days (oldest first, zero-filled).
 * Pass linkIds to restrict to those links; an empty array yields all zeros.
 */
export function getDailyClicks(db: Database.Database, days: number, linkIds?: string[]): DailyClicks[] {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end.getTime() - (days - 1) * 86_400_000);

  const byDate = new Map<string, { clicks: number; uniqueUsers: number }>();
  if (!linkIds || linkIds.length > 0) {
    const filter = linkIds ? `AND link_id IN (SELECT value FROM json_each(?))` : '';
    const params: unknown[] = [start.toISOString()];
    if (linkIds) params.push(JSON.stringify(linkIds));
    const rows = db
      .prepare(
        `SELECT substr(timestamp, 1, 10) AS day, COUNT(*) AS clicks, COUNT(DISTINCT user_id) AS users
         FROM click_events WHERE timestamp >= ? ${filter}
         GROUP BY day`
      )
      .all(...params) as Array<{ day: string; clicks: number; users: number }>;
    rows.forEach((r) => byDate.set(r.day, { clicks: r.clicks, uniqueUsers: r.users }));
  }

  const series: DailyClicks[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    const hit = byDate.get(date);
    series.push({ date, clicks: hit?.clicks ?? 0, uniqueUsers: hit?.uniqueUsers ?? 0 });
  }
  return series;
}

export function pruneClickEvents(db: Database.Database, retentionDays: number): number {
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000).toISOString();
  return db.prepare('DELETE FROM click_events WHERE timestamp < ?').run(cutoff).changes;
}
