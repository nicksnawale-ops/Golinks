import { User } from '../types/auth';
import { CreateLinkInput, GoLink, ResolveResult, UpdateLinkInput } from '../types/link';
import { normalizeShortName, validateShortNameFormat, validateTargetUrl } from '../../shared/validation';
import { ApiError, apiRequest, buildQuery } from './apiClient';

// Pure validators are shared with the server (shared/validation.ts).
export { normalizeShortName, validateTargetUrl };

/**
 * Validates a shortName string according to GoLinks rules:
 * - lowercase a-z, 0-9, -, _, /
 * - 2 to 50 characters
 * - uniqueness check (performed by the server)
 */
export async function validateShortName(
  shortName: string,
  excludeId?: string
): Promise<{ valid: boolean; error?: string }> {
  const format = validateShortNameFormat(shortName);
  if (!format.valid) return format;

  try {
    return await apiRequest<{ valid: boolean; error?: string }>(
      `/links/validate${buildQuery({ shortName: normalizeShortName(shortName), excludeId })}`
    );
  } catch (err) {
    // If the uniqueness check can't reach the server, let the user continue;
    // the server re-validates on save and reports duplicates then.
    console.warn('Short name availability check failed', err);
    return { valid: true };
  }
}

/**
 * Fetch links with optional filtering and sorting.
 */
export async function getLinks(params?: {
  query?: string;
  category?: string;
  visibility?: string;
  isActive?: boolean;
  sortBy?: 'clicks' | 'recent' | 'name' | 'lastAccessed';
  sortOrder?: 'asc' | 'desc';
}): Promise<GoLink[]> {
  return apiRequest<GoLink[]>(`/links${buildQuery(params)}`);
}

/**
 * Fetch a single link by its unique ID.
 */
export async function getLink(id: string): Promise<GoLink | null> {
  const link = await apiRequest<GoLink | { error: string }>(`/links/${encodeURIComponent(id)}`, {
    allowStatus: [404],
  });
  return link && 'id' in link ? link : null;
}

/**
 * Fetch a link by exact shortName.
 */
export async function getLinkByShortName(shortName: string): Promise<GoLink | null> {
  const links = await apiRequest<GoLink[]>(`/links${buildQuery({ shortName: normalizeShortName(shortName) })}`);
  return links[0] ?? null;
}

/**
 * Create a new GoLink. The server validates, stores and records the audit event.
 * `actor` is accepted for signature compatibility; the server uses the signed-in user.
 */
export async function createLink(input: CreateLinkInput, _actor?: User): Promise<GoLink> {
  return apiRequest<GoLink>('/links', { method: 'POST', body: input });
}

/**
 * Update an existing GoLink (server records the audit event).
 */
export async function updateLink(id: string, input: UpdateLinkInput, _actor?: User): Promise<GoLink> {
  return apiRequest<GoLink>(`/links/${encodeURIComponent(id)}`, { method: 'PUT', body: input });
}

/**
 * Delete a GoLink (server records the audit event). Returns false if it did not exist.
 */
export async function deleteLink(id: string, _actor?: User): Promise<boolean> {
  try {
    await apiRequest<void>(`/links/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return true;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return false;
    throw err;
  }
}

/**
 * Bulk import valid links from CSV into directory. Rows whose shortName already exists are skipped.
 */
export async function bulkImportLinks(
  rows: Array<{
    shortName: string;
    targetUrl: string;
    description: string;
    category: string;
  }>,
  _actor?: User
): Promise<number> {
  const result = await apiRequest<{ imported: number }>('/import', {
    method: 'POST',
    body: { mode: 'create', links: rows },
  });
  return result.imported;
}

/**
 * Record a link access / click.
 */
export async function recordClick(id: string): Promise<void> {
  await apiRequest<void>(`/links/${encodeURIComponent(id)}/click`, { method: 'POST' });
}

/**
 * Resolves a short link on the server using the shared matching engine (shared/resolver.ts):
 * case-insensitive, longest-prefix path passthrough, %s parameters, query passthrough,
 * inactive detection. Successful resolutions increment clickCount and lastAccessedAt.
 */
export async function resolveLink(rawPath: string): Promise<ResolveResult> {
  let input = (rawPath || '').trim();
  const hashIdx = input.indexOf('#');
  if (hashIdx !== -1) input = input.slice(0, hashIdx);

  const queryIdx = input.indexOf('?');
  const path = queryIdx === -1 ? input : input.slice(0, queryIdx);
  const query = queryIdx === -1 ? '' : input.slice(queryIdx + 1);

  const encodedPath = path
    .replace(/^\/+/, '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return apiRequest<ResolveResult>(`/resolve/${encodedPath}${query ? `?${query}` : ''}`, {
    allowStatus: [404, 410],
  });
}

/**
 * Get distinct categories from links and defaults.
 */
export async function getCategories(): Promise<string[]> {
  return apiRequest<string[]>('/categories');
}

/**
 * Reset links to initial seed data (admin only; the server must have ALLOW_DATA_RESET=true).
 */
export async function resetToDefaults(): Promise<GoLink[]> {
  return apiRequest<GoLink[]>('/reset', { method: 'POST' });
}

/**
 * Export links as JSON.
 */
export async function exportLinks(): Promise<string> {
  return apiRequest<string>('/export', { raw: true });
}

/**
 * Import links from JSON (upsert by shortName). Admin only.
 */
export async function importLinks(jsonString: string): Promise<number> {
  const parsed = JSON.parse(jsonString);
  if (!Array.isArray(parsed)) {
    throw new Error('Import data must be a JSON array of links.');
  }
  const result = await apiRequest<{ imported: number }>('/import', {
    method: 'POST',
    body: { mode: 'upsert', links: parsed },
  });
  return result.imported;
}
