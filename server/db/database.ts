import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { runMigrations } from './migrations';
import { BootstrapAdmin } from '../config';
import { countActiveAdminsWithPassword } from '../repositories/userRepository';
import { ensureBootstrapAdmin, seedSampleLinks, seedSampleUsers } from './seed';

export type DB = Database.Database;

export interface OpenDatabaseOptions {
  /** Seed sample links when the database is created for the first time. */
  seedSampleData?: boolean;
  /** Create/activate this admin account at startup (from ADMIN_EMAIL / ADMIN_PASSWORD). */
  bootstrapAdmin?: BootstrapAdmin | null;
  log?: (message: string) => void;
}

/**
 * Opens (creating if needed) the SQLite database, applies migrations and seeds a fresh database.
 * Pass ':memory:' for an in-memory database (tests).
 */
export function openDatabase(dbPath: string, options: OpenDatabaseOptions = {}): DB {
  const log = options.log ?? (() => {});

  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  const applied = runMigrations(db);
  if (applied.length > 0) log(`Applied database migrations: ${applied.join(', ')}`);

  // Only seed samples on a brand-new database, so deleted samples never come back.
  if (applied.includes(1) && options.seedSampleData !== false) {
    seedSampleUsers(db);
    const count = seedSampleLinks(db);
    log(`Seeded ${count} sample links`);
  }

  if (options.bootstrapAdmin) log(ensureBootstrapAdmin(db, options.bootstrapAdmin));
  if (countActiveAdminsWithPassword(db) === 0) {
    log('WARNING: no admin can sign in. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env and restart.');
  }

  return db;
}
