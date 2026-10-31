/**
 * Browser demo backend: storage.
 *
 * On hosts that only serve static files (e.g. Vercel), GoLinks runs its server logic in the browser
 * against this store instead of SQLite. Everything is kept in this browser's localStorage, so each
 * visitor gets their own copy of the sample data. The real server never uses this file.
 */
import { SEED_AUDIT_LOGS, SEED_LINKS } from '../../shared/seedData';
import { AuditLogEntry } from '../../shared/types/audit';
import { MOCK_USERS, User } from '../../shared/types/auth';
import { GoLink } from '../../shared/types/link';

export interface DemoUser extends User {
  password: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface DemoState {
  version: 1;
  links: GoLink[];
  users: DemoUser[];
  audit: AuditLogEntry[];
  notFound: Record<string, { requestCount: number; firstRequestedAt: string; lastRequestedAt: string }>;
  clicks: Array<{ linkId: string; userId: string | null; timestamp: string }>;
  sessionUserId: string | null;
}

/** Same demo accounts and passwords as the server's DEMO_MODE. */
export const DEMO_PASSWORDS: Record<string, { label: string; password: string }> = {
  user_admin: { label: 'Demo admin', password: 'Admin@12345' },
  user_nikhil: { label: 'Demo employee', password: 'Employee@12345' },
};

const STORAGE_KEY = 'golinks_browser_demo_v1';
const MAX_CLICK_EVENTS = 5000;

function freshState(): DemoState {
  const now = new Date().toISOString();
  return {
    version: 1,
    links: SEED_LINKS.map((l) => ({ ...l })),
    users: MOCK_USERS.map((u) => ({
      ...u,
      password: DEMO_PASSWORDS[u.id]?.password ?? null,
      isActive: true,
      lastLoginAt: null,
      createdAt: now,
    })),
    audit: SEED_AUDIT_LOGS.map((a) => ({ ...a })),
    notFound: {},
    clicks: [],
    sessionUserId: null,
  };
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.links)) return parsed;
    }
  } catch {
    // storage unavailable or corrupt: start fresh
  }
  return freshState();
}

/**
 * Stand-in for the server's better-sqlite3 handle. Server services call db.transaction(fn);
 * here that runs fn on the in-memory state, rolls back on error, and saves on success.
 */
export class DemoDB {
  state: DemoState = load();
  private depth = 0;

  save(): void {
    if (this.state.clicks.length > MAX_CLICK_EVENTS) {
      this.state.clicks = this.state.clicks.slice(-MAX_CLICK_EVENTS);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // private mode / quota: keep working in memory
    }
  }

  transaction<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
    return (...args: A) => {
      if (this.depth > 0) return fn(...args);
      const snapshot = JSON.stringify(this.state);
      this.depth++;
      try {
        const result = fn(...args);
        this.depth--;
        this.save();
        return result;
      } catch (err) {
        this.depth--;
        this.state = JSON.parse(snapshot);
        throw err;
      }
    };
  }

  /** Runs a write outside a service transaction and saves it. */
  mutate<R>(fn: (state: DemoState) => R): R {
    return this.transaction(() => fn(this.state))();
  }

  reset(): void {
    this.state = freshState();
    this.save();
  }
}

let instance: DemoDB | null = null;
export function demoDb(): DemoDB {
  if (!instance) instance = new DemoDB();
  return instance;
}
