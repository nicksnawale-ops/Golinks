import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { SEED_AUDIT_LOGS, SEED_LINKS } from '../../shared/seedData';
import { MOCK_USERS } from '../../shared/types/auth';
import { insertAuditEntry } from '../repositories/auditRepository';
import { insertLink } from '../repositories/linkRepository';
import { BootstrapAdmin } from '../config';
import {
  getUserCredentials,
  insertUser,
  insertUserIfMissing,
  setPasswordHash,
  updateUserFields,
} from '../repositories/userRepository';
import { hashPassword, validatePasswordStrength } from '../security/passwords';

/**
 * Adds the sample identities that own the sample links. They have no password, so nobody can
 * sign in as them until an admin sets one; existing rows are never overwritten.
 */
export function seedSampleUsers(db: Database.Database): void {
  db.transaction(() => {
    for (const user of MOCK_USERS) insertUserIfMissing(db, user);
  })();
}

/**
 * Ensures the ADMIN_EMAIL account exists, is an active admin and can sign in.
 * The password is only set when the account has none yet, so a password changed in the app
 * is never reset by a restart. Returns a short description of what happened.
 */
export function ensureBootstrapAdmin(db: Database.Database, admin: BootstrapAdmin): string {
  const weak = validatePasswordStrength(admin.password);
  if (weak) throw new Error(`ADMIN_PASSWORD rejected: ${weak}`);

  const existing = getUserCredentials(db, admin.email);
  if (!existing) {
    insertUser(db, {
      id: 'user_' + randomUUID(),
      name: admin.name,
      email: admin.email,
      role: 'admin',
      department: 'IT',
      passwordHash: hashPassword(admin.password),
    });
    return `Created admin account ${admin.email}`;
  }

  updateUserFields(db, existing.user.id, { role: 'admin', isActive: true });
  if (!existing.passwordHash) {
    setPasswordHash(db, existing.user.id, hashPassword(admin.password));
    return `Set the initial password for admin ${admin.email}`;
  }
  return `Admin ${admin.email} already has a password (ADMIN_PASSWORD not applied)`;
}

/** Inserts the sample links and audit events, skipping any shortName that already exists. */
export function seedSampleLinks(db: Database.Database): number {
  const exists = db.prepare('SELECT 1 FROM links WHERE lower(short_name) = lower(?)');
  let inserted = 0;

  db.transaction(() => {
    for (const link of SEED_LINKS) {
      if (exists.get(link.shortName)) continue;
      insertLink(db, link);
      inserted++;
    }
    const auditExists = db.prepare('SELECT 1 FROM audit_log WHERE id = ?');
    for (const entry of SEED_AUDIT_LOGS) {
      if (!auditExists.get(entry.id)) insertAuditEntry(db, entry);
    }
  })();

  return inserted;
}

/** Replaces all links with the sample set (admin "reset" action, gated by ALLOW_DATA_RESET). */
export function resetToSampleLinks(db: Database.Database): void {
  db.transaction(() => {
    db.prepare('DELETE FROM links').run();
    for (const link of SEED_LINKS) insertLink(db, link);
  })();
}

/** Replaces the audit log with the sample events (gated by ALLOW_DATA_RESET). */
export function resetAuditLog(db: Database.Database, withSamples: boolean): void {
  db.transaction(() => {
    db.prepare('DELETE FROM audit_log').run();
    if (withSamples) for (const entry of SEED_AUDIT_LOGS) insertAuditEntry(db, entry);
  })();
}
