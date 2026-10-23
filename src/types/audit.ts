import { UserRole } from './auth';
import { GoLink } from './link';

export type AuditAction =
  | 'create'
  | 'edit'
  | 'delete'
  | 'deactivate'
  | 'activate'
  | 'reassign_owner'
  | 'bulk_import';

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO date
  actorEmail: string;
  actorName: string;
  actorRole: UserRole;
  linkId: string;
  shortName: string;
  action: AuditAction;
  oldValues?: Partial<GoLink>;
  newValues?: Partial<GoLink>;
  notes?: string;
}

export interface AuditFilterParams {
  action?: string;
  actor?: string;
  shortName?: string;
  dateFrom?: string;
  dateTo?: string;
}
