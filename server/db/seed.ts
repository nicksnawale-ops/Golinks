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

/**
 * Removes the sample data from a database that was seeded earlier, keeping everything real:
 * - sample links that are still exactly as seeded (same name and target); edited ones are kept,
 *   with their made-up click count replaced by the clicks actually recorded for them
 * - the sample audit events
 * - sample user accounts that can't sign in (no password) and own no links
 */
export function removeSampleData(db: Database.Database): { links: number; audit: number; users: number } {
  return db.transaction(() => {
    let links = 0;
    for (const sample of SEED_LINKS) {
      const row = db.prepare('SELECT id, target_url FROM links WHERE id = ?').get(sample.id) as
        | { id: string; target_url: string }
        | undefined;
      if (!row) continue;
      if (row.target_url === sample.targetUrl) {
        db.prepare('DELETE FROM links WHERE id = ?').run(row.id);
        links++;
      } else {
        const real = db.prepare('SELECT COUNT(*) AS n, MAX(timestamp) AS last FROM click_events WHERE link_id = ?').get(
          row.id
        ) as { n: number; last: string | null };
        db.prepare('UPDATE links SET click_count = ?, last_accessed_at = ? WHERE id = ?').run(real.n, real.last, row.id);
      }
    }

    let audit = 0;
    for (const entry of SEED_AUDIT_LOGS) audit += db.prepare('DELETE FROM audit_log WHERE id = ?').run(entry.id).changes;

    let users = 0;
    for (const sample of MOCK_USERS) {
      const u = db.prepare('SELECT email, password_hash FROM users WHERE id = ?').get(sample.id) as
        | { email: string; password_hash: string | null }
        | undefined;
      if (!u || u.password_hash) continue;
      const owns = db.prepare('SELECT 1 FROM links WHERE lower(owner) = lower(?) LIMIT 1').get(u.email);
      if (owns) continue;
      users += db.prepare('DELETE FROM users WHERE id = ?').run(sample.id).changes;
    }
    return { links, audit, users };
  })();
}
