import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { runMigrations } from './migrations';
import { seedSampleLinks, seedUsers } from './seed';

export type DB = Database.Database;

export interface OpenDatabaseOptions {
  /** Seed sample links when the database is created for the first time. */
  seedSampleData?: boolean;
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

  seedUsers(db);

  // Only seed sample links on a brand-new database, so deleted samples never come back.
  if (applied.includes(1) && options.seedSampleData !== false) {
    const count = seedSampleLinks(db);
    log(`Seeded ${count} sample links`);
  }

  return db;
}
