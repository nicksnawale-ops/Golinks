import type Database from 'better-sqlite3';
import { SEED_AUDIT_LOGS, SEED_LINKS } from '../../shared/seedData';
import { MOCK_USERS } from '../../shared/types/auth';
import { insertAuditEntry } from '../repositories/auditRepository';
import { insertLink } from '../repositories/linkRepository';
import { upsertUser } from '../repositories/userRepository';

/** Upserts the directory users (mock identities until SSO is wired in). */
export function seedUsers(db: Database.Database): void {
  db.transaction(() => {
    for (const user of MOCK_USERS) upsertUser(db, user);
  })();
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
