import { AuditAction, AuditFilterParams, AuditLogEntry } from '../types/audit';
import { User } from '../types/auth';
import { GoLink } from '../types/link';

const AUDIT_STORAGE_KEY = 'golinks_audit_logs_v1';

const delay = (ms = 20): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const SEED_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit_01_seed',
    timestamp: '2025-01-10T08:00:00.000Z',
    actorEmail: 'admin@company.internal',
    actorName: 'Alex Rivera (Admin)',
    actorRole: 'admin',
    linkId: 'seed-01-hr',
    shortName: 'hr',
    action: 'create',
    newValues: {
      shortName: 'hr',
      targetUrl: 'https://workday.company.internal/hr/portal',
      category: 'HR',
      owner: 'hr-ops@company.internal',
      isActive: true,
    },
    notes: 'Initial company-wide shortcut created',
  },
  {
    id: 'audit_02_seed',
    timestamp: '2025-04-12T14:10:00.000Z',
    actorEmail: 'payroll@company.internal',
    actorName: 'David Chen',
    actorRole: 'employee',
    linkId: 'seed-02-payroll',
    shortName: 'payroll',
    action: 'edit',
    oldValues: {
      targetUrl: 'https://adp.company.internal/portal/legacy',
    },
    newValues: {
      targetUrl: 'https://adp.company.internal/portal/payroll',
    },
    notes: 'Updated payroll portal endpoint to new ADP SSO gateway',
  },
  {
    id: 'audit_03_seed',
    timestamp: '2025-08-20T14:00:00.000Z',
    actorEmail: 'admin@company.internal',
    actorName: 'Alex Rivera (Admin)',
    actorRole: 'admin',
    linkId: 'seed-06b-emp',
    shortName: 'emp',
    action: 'create',
    newValues: {
      shortName: 'emp',
      targetUrl: 'https://hrms.local/employee?id=%s',
      category: 'HR',
      owner: 'people-ops@company.internal',
    },
    notes: 'Configured parameterized employee lookup (%s)',
  },
];

function loadAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(SEED_AUDIT_LOGS));
      return SEED_AUDIT_LOGS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_AUDIT_LOGS;
  } catch (err) {
    console.error('Failed to load audit logs', err);
    return SEED_AUDIT_LOGS;
  }
}

function saveAuditLogs(logs: AuditLogEntry[]): void {
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save audit logs', err);
  }
}

/**
 * Record a new audit log event.
 */
export async function recordAuditEvent(params: {
  actor: User;
  action: AuditAction;
  linkId: string;
  shortName: string;
  oldValues?: Partial<GoLink>;
  newValues?: Partial<GoLink>;
  notes?: string;
}): Promise<AuditLogEntry> {
  await delay(15);
  const logs = loadAuditLogs();

  const entry: AuditLogEntry = {
    id: 'audit_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
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

  logs.unshift(entry);
  // Cap at 1000 items to prevent storage bloat
  if (logs.length > 1000) logs.pop();

  saveAuditLogs(logs);
  return entry;
}

/**
 * Query audit logs with filters.
 */
export async function getAuditLogs(params?: AuditFilterParams): Promise<AuditLogEntry[]> {
  await delay(25);
  let logs = loadAuditLogs();

  if (params?.action && params.action !== 'all') {
    logs = logs.filter((l) => l.action === params.action);
  }

  if (params?.actor && params.actor.trim()) {
    const q = params.actor.toLowerCase().trim();
    logs = logs.filter(
      (l) => l.actorEmail.toLowerCase().includes(q) || l.actorName.toLowerCase().includes(q)
    );
  }

  if (params?.shortName && params.shortName.trim()) {
    const q = params.shortName.toLowerCase().trim().replace(/^go\//, '');
    logs = logs.filter((l) => l.shortName.toLowerCase().includes(q));
  }

  return logs;
}

/**
 * Clear or reset audit logs.
 */
export async function clearAuditLogs(): Promise<void> {
  await delay(20);
  saveAuditLogs([]);
}

export async function resetAuditLogs(): Promise<void> {
  await delay(20);
  saveAuditLogs(SEED_AUDIT_LOGS);
}
