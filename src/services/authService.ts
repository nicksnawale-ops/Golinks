import { MOCK_USERS, User, UserRole } from '../types/auth';

const AUTH_STORAGE_KEY = 'golinks_auth_current_user_v1';

const delay = (ms = 25): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Synchronously returns the active user's id (sent to the API as X-GoLinks-User-Id).
 */
export function getCurrentUserId(): string {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.id === 'string') return parsed.id;
    }
  } catch {
    // fall through to the default user
  }
  return MOCK_USERS[0].id;
}

/**
 * Get currently authenticated user from storage (defaults to Admin for quick evaluation).
 */
export async function getCurrentUser(): Promise<User> {
  await delay(10);
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) return parsed;
    }
  } catch (err) {
    console.error('Failed to read auth user from storage', err);
  }

  // Default to Admin Alex Rivera
  const defaultUser = MOCK_USERS[0];
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(defaultUser));
  return defaultUser;
}

/**
 * Set active user (swapping role/account).
 */
export async function setCurrentUser(user: User): Promise<void> {
  await delay(10);
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

/**
 * Login using mock selector (LDAP/SSO adapter placeholder).
 */
export async function loginWithMockUser(userId: string): Promise<User> {
  const users = await getMockUsers();
  const found = users.find((u) => u.id === userId);
  if (!found) {
    throw new Error(`User with ID ${userId} was not found in directory.`);
  }
  await setCurrentUser(found);
  return found;
}

/**
 * Logout user.
 */
export async function logout(): Promise<void> {
  await delay(20);
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

/**
 * Get list of available directory users (served from the server's users table).
 */
export async function getMockUsers(): Promise<User[]> {
  try {
    const res = await fetch('/api/users', { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const users = await res.json();
      if (Array.isArray(users) && users.length > 0) return users;
    }
  } catch (err) {
    console.warn('Failed to load users from server, using built-in list', err);
  }
  return [...MOCK_USERS];
}

/**
 * RBAC Helper: determines if a user has permission to edit or delete a link.
 * - Admin: can edit/delete ANY link.
 * - Employee: can edit/delete ONLY their own links.
 */
export function canUserManageLink(
  user: User | null | undefined,
  link: { owner: string } | null | undefined
): boolean {
  if (!user || !link) return false;
  if (user.role === 'admin') return true;
  return user.email.toLowerCase() === link.owner.toLowerCase();
}

/**
 * RBAC Helper: Admin only permissions
 */
export function canUserReassign(user: User | null | undefined): boolean {
  return user?.role === 'admin';
}

export function canUserViewAudit(user: User | null | undefined): boolean {
  return user?.role === 'admin';
}

export function canUserBulkImport(user: User | null | undefined): boolean {
  return user?.role === 'admin';
}
