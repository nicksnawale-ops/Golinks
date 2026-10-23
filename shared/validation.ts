/**
 * Pure validation helpers shared by the React client and the Express server.
 * The server is the source of truth; the client uses these for instant feedback.
 */
import { isReservedShortName, RESERVED_NAMES } from './resolver';

export interface ValidationResult {
  valid: boolean;
  error?: string;
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
 * Validates shortName format according to GoLinks rules (uniqueness is checked separately):
 * - lowercase a-z, 0-9, -, _, /
 * - 2 to 50 characters
 * - not a reserved system keyword
 */
export function validateShortNameFormat(shortName: string): ValidationResult {
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

  return { valid: true };
}

/**
 * Validates target URL.
 */
export function validateTargetUrl(url: string): ValidationResult {
  const trimmed = (url || '').trim();
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
