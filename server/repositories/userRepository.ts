import type Database from 'better-sqlite3';
import { User } from '../../shared/types/auth';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: User['role'];
  department: string;
  avatar_url: string | null;
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

export function listUsers(db: Database.Database): User[] {
  return (db.prepare('SELECT * FROM users ORDER BY role, name').all() as UserRow[]).map(rowToUser);
}

export function getUserById(db: Database.Database, id: string): User | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row ? rowToUser(row) : null;
}

export function upsertUser(db: Database.Database, user: User): void {
  db.prepare(
    `INSERT INTO users (id, name, email, role, department, avatar_url, created_at)
     VALUES (@id, @name, @email, @role, @department, @avatar_url, @created_at)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, email = excluded.email, role = excluded.role,
       department = excluded.department, avatar_url = excluded.avatar_url`
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
