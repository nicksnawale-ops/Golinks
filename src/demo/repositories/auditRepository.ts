/** Browser demo: same exports as server/repositories/auditRepository.ts, backed by DemoDB. */
import { AuditAction, AuditFilterParams, AuditLogEntry } from '../../../shared/types/audit';
import { User } from '../../../shared/types/auth';
import { GoLink } from '../../../shared/types/link';
import type { DemoDB } from '../store';
import { randomUUID } from '../../../shared/uuid';

export function insertAuditEntry(db: DemoDB, entry: AuditLogEntry): void {
  db.state.audit.push(entry);
}

export function recordAuditEvent(
  db: DemoDB,
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

export function queryAuditLog(db: DemoDB, params: AuditFilterParams & { limit?: number } = {}): AuditLogEntry[] {
  const actor = params.actor?.toLowerCase().trim();
  const short = params.shortName?.toLowerCase().trim().replace(/^go\//, '');
  const limit = Math.min(Math.max(params.limit ?? 1000, 1), 10000);
  return db.state.audit
    .filter((e) => !params.action || params.action === 'all' || e.action === params.action)
    .filter((e) => !actor || e.actorEmail.toLowerCase().includes(actor) || e.actorName.toLowerCase().includes(actor))
    .filter((e) => !short || e.shortName.toLowerCase().includes(short))
    .filter((e) => !params.dateFrom || e.timestamp >= params.dateFrom)
    .filter((e) => !params.dateTo || e.timestamp <= params.dateTo)
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    .slice(0, limit)
    .map((e) => ({ ...e }));
}
