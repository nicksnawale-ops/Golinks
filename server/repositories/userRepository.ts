import type Database from 'better-sqlite3';
import { User } from '../../shared/types/auth';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: User['role'];
  department: string;
  avatar_url: string | null;
  password_hash: string | null;
  is_active: number;
  last_login_at: string | null;
  created_at: string;
}

/** What admins see in user management (never includes the password hash). */
export interface ManagedUser extends User {
  isActive: boolean;
  hasPassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    department: row.department,
    ...(row.avatar_url ? { avatarUrl: row.avatar_url } : {}),
  };
}

function rowToManagedUser(row: UserRow): ManagedUser {
  return {
    ...rowToUser(row),
    isActive: row.is_active === 1,
    hasPassword: !!row.password_hash,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  };
}

export function listUsers(db: Database.Database): User[] {
  return (db.prepare('SELECT * FROM users ORDER BY role, name').all() as UserRow[]).map(rowToUser);
}

export function listManagedUsers(db: Database.Database): ManagedUser[] {
  return (db.prepare('SELECT * FROM users ORDER BY role, name').all() as UserRow[]).map(rowToManagedUser);
}

export function getManagedUser(db: Database.Database, id: string): ManagedUser | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row ? rowToManagedUser(row) : null;
}

export function getUserById(db: Database.Database, id: string): User | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row ? rowToUser(row) : null;
}

/** Active users only — what a session or login may resolve to. */
export function getActiveUserById(db: Database.Database, id: string): User | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(id) as UserRow | undefined;
  return row ? rowToUser(row) : null;
}

export function getUserCredentials(
  db: Database.Database,
  email: string
): { user: User; passwordHash: string | null; isActive: boolean } | null {
  const row = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(email.trim()) as UserRow | undefined;
  return row ? { user: rowToUser(row), passwordHash: row.password_hash, isActive: row.is_active === 1 } : null;
}

export function getPasswordHash(db: Database.Database, id: string): string | null {
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(id) as
    | { password_hash: string | null }
    | undefined;
  return row?.password_hash ?? null;
}

export function setPasswordHash(db: Database.Database, id: string, passwordHash: string): void {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
}

export function stampLogin(db: Database.Database, id: string): void {
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(new Date().toISOString(), id);
}

export function countActiveAdminsWithPassword(db: Database.Database, excludeId?: string): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM users
       WHERE role = 'admin' AND is_active = 1 AND password_hash IS NOT NULL AND id != ?`
    )
    .get(excludeId ?? '') as { n: number };
  return row.n;
}

export function insertUser(
  db: Database.Database,
  user: User & { passwordHash?: string | null; isActive?: boolean }
): void {
  db.prepare(
    `INSERT INTO users (id, name, email, role, department, avatar_url, created_at, password_hash, is_active)
     VALUES (@id, @name, @email, @role, @department, @avatar_url, @created_at, @password_hash, @is_active)`
  ).run({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    avatar_url: user.avatarUrl ?? null,
    created_at: new Date().toISOString(),
    password_hash: user.passwordHash ?? null,
    is_active: user.isActive === false ? 0 : 1,
  });
}

/** Inserts the user only if the id is new (sample/demo identities never overwrite admin edits). */
export function insertUserIfMissing(db: Database.Database, user: User): void {
  db.prepare(
    `INSERT INTO users (id, name, email, role, department, avatar_url, created_at)
     VALUES (@id, @name, @email, @role, @department, @avatar_url, @created_at)
     ON CONFLICT DO NOTHING`
  ).run({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    avatar_url: user.avatarUrl ?? null,
    created_at: new Date().toISOString(),
  });
}

export function updateUserFields(
  db: Database.Database,
  id: string,
  fields: Partial<Pick<User, 'name' | 'role' | 'department'>> & { isActive?: boolean }
): void {
  const current = getManagedUser(db, id);
  if (!current) return;
  db.prepare('UPDATE users SET name = ?, role = ?, department = ?, is_active = ? WHERE id = ?').run(
    fields.name ?? current.name,
    fields.role ?? current.role,
    fields.department ?? current.department,
    (fields.isActive ?? current.isActive) ? 1 : 0,
    id
  );
}
