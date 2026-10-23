import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { AuditAction, AuditFilterParams, AuditLogEntry } from '../../shared/types/audit';
import { User, UserRole } from '../../shared/types/auth';
import { GoLink } from '../../shared/types/link';

interface AuditRow {
  id: string;
  timestamp: string;
  actor_email: string;
  actor_name: string;
  actor_role: UserRole;
  link_id: string;
  short_name: string;
  action: AuditAction;
  old_values: string | null;
  new_values: string | null;
  notes: string | null;
}

function parseJson(raw: string | null): Partial<GoLink> | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function rowToEntry(row: AuditRow): AuditLogEntry {
  return {
    id: row.id,
    timestamp: row.timestamp,
    actorEmail: row.actor_email,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    linkId: row.link_id,
    shortName: row.short_name,
    action: row.action,
    oldValues: parseJson(row.old_values),
    newValues: parseJson(row.new_values),
    notes: row.notes ?? undefined,
  };
}

export function insertAuditEntry(db: Database.Database, entry: AuditLogEntry): void {
  db.prepare(
    `INSERT INTO audit_log (id, timestamp, actor_email, actor_name, actor_role, link_id, short_name,
       action, old_values, new_values, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    entry.id,
    entry.timestamp,
    entry.actorEmail,
    entry.actorName,
    entry.actorRole,
    entry.linkId,
    entry.shortName,
    entry.action,
    entry.oldValues ? JSON.stringify(entry.oldValues) : null,
    entry.newValues ? JSON.stringify(entry.newValues) : null,
    entry.notes ?? null
  );
}

export function recordAuditEvent(
  db: Database.Database,
  params: {
    actor: User;
    action: AuditAction;
    linkId: string;
    shortName: string;
    oldValues?: Partial<GoLink>;
    newValues?: Partial<GoLink>;
    notes?: string;
  }
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: 'audit_' + randomUUID(),
    timestamp: new Date().toISOString(),
    actorEmail: params.actor.email,
    actorName: params.actor.name,
    actorRole: params.actor.role,
    linkId: params.linkId,
    shortName: params.shortName,
    action: params.action,
    oldValues: params.oldValues,
    newValues: params.newValues,
    notes: params.notes,
  };
  insertAuditEntry(db, entry);
  return entry;
}

export function queryAuditLog(
  db: Database.Database,
  params: AuditFilterParams & { limit?: number } = {}
): AuditLogEntry[] {
  const where: string[] = [];
  const args: Record<string, string | number> = {};

  if (params.action && params.action !== 'all') {
    where.push('action = @action');
    args.action = params.action;
  }
  if (params.actor && params.actor.trim()) {
    where.push("(lower(actor_email) LIKE @actor ESCAPE '\\' OR lower(actor_name) LIKE @actor ESCAPE '\\')");
    args.actor = `%${escapeLike(params.actor.toLowerCase().trim())}%`;
  }
  if (params.shortName && params.shortName.trim()) {
    where.push("lower(short_name) LIKE @shortName ESCAPE '\\'");
    args.shortName = `%${escapeLike(params.shortName.toLowerCase().trim().replace(/^go\//, ''))}%`;
  }
  if (params.dateFrom) {
    where.push('timestamp >= @dateFrom');
    args.dateFrom = params.dateFrom;
  }
  if (params.dateTo) {
    where.push('timestamp <= @dateTo');
    args.dateTo = params.dateTo;
  }
  args.limit = Math.min(Math.max(params.limit ?? 1000, 1), 10000);

  const sql = `SELECT * FROM audit_log ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY timestamp DESC LIMIT @limit`;
  return (db.prepare(sql).all(args) as AuditRow[]).map(rowToEntry);
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => '\\' + c);
}
