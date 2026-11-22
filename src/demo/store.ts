/**
 * Browser demo backend: storage.
 *
 * On hosts that only serve static files (e.g. Vercel), GoLinks runs its server logic in the browser
 * against this store instead of SQLite. Everything is kept in this browser's localStorage, so each
 * visitor gets their own copy of the sample data. The real server never uses this file.
 */
import { SEED_AUDIT_LOGS, SEED_LINKS } from '../../shared/seedData';
import { AuditLogEntry } from '../../shared/types/audit';
import { MOCK_USERS, PREVIOUS_DEMO_EMAILS, PREVIOUS_DEMO_NAMES, User } from '../../shared/types/auth';
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
  /** Set once sample data from earlier versions has been cleaned out. */
  samplesRemoved?: boolean;
}

/** Same demo accounts and passwords as the server's DEMO_MODE. */
export const DEMO_PASSWORDS: Record<string, { label: string; password: string }> = {
  user_admin: { label: 'Demo admin', password: 'Admin@12345' },
  user_nikhil: { label: 'Demo employee', password: 'Employee@12345' },
};

const STORAGE_KEY = 'golinks_browser_demo_v1';
const MAX_CLICK_EVENTS = 5000;

/** A new browser starts with no links and no history, just the two demo accounts to sign in with. */
function freshState(): DemoState {
  const now = new Date().toISOString();
  return {
    version: 1,
    links: [],
    users: MOCK_USERS.filter((u) => DEMO_PASSWORDS[u.id]).map((u) => ({
      ...u,
      password: DEMO_PASSWORDS[u.id].password,
      isActive: true,
      lastLoginAt: null,
      createdAt: now,
    })),
    audit: [],
    notFound: {},
    clicks: [],
    sessionUserId: null,
    samplesRemoved: true,
  };
}

/**
 * Browsers that opened an earlier version were given sample links with made-up click counts.
 * Removes them once, keeping everything the visitor added or changed themselves.
 */
function removeSamples(state: DemoState): DemoState {
  const samples = new Map(SEED_LINKS.map((l) => [l.id, l]));
  const sampleAudit = new Set(SEED_AUDIT_LOGS.map((a) => a.id));

  const links = state.links.flatMap((l) => {
    const sample = samples.get(l.id);
    if (!sample) return [l];
    if (l.targetUrl === sample.targetUrl) return []; // untouched sample
    // An edited sample is now real: keep it, but only count clicks that actually happened.
    const real = state.clicks.filter((c) => c.linkId === l.id);
    return [{ ...l, clickCount: real.length, lastAccessedAt: real.length ? real[real.length - 1].timestamp : null }];
  });
  const kept = new Set(links.map((l) => l.id));
  const owners = new Set(links.map((l) => l.owner.toLowerCase()));

  return {
    ...state,
    links,
    audit: state.audit.filter((a) => !sampleAudit.has(a.id)),
    clicks: state.clicks.filter((c) => kept.has(c.linkId)),
    // Sample people who can't sign in and own nothing go too; demo accounts stay.
    users: state.users.filter((u) => DEMO_PASSWORDS[u.id] || u.password || owners.has(u.email.toLowerCase()) || !MOCK_USERS.some((m) => m.id === u.id)),
    samplesRemoved: true,
  };
}

/** Moves demo accounts saved with an earlier email (and the links they own) to the current email. */
function updateDemoEmails(state: DemoState): DemoState {
  let users = state.users;
  let links = state.links;
  for (const seed of MOCK_USERS) {
    const previous = PREVIOUS_DEMO_EMAILS[seed.id];
    const stored = users.find((u) => u.id === seed.id);
    if (!previous || !stored || stored.email.toLowerCase() === seed.email.toLowerCase()) continue;
    if (!previous.some((e) => e.toLowerCase() === stored.email.toLowerCase())) continue;
    if (users.some((u) => u.id !== seed.id && u.email.toLowerCase() === seed.email.toLowerCase())) continue;
    const old = stored.email.toLowerCase();
    users = users.map((u) => (u.id === seed.id ? { ...u, email: seed.email } : u));
    links = links.map((l) => (l.owner.toLowerCase() === old ? { ...l, owner: seed.email } : l));
  }
  // Default names from earlier versions get the current ones; names someone changed are kept.
  users = users.map((u) => {
    const seed = MOCK_USERS.find((m) => m.id === u.id);
    return seed && PREVIOUS_DEMO_NAMES[u.id]?.includes(u.name) ? { ...u, name: seed.name } : u;
  });
  const changed = users.some((u, i) => u !== state.users[i]) || links !== state.links;
  return changed ? { ...state, users, links } : state;
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.links)) {
        return updateDemoEmails(parsed.samplesRemoved ? parsed : removeSamples(parsed));
      }
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

  constructor() {
    this.save(); // persist the one-time sample cleanup straight away
  }
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
