import { AuditAction } from '../types/audit';
import { User } from '../types/auth';
import { CreateLinkInput, GoLink, ResolveResult, UpdateLinkInput } from '../types/link';
import { isReservedShortName, parseGoInput, RESERVED_NAMES, resolveShortUrl } from '../utils/resolver';
import { recordAuditEvent } from './auditService';
import { getCurrentUser } from './authService';
import { findSimilarLinks } from './fuzzyMatch';
import { DEFAULT_CATEGORIES, SEED_LINKS } from './seedData';

const STORAGE_KEY = 'golinks_enterprise_data_v1';
const INITIALIZED_KEY = 'golinks_initialized_v1';

// Helper to simulate asynchronous network latency for REST API compatibility
const delay = (ms = 40): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Load raw links from localStorage, seeding default 10 links if empty.
 */
function loadFromStorage(): GoLink[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const hasInitialized = localStorage.getItem(INITIALIZED_KEY);

    if (!raw || !hasInitialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_LINKS));
      localStorage.setItem(INITIALIZED_KEY, 'true');
      return SEED_LINKS;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_LINKS));
      return SEED_LINKS;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to parse links from localStorage, restoring seeds', err);
    return SEED_LINKS;
  }
}

/**
 * Save raw links to localStorage.
 */
function saveToStorage(links: GoLink[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  } catch (err) {
    console.error('Failed to save links to localStorage', err);
  }
}

/**
 * Normalizes shortName: converts to lowercase, trims whitespace, removes leading 'go/'.
 */
export function normalizeShortName(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/^go\//i, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

/**
 * Validates a shortName string according to GoLinks rules:
 * - lowercase a-z, 0-9, -, _, /
 * - 2 to 50 characters
 * - uniqueness check
 */
export async function validateShortName(
  shortName: string,
  excludeId?: string
): Promise<{ valid: boolean; error?: string }> {
  await delay(10);
  const normalized = normalizeShortName(shortName);

  if (!normalized) {
    return { valid: false, error: 'Short name is required.' };
  }

  if (normalized.length < 2) {
    return { valid: false, error: 'Short name must be at least 2 characters long.' };
  }

  if (normalized.length > 50) {
    return { valid: false, error: 'Short name cannot exceed 50 characters.' };
  }

  // Allowed characters: lowercase a-z, 0-9, -, _, /
  const regex = /^[a-z0-9\-_/]+$/;
  if (!regex.test(normalized)) {
    return {
      valid: false,
      error: 'Allowed characters: lowercase letters (a-z), numbers (0-9), hyphens (-), underscores (_), and slashes (/).',
    };
  }

  // Check for reserved system keywords
  if (isReservedShortName(normalized)) {
    return {
      valid: false,
      error: `"${normalized}" is a reserved system keyword and cannot be used as a shortcut name. (Reserved: ${RESERVED_NAMES.join(', ')})`,
    };
  }

  // Prevent consecutive slashes or isolated slash
  if (normalized.includes('//') || normalized === '/') {
    return { valid: false, error: 'Consecutive slashes are not permitted.' };
  }

  // Uniqueness check
  const links = loadFromStorage();
  const duplicate = links.find(
    (link) => link.shortName.toLowerCase() === normalized && link.id !== excludeId
  );

  if (duplicate) {
    return { valid: false, error: `go/${normalized} already exists and is owned by ${duplicate.owner}.` };
  }

  return { valid: true };
}

/**
 * Validates target URL.
 */
export function validateTargetUrl(url: string): { valid: boolean; error?: string } {
  const trimmed = url.trim();
  if (!trimmed) {
    return { valid: false, error: 'Target URL is required.' };
  }

  // Allow %s or {query} placeholder in valid URL formats
  const urlToCheck = trimmed.replace(/%s/g, 'parameter_test').replace(/\{[a-zA-Z0-9_]+\}/g, 'parameter_test');

  try {
    const parsed = new URL(urlToCheck);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'URL must begin with http:// or https://' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Please enter a valid URL (e.g., https://intranet.company.internal/docs)' };
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
  await delay(30);
  let links = loadFromStorage();

  if (params?.category && params.category !== 'All') {
    links = links.filter((link) => link.category.toLowerCase() === params.category?.toLowerCase());
  }

  if (params?.visibility && params.visibility !== 'all') {
    links = links.filter((link) => link.visibility === params.visibility);
  }

  if (params?.isActive !== undefined) {
    links = links.filter((link) => link.isActive === params.isActive);
  }

  if (params?.query && params.query.trim()) {
    const q = params.query.toLowerCase().trim().replace(/^go\//, '');
    links = links.filter((link) => {
      const matchShort = link.shortName.toLowerCase().includes(q);
      const matchDesc = (link.description || '').toLowerCase().includes(q);
      const matchUrl = link.targetUrl.toLowerCase().includes(q);
      const matchOwner = link.owner.toLowerCase().includes(q);
      const matchCat = link.category.toLowerCase().includes(q);
      const matchTags = (link.tags || []).some((t) => t.toLowerCase().includes(q));
      return matchShort || matchDesc || matchUrl || matchOwner || matchCat || matchTags;
    });
  }

  // Sorting
  const sortBy = params?.sortBy || 'clicks';
  const order = params?.sortOrder || (sortBy === 'name' ? 'asc' : 'desc');

  links.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'clicks') {
      comparison = b.clickCount - a.clickCount;
    } else if (sortBy === 'recent') {
      comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === 'lastAccessed') {
      const timeA = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
      const timeB = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
      comparison = timeB - timeA;
    } else if (sortBy === 'name') {
      comparison = a.shortName.localeCompare(b.shortName);
    }
    return order === 'asc' ? -comparison : comparison;
  });

  return links;
}

/**
 * Fetch a single link by its unique ID.
 */
export async function getLink(id: string): Promise<GoLink | null> {
  await delay(20);
  const links = loadFromStorage();
  const link = links.find((l) => l.id === id);
  return link ? { ...link } : null;
}

/**
 * Fetch a link by exact shortName.
 */
export async function getLinkByShortName(shortName: string): Promise<GoLink | null> {
  await delay(20);
  const normalized = normalizeShortName(shortName);
  const links = loadFromStorage();
  const link = links.find((l) => l.shortName.toLowerCase() === normalized);
  return link ? { ...link } : null;
}

/**
 * Create a new GoLink with audit logging.
 */
export async function createLink(input: CreateLinkInput, actor?: User): Promise<GoLink> {
  await delay(40);
  const normalized = normalizeShortName(input.shortName);
  const validation = await validateShortName(normalized);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid short name');
  }

  const urlValidation = validateTargetUrl(input.targetUrl);
  if (!urlValidation.valid) {
    throw new Error(urlValidation.error || 'Invalid target URL');
  }

  const links = loadFromStorage();
  const now = new Date().toISOString();
  const currentActor = actor || (await getCurrentUser());

  const newLink: GoLink = {
    id: 'link_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
    shortName: normalized,
    targetUrl: input.targetUrl.trim(),
    description: input.description?.trim() || '',
    category: input.category || 'General',
    owner: input.owner?.trim() || currentActor.email,
    visibility: input.visibility || 'public',
    isActive: input.isActive !== undefined ? input.isActive : true,
    clickCount: 0,
    lastAccessedAt: null,
    createdAt: now,
    updatedAt: now,
    tags: input.tags || [],
  };

  links.unshift(newLink);
  saveToStorage(links);

  // Record audit log
  await recordAuditEvent({
    actor: currentActor,
    action: 'create',
    linkId: newLink.id,
    shortName: newLink.shortName,
    newValues: {
      shortName: newLink.shortName,
      targetUrl: newLink.targetUrl,
      category: newLink.category,
      owner: newLink.owner,
      visibility: newLink.visibility,
    },
    notes: 'Created new shortcut',
  });

  return newLink;
}

/**
 * Update an existing GoLink with audit logging.
 */
export async function updateLink(
  id: string,
  input: UpdateLinkInput,
  actor?: User
): Promise<GoLink> {
  await delay(40);
  const links = loadFromStorage();
  const index = links.findIndex((l) => l.id === id);

  if (index === -1) {
    throw new Error(`Link with ID "${id}" was not found.`);
  }

  const current = links[index];
  const oldValues: Partial<GoLink> = { ...current };
  let auditAction: AuditAction = 'edit';
  let auditNotes = 'Updated shortcut configuration';

  if (input.shortName && input.shortName !== current.shortName) {
    const normalized = normalizeShortName(input.shortName);
    const validation = await validateShortName(normalized, id);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid short name');
    }
    current.shortName = normalized;
  }

  if (input.targetUrl !== undefined) {
    const urlValidation = validateTargetUrl(input.targetUrl);
    if (!urlValidation.valid) {
      throw new Error(urlValidation.error || 'Invalid target URL');
    }
    current.targetUrl = input.targetUrl.trim();
  }

  if (input.description !== undefined) {
    current.description = input.description.trim();
  }

  if (input.category !== undefined) {
    current.category = input.category;
  }

  if (input.owner !== undefined && input.owner !== current.owner) {
    auditAction = 'reassign_owner';
    auditNotes = `Ownership reassigned from ${current.owner} to ${input.owner}`;
    current.owner = input.owner.trim();
  }

  if (input.visibility !== undefined) {
    current.visibility = input.visibility;
  }

  if (input.isActive !== undefined && input.isActive !== current.isActive) {
    current.isActive = input.isActive;
    auditAction = input.isActive ? 'activate' : 'deactivate';
    auditNotes = input.isActive ? 'Reactivated shortcut' : 'Deactivated / disabled shortcut';
  }

  if (input.tags !== undefined) {
    current.tags = input.tags;
  }

  current.updatedAt = new Date().toISOString();

  links[index] = current;
  saveToStorage(links);

  const currentActor = actor || (await getCurrentUser());
  await recordAuditEvent({
    actor: currentActor,
    action: auditAction,
    linkId: current.id,
    shortName: current.shortName,
    oldValues,
    newValues: { ...current },
    notes: auditNotes,
  });

  return { ...current };
}

/**
 * Delete a GoLink with audit logging.
 */
export async function deleteLink(id: string, actor?: User): Promise<boolean> {
  await delay(30);
  const links = loadFromStorage();
  const toDelete = links.find((l) => l.id === id);
  if (!toDelete) return false;

  const next = links.filter((l) => l.id !== id);
  saveToStorage(next);

  const currentActor = actor || (await getCurrentUser());
  await recordAuditEvent({
    actor: currentActor,
    action: 'delete',
    linkId: id,
    shortName: toDelete.shortName,
    oldValues: toDelete,
    notes: `Permanently removed go/${toDelete.shortName}`,
  });

  return true;
}

/**
 * Bulk import valid links from CSV into directory.
 */
export async function bulkImportLinks(
  rows: Array<{
    shortName: string;
    targetUrl: string;
    description: string;
    category: string;
  }>,
  actor?: User
): Promise<number> {
  await delay(50);
  const links = loadFromStorage();
  const currentActor = actor || (await getCurrentUser());
  const now = new Date().toISOString();
  let count = 0;

  for (const row of rows) {
    const norm = normalizeShortName(row.shortName);
    const newLink: GoLink = {
      id: 'bulk_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
      shortName: norm,
      targetUrl: row.targetUrl.trim(),
      description: row.description.trim(),
      category: row.category || 'General',
      owner: currentActor.email,
      visibility: 'public',
      isActive: true,
      clickCount: 0,
      lastAccessedAt: null,
      createdAt: now,
      updatedAt: now,
      tags: [],
    };
    links.unshift(newLink);
    count++;
  }

  saveToStorage(links);

  await recordAuditEvent({
    actor: currentActor,
    action: 'bulk_import',
    linkId: 'bulk_batch',
    shortName: `batch (${count} links)`,
    notes: `Imported ${count} shortcuts from CSV upload`,
  });

  return count;
}

/**
 * Record a link access / click.
 */
export async function recordClick(id: string): Promise<void> {
  const links = loadFromStorage();
  const link = links.find((l) => l.id === id);
  if (link) {
    link.clickCount += 1;
    link.lastAccessedAt = new Date().toISOString();
    saveToStorage(links);
  }
}

/**
/**
 * Resolves a short link with pure matching engine:
 * 1. Case-insensitive matching (go/HR = go/hr)
 * 2. Path passthrough (go/jira/PROJ-123 -> https://jira.company.local/browse/PROJ-123) with longest prefix first
 * 3. Parameterized links (%s placeholder in targetUrl)
 * 4. Query string passthrough (appends ?query params from go link)
 * 5. Inactive links return isDisabled=true with the owner's name
 * 6. On every successful resolution, increments clickCount and updates lastAccessedAt
 */
export async function resolveLink(rawPath: string): Promise<ResolveResult> {
  await delay(30);
  const links = loadFromStorage();
  const resolution = resolveShortUrl(rawPath, links);

  if (resolution.status === 'success') {
    // 6. On every successful resolution, increment clickCount and update lastAccessedAt
    await recordClick(resolution.link.id);

    // Reload updated link with updated clickCount and lastAccessedAt
    const updated = (await getLink(resolution.link.id)) || resolution.link;

    return {
      found: true,
      isDisabled: false,
      link: updated,
      resolvedUrl: resolution.resolvedUrl,
      isParameterMatch: resolution.isParameterMatch,
      suffix: resolution.remainder,
      matchedPrefix: resolution.matchedPrefix,
    };
  }

  if (resolution.status === 'inactive') {
    // 5. Inactive links show a "This link has been disabled" page with the owner's name
    const activeLinks = links.filter((l) => l.isActive);
    const suggestions = findSimilarLinks(resolution.attemptedPath, activeLinks);

    return {
      found: false,
      isDisabled: true,
      link: resolution.link,
      owner: resolution.owner,
      attempted: resolution.attemptedPath,
      suggestions,
      inactiveLink: resolution.link,
    };
  }

  // Not found: calculate fuzzy match suggestions
  const parsed = parseGoInput(rawPath);
  const activeLinks = links.filter((l) => l.isActive);
  const suggestions = findSimilarLinks(parsed.cleanPath, activeLinks);

  return {
    found: false,
    isDisabled: false,
    attempted: parsed.originalCasePath || rawPath,
    suggestions,
  };
}

/**
 * Get distinct categories from active links and defaults.
 */
export async function getCategories(): Promise<string[]> {
  await delay(10);
  const links = loadFromStorage();
  const set = new Set<string>(DEFAULT_CATEGORIES);
  links.forEach((l) => {
    if (l.category) set.add(l.category);
  });
  return Array.from(set);
}

/**
 * Reset links to initial seed data.
 */
export async function resetToDefaults(): Promise<GoLink[]> {
  await delay(40);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_LINKS));
  localStorage.setItem(INITIALIZED_KEY, 'true');
  return [...SEED_LINKS];
}

/**
 * Export links as JSON.
 */
export async function exportLinks(): Promise<string> {
  const links = loadFromStorage();
  return JSON.stringify(links, null, 2);
}

/**
 * Import links from JSON.
 */
export async function importLinks(jsonString: string): Promise<number> {
  const parsed = JSON.parse(jsonString);
  if (!Array.isArray(parsed)) {
    throw new Error('Import data must be a JSON array of links.');
  }

  const existing = loadFromStorage();
  const existingMap = new Map(existing.map((l) => [l.shortName.toLowerCase(), l]));
  let importedCount = 0;

  for (const item of parsed) {
    if (item.shortName && item.targetUrl) {
      const norm = normalizeShortName(item.shortName);
      const link: GoLink = {
        id: item.id || 'imported_' + Math.random().toString(36).substring(2, 9),
        shortName: norm,
        targetUrl: item.targetUrl,
        description: item.description || '',
        category: item.category || 'General',
        owner: item.owner || 'nikhil.nawale01@gmail.com',
        visibility: item.visibility === 'private' ? 'private' : 'public',
        isActive: item.isActive !== undefined ? item.isActive : true,
        clickCount: typeof item.clickCount === 'number' ? item.clickCount : 0,
        lastAccessedAt: item.lastAccessedAt || null,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString(),
        tags: Array.isArray(item.tags) ? item.tags : [],
      };

      existingMap.set(norm, link);
      importedCount++;
    }
  }

  saveToStorage(Array.from(existingMap.values()));
  return importedCount;
}
