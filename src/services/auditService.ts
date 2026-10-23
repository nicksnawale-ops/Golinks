import { AuditFilterParams, AuditLogEntry } from '../types/audit';
import { apiRequest, buildQuery } from './apiClient';

// Audit events are written by the server as part of each link mutation (see server/services/linkService.ts).

/**
 * Query audit logs with filters (admin only).
 */
export async function getAuditLogs(params?: AuditFilterParams): Promise<AuditLogEntry[]> {
  return apiRequest<AuditLogEntry[]>(`/audit${buildQuery({ ...params })}`);
}

/**
 * Clear or reset audit logs (admin only; the server must have ALLOW_DATA_RESET=true).
 */
export async function clearAuditLogs(): Promise<void> {
  await apiRequest<void>('/audit', { method: 'DELETE' });
}

export async function resetAuditLogs(): Promise<void> {
  await apiRequest<void>('/audit/reset', { method: 'POST' });
}
