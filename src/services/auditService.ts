import { AuditFilterParams, AuditLogEntry } from '../types/audit';
import { apiRequest, buildQuery } from './apiClient';

// Audit events are written by the server as part of each link mutation (see server/services/linkService.ts).

/**
 * Query audit logs with filters (admin only).
 */
export async function getAuditLogs(params?: AuditFilterParams): Promise<AuditLogEntry[]> {
  return apiRequest<AuditLogEntry[]>(`/audit${buildQuery({ ...params })}`);
}

