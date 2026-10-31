import { User } from '../types/auth';
import { apiRequest, ApiError } from './apiClient';

/** A user as admins see them in user management. */
export interface ManagedUser extends User {
  isActive: boolean;
  hasPassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

/**
 * The signed-in user, or null when there is no valid session.
 * Identity comes from the httpOnly session cookie set by the server at sign-in.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    return await apiRequest<User>('/auth/me', { silentAuth: true });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export async function login(email: string, password: string): Promise<User> {
  return apiRequest<User>('/auth/login', { method: 'POST', body: { email, password }, silentAuth: true });
}

export async function logout(): Promise<void> {
  await apiRequest<void>('/auth/logout', { method: 'POST', silentAuth: true });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiRequest<void>('/auth/password', { method: 'POST', body: { currentPassword, newPassword } });
}

// ---- User management (admin) ------------------------------------------------

export async function listUsers(): Promise<ManagedUser[]> {
  return apiRequest<ManagedUser[]>('/users');
}

export async function createUser(input: {
  name: string;
  email: string;
  role: User['role'];
  department: string;
  password: string;
}): Promise<ManagedUser> {
  return apiRequest<ManagedUser>('/users', { method: 'POST', body: input });
}

export async function updateUser(
  id: string,
  input: Partial<Pick<User, 'name' | 'role' | 'department'>> & { isActive?: boolean }
): Promise<ManagedUser> {
  return apiRequest<ManagedUser>(`/users/${encodeURIComponent(id)}`, { method: 'PUT', body: input });
}

export async function resetUserPassword(id: string, password: string): Promise<void> {
  await apiRequest<void>(`/users/${encodeURIComponent(id)}/password`, { method: 'POST', body: { password } });
}

/**
 * RBAC Helper: determines if a user has permission to edit or delete a link.
 * - Admin: can edit/delete ANY link.
 * - Employee: can edit/delete ONLY their own links.
 * The server enforces the same rules; these only decide what the UI shows.
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
