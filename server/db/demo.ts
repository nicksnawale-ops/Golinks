/**
 * Demo mode (DEMO_MODE=true): gives the sample admin and employee accounts known passwords and
 * lists them on the sign-in page, for evaluations and training. Never enable it on a server
 * that holds real links: anyone who can open the sign-in page can sign in as the demo admin.
 *
 * When demo mode is switched off again, any demo account still using its demo password has the
 * password removed at the next start, so the published credentials stop working.
 */
import type Database from 'better-sqlite3';
import { MOCK_USERS, PREVIOUS_DEMO_EMAILS, PREVIOUS_DEMO_NAMES } from '../../shared/types/auth';
import {
  getPasswordHash,
  getUserById,
  insertUserIfMissing,
  setPasswordHash,
  clearPasswordHash,
  updateUserFields,
} from '../repositories/userRepository';
import { hashPassword, verifyPassword } from '../security/passwords';

export interface DemoAccount {
  label: string;
  email: string;
  password: string;
  role: 'admin' | 'employee';
}

const DEMO_USERS: Array<{ id: string; label: string; password: string }> = [
  { id: 'user_admin', label: 'Demo admin', password: 'Admin@12345' },
  { id: 'user_nikhil', label: 'Demo employee', password: 'Employee@12345' },
];

export function getDemoAccounts(db: Database.Database): DemoAccount[] {
  return DEMO_USERS.flatMap((d) => {
    const user = getUserById(db, d.id);
    return user ? [{ label: d.label, email: user.email, password: d.password, role: user.role }] : [];
  });
}

/** Applies (enabled) or retracts (disabled) the demo credentials. Returns log lines. */
/**
 * Demo accounts created with an earlier email address are moved to the current one, together with
 * the links they own. The audit log is history, so its entries keep the address used at the time.
 */
function updateDemoEmails(db: Database.Database, log: string[]): void {
  for (const seed of MOCK_USERS) {
    const previous = PREVIOUS_DEMO_EMAILS[seed.id];
    if (!previous) continue;
    const row = db.prepare('SELECT email FROM users WHERE id = ?').get(seed.id) as { email: string } | undefined;
    if (!row || row.email.toLowerCase() === seed.email.toLowerCase()) continue;
    if (!previous.some((e) => e.toLowerCase() === row.email.toLowerCase())) continue; // changed by an admin: leave it
    const taken = db.prepare('SELECT 1 FROM users WHERE lower(email) = lower(?) AND id != ?').get(seed.email, seed.id);
    if (taken) continue;
    db.transaction(() => {
      db.prepare('UPDATE users SET email = ? WHERE id = ?').run(seed.email, seed.id);
      db.prepare('UPDATE links SET owner = ? WHERE lower(owner) = lower(?)').run(seed.email, row.email);
    })();
    log.push(`Demo account ${row.email} is now ${seed.email}`);
  }
}

/** Demo accounts still using an earlier default name get the current one; names an admin set are kept. */
function updateDemoNames(db: Database.Database): void {
  for (const seed of MOCK_USERS) {
    const previous = PREVIOUS_DEMO_NAMES[seed.id];
    if (!previous) continue;
    const row = db.prepare('SELECT name FROM users WHERE id = ?').get(seed.id) as { name: string } | undefined;
    if (row && previous.includes(row.name)) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(seed.name, seed.id);
  }
}

export function applyDemoMode(db: Database.Database, enabled: boolean): string[] {
  const log: string[] = [];
  if (enabled) {
    updateDemoEmails(db, log);
    updateDemoNames(db);
  }
  for (const d of DEMO_USERS) {
    if (enabled) {
      const seed = MOCK_USERS.find((u) => u.id === d.id);
      if (seed) insertUserIfMissing(db, seed);
      if (!getUserById(db, d.id)) continue;
      updateUserFields(db, d.id, { isActive: true });
      if (!verifyPassword(d.password, getPasswordHash(db, d.id))) setPasswordHash(db, d.id, hashPassword(d.password));
    } else if (verifyPassword(d.password, getPasswordHash(db, d.id))) {
      clearPasswordHash(db, d.id);
      log.push(`Demo mode is off: removed the demo password from ${getUserById(db, d.id)?.email}`);
    }
  }
  if (enabled) log.push('WARNING: DEMO_MODE is on. Demo sign-in details are shown on the sign-in page. Do not use with real links.');
  return log;
}
