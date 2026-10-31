import type Database from 'better-sqlite3';

/**
 * Ordered, append-only schema migrations. Never edit a migration that has shipped —
 * add a new one with the next version number instead.
 */
export const MIGRATIONS: Array<{ version: number; name: string; sql: string }> = [
  {
    version: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE links (
        id               TEXT PRIMARY KEY,
        short_name       TEXT NOT NULL,
        target_url       TEXT NOT NULL,
        description      TEXT NOT NULL DEFAULT '',
        category         TEXT NOT NULL DEFAULT 'General',
        owner            TEXT NOT NULL,
        visibility       TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
        is_active        INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        click_count      INTEGER NOT NULL DEFAULT 0,
        last_accessed_at TEXT,
        created_at       TEXT NOT NULL,
        updated_at       TEXT NOT NULL,
        tags             TEXT NOT NULL DEFAULT '[]'
      );
      CREATE UNIQUE INDEX idx_links_short_name_lower ON links (lower(short_name));
      CREATE INDEX idx_links_owner ON links (lower(owner));

      CREATE TABLE users (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        email      TEXT NOT NULL,
        role       TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
        department TEXT NOT NULL DEFAULT '',
        avatar_url TEXT,
        created_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX idx_users_email_lower ON users (lower(email));

      CREATE TABLE audit_log (
        id          TEXT PRIMARY KEY,
        timestamp   TEXT NOT NULL,
        actor_email TEXT NOT NULL,
        actor_name  TEXT NOT NULL,
        actor_role  TEXT NOT NULL,
        link_id     TEXT NOT NULL,
        short_name  TEXT NOT NULL,
        action      TEXT NOT NULL,
        old_values  TEXT,
        new_values  TEXT,
        notes       TEXT
      );
      CREATE INDEX idx_audit_log_timestamp ON audit_log (timestamp DESC);
      CREATE INDEX idx_audit_log_link_id ON audit_log (link_id);
    `,
  },
  {
    version: 2,
    name: 'auth_sessions_insights',
    sql: `
      -- Real login: users without a password_hash cannot sign in.
      ALTER TABLE users ADD COLUMN password_hash TEXT;
      ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1));
      ALTER TABLE users ADD COLUMN last_login_at TEXT;

      -- Only a SHA-256 of the session token is stored; the raw token lives in the httpOnly cookie.
      CREATE TABLE sessions (
        token_hash TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
      CREATE INDEX idx_sessions_user_id ON sessions (user_id);
      CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);

      -- go/<name> requests that matched no link: tells admins which links people want.
      CREATE TABLE not_found_requests (
        short_name        TEXT PRIMARY KEY,
        request_count     INTEGER NOT NULL DEFAULT 0,
        first_requested_at TEXT NOT NULL,
        last_requested_at TEXT NOT NULL
      );
      CREATE INDEX idx_not_found_count ON not_found_requests (request_count DESC);

      -- One row per redirect, for trends. links.click_count stays as the fast running total.
      CREATE TABLE click_events (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        link_id   TEXT NOT NULL REFERENCES links (id) ON DELETE CASCADE,
        user_id   TEXT,
        timestamp TEXT NOT NULL
      );
      CREATE INDEX idx_click_events_link_time ON click_events (link_id, timestamp);
      CREATE INDEX idx_click_events_time ON click_events (timestamp);
    `,
  },
];

/**
 * Applies pending migrations inside a transaction. Returns the versions applied.
 */
export function runMigrations(db: Database.Database): number[] {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    (db.prepare('SELECT version FROM schema_migrations').all() as Array<{ version: number }>).map(
      (r) => r.version
    )
  );

  const record = db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)');
  const newlyApplied: number[] = [];

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;
    db.transaction(() => {
      db.exec(migration.sql);
      record.run(migration.version, migration.name, new Date().toISOString());
    })();
    newlyApplied.push(migration.version);
  }

  return newlyApplied;
}
