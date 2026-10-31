/**
 * Demo mode (DEMO_MODE=true): gives the sample admin and employee accounts known passwords and
 * lists them on the sign-in page, for evaluations and training. Never enable it on a server
 * that holds real links: anyone who can open the sign-in page can sign in as the demo admin.
 *
 * When demo mode is switched off again, any demo account still using its demo password has the
 * password removed at the next start, so the published credentials stop working.
 */
import type Database from 'better-sqlite3';
import { MOCK_USERS } from '../../shared/types/auth';
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
export function applyDemoMode(db: Database.Database, enabled: boolean): string[] {
  const log: string[] = [];
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
