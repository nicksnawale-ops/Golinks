/**
 * URL and Short Name Resolver for GoLinks
 *
 * Provides pure, unit-testable matching, normalization, and URL expansion logic:
 * 1. Case-insensitive matching (go/HR = go/hr)
 * 2. Longest-prefix matching & path passthrough (go/jira/PROJ-123 -> https://.../browse/PROJ-123)
 * 3. Parameterized %s substitution (go/emp/1045 -> https://.../employee?id=1045)
 * 4. Query string passthrough (go/jira/PROJ-123?view=full -> https://.../browse/PROJ-123?view=full)
 * 5. Inactive link identification with owner metadata
 * 6. Reserved name validation
 */

/**
 * System reserved names that cannot be claimed as shortNames.
 */
export const RESERVED_NAMES = [
  'admin',
  'api',
  'login',
  'logout',
  'create',
  'edit',
  'links',
  'settings',
  'static',
  'assets',
  // React app page routes — served by the SPA, so they can never be go links
  'dashboard',
  'directory',
  'my-links',
  'audit-log',
  'help',
  'how-to-use',
  'setup-guide',
  'details',
  'link',
  'go',
] as const;

export type ReservedName = (typeof RESERVED_NAMES)[number];

export interface BaseLink {
  id?: string;
  shortName: string;
  targetUrl: string;
  owner: string;
  isActive: boolean;
}

export interface ParsedGoInput {
  cleanPath: string; // e.g. "jira/proj-123" (lowercase, trimmed)
  originalCasePath: string; // e.g. "jira/PROJ-123" (for preserving case in parameters)
  queryString: string; // e.g. "utm_source=chat&tab=details"
  hash: string; // e.g. "top"
}

export type MatchResult<T extends BaseLink> =
  | {
      status: 'success';
      link: T;
      resolvedUrl: string;
      matchedPrefix: string;
      remainder: string;
      isParameterMatch: boolean;
    }
  | {
      status: 'inactive';
      link: T;
      owner: string;
      attemptedPath: string;
    }
  | {
      status: 'not_found';
      attemptedPath: string;
      cleanPath: string;
    };

/**
 * Checks if a shortName is in the reserved names list.
 * Checks both the exact shortName and the primary root segment (e.g. "admin" or "admin/tools").
 *
 * Examples:
 * - isReservedShortName("admin") => true
 * - isReservedShortName("ADMIN") => true
 * - isReservedShortName("go/api") => true
 * - isReservedShortName("create/new") => true
 * - isReservedShortName("hr") => false
 * - isReservedShortName("jira") => false
 */
export function isReservedShortName(rawShortName: string): boolean {
  if (!rawShortName) return false;

  const normalized = rawShortName
    .toLowerCase()
    .trim()
    .replace(/^go\//i, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

  const rootSegment = normalized.split('/')[0];

  return (RESERVED_NAMES as readonly string[]).includes(rootSegment);
}

/**
 * Parses raw input string into clean path, query string, and hash fragment.
 *
 * Examples:
 * - parseGoInput("go/HR")
 *   => { cleanPath: "hr", originalCasePath: "HR", queryString: "", hash: "" }
 * - parseGoInput("go/jira/PROJ-123?view=full#comment")
 *   => { cleanPath: "jira/proj-123", originalCasePath: "jira/PROJ-123", queryString: "view=full", hash: "comment" }
 * - parseGoInput("http://go/emp/1045?tab=pay")
 *   => { cleanPath: "emp/1045", originalCasePath: "emp/1045", queryString: "tab=pay", hash: "" }
 * - parseGoInput("/wiki/engineering/")
 *   => { cleanPath: "wiki/engineering", originalCasePath: "wiki/engineering", queryString: "", hash: "" }
 */
export function parseGoInput(rawInput: string): ParsedGoInput {
  let input = (rawInput || '').trim();

  // Strip protocol and domain if full URL was provided (e.g. "http://go/hr")
  input = input.replace(/^https?:\/\/go(\.corp\.internal)?\/?/i, '');

  // Strip leading "go/" or "/"
  input = input.replace(/^go\//i, '').replace(/^\/+/, '');

  // Extract hash fragment (#...)
  let hash = '';
  const hashIdx = input.indexOf('#');
  if (hashIdx !== -1) {
    hash = input.slice(hashIdx + 1);
    input = input.slice(0, hashIdx);
  }

  // Extract query string (?...)
  let queryString = '';
  const queryIdx = input.indexOf('?');
  if (queryIdx !== -1) {
    queryString = input.slice(queryIdx + 1);
    input = input.slice(0, queryIdx);
  }

  // Clean trailing slashes
  const originalCasePath = input.replace(/\/+$/, '');
  const cleanPath = originalCasePath.toLowerCase();

  return {
    cleanPath,
    originalCasePath,
    queryString,
    hash,
  };
}

/**
 * Finds the matching link for an input path using longest-prefix first.
 * Matching is completely case-insensitive (go/HR = go/hr).
 *
 * Examples:
 * - links = [{ shortName: "jira" }, { shortName: "jira/special" }]
 *   findMatchingLink("jira/special/123", links)
 *   => { link: { shortName: "jira/special" }, matchedPrefix: "jira/special", remainder: "123" }
 * - findMatchingLink("JIRA/PROJ-123", links)
 *   => { link: { shortName: "jira" }, matchedPrefix: "jira", remainder: "PROJ-123" }
 * - findMatchingLink("HR", [{ shortName: "hr" }])
 *   => { link: { shortName: "hr" }, matchedPrefix: "hr", remainder: "" }
 * - findMatchingLink("payroll", [])
 *   => null
 */
export function findMatchingLink<T extends BaseLink>(
  inputPath: string,
  links: T[]
): { link: T; matchedPrefix: string; remainder: string } | null {
  const { cleanPath, originalCasePath } = parseGoInput(inputPath);
  if (!cleanPath) return null;

  // 1. Check exact match first (case-insensitive)
  const exactMatch = links.find(
    (l) => l.shortName.toLowerCase().trim() === cleanPath
  );
  if (exactMatch) {
    return {
      link: exactMatch,
      matchedPrefix: exactMatch.shortName,
      remainder: '',
    };
  }

  // 2. Prefix match sorted by longest configured shortName first
  const candidates = [...links]
    .filter((l) => Boolean(l.shortName))
    .sort((a, b) => b.shortName.length - a.shortName.length);

  for (const candidate of candidates) {
    const candidateLower = candidate.shortName.toLowerCase().trim();
    const prefixWithSlash = candidateLower + '/';

    if (cleanPath.startsWith(prefixWithSlash)) {
      // Extract the remainder preserving original case from originalCasePath!
      const prefixLength = prefixWithSlash.length;
      const remainder = originalCasePath.slice(prefixLength);

      return {
        link: candidate,
        matchedPrefix: candidate.shortName,
        remainder,
      };
    }
  }

  return null;
}

/**
 * Builds the final resolved target URL with:
 * - Parameterized %s placeholder replacement
 * - Path passthrough when %s is absent
 * - Query string passthrough appended with correct ? or &
 * - Hash preserved
 *
 * Examples:
 * 1. %s placeholder with remainder:
 *    buildTargetUrl("https://hrms.local/employee?id=%s", "1045", "")
 *    => "https://hrms.local/employee?id=1045"
 *
 * 2. Path passthrough without %s:
 *    buildTargetUrl("https://jira.company.local/browse", "PROJ-123", "")
 *    => "https://jira.company.local/browse/PROJ-123"
 *
 * 3. Query string passthrough to URL without query:
 *    buildTargetUrl("https://jira.company.local/browse", "PROJ-123", "view=full")
 *    => "https://jira.company.local/browse/PROJ-123?view=full"
 *
 * 4. Query string passthrough to URL that already has query params:
 *    buildTargetUrl("https://hrms.local/employee?id=%s", "1045", "tab=salary&auth=sso")
 *    => "https://hrms.local/employee?id=1045&tab=salary&auth=sso"
 *
 * 5. Exact link without remainder:
 *    buildTargetUrl("https://workday.company.internal/hr", "", "ref=slack")
 *    => "https://workday.company.internal/hr?ref=slack"
 */
export function buildTargetUrl(
  rawTargetUrl: string,
  remainder: string,
  queryString = '',
  hash = ''
): string {
  let target = (rawTargetUrl || '').trim();

  // Separate any existing hash from targetUrl
  let targetHash = '';
  const existingHashIdx = target.indexOf('#');
  if (existingHashIdx !== -1) {
    targetHash = target.slice(existingHashIdx + 1);
    target = target.slice(0, existingHashIdx);
  }

  // 1. Handle Parameterized %s placeholder or {query}
  if (target.includes('%s')) {
    if (remainder) {
      target = target.replace(/%s/g, remainder);
    } else {
      // If no remainder, remove trailing placeholder or clean up
      target = target.replace(/=%s$/, '=').replace(/%s$/, '');
    }
  } else if (target.includes('{query}')) {
    if (remainder) {
      target = target.replace(/\{query\}/g, remainder);
    } else {
      target = target.replace(/=\{query\}$/, '=').replace(/\{query\}$/, '');
    }
  } else if (remainder) {
    // 2. Path passthrough: append remainder to path
    // If target has query parameters before hash, append remainder before the '?'
    const queryIdx = target.indexOf('?');
    if (queryIdx !== -1) {
      const baseUrl = target.slice(0, queryIdx);
      const existingQuery = target.slice(queryIdx);
      const separator = baseUrl.endsWith('/') ? '' : '/';
      target = `${baseUrl}${separator}${remainder}${existingQuery}`;
    } else {
      const separator = target.endsWith('/') ? '' : '/';
      target = `${target}${separator}${remainder}`;
    }
  }

  // 3. Query string passthrough
  if (queryString && queryString.trim()) {
    const cleanQuery = queryString.trim().replace(/^\?/, '');
    const separator = target.includes('?') ? '&' : '?';
    target = `${target}${separator}${cleanQuery}`;
  }

  // 4. Hash resolution (incoming go-link hash takes precedence over target hash)
  const finalHash = hash || targetHash;
  if (finalHash) {
    target = `${target}#${finalHash}`;
  }

  return target;
}

/**
 * Top-level resolution function for GoLinks.
 * Executes case-insensitive match, longest prefix match, inactive check,
 * parameterized replacement, and query string passthrough.
 *
 * Examples:
 * - resolveShortUrl("go/HR", [{ shortName: "hr", targetUrl: "https://hr.corp", owner: "bob", isActive: true }])
 *   => { status: "success", resolvedUrl: "https://hr.corp", ... }
 * - resolveShortUrl("go/emp/1045?view=pay", [{ shortName: "emp", targetUrl: "https://hrms.local/employee?id=%s", owner: "hr", isActive: true }])
 *   => { status: "success", resolvedUrl: "https://hrms.local/employee?id=1045&view=pay", ... }
 * - resolveShortUrl("go/vpn", [{ shortName: "vpn", targetUrl: "https://vpn.corp", owner: "it", isActive: false }])
 *   => { status: "inactive", owner: "it", ... }
 * - resolveShortUrl("go/unknown", [])
 *   => { status: "not_found", attemptedPath: "unknown", ... }
 */
export function resolveShortUrl<T extends BaseLink>(
  rawInput: string,
  links: T[]
): MatchResult<T> {
  const parsed = parseGoInput(rawInput);
  if (!parsed.cleanPath) {
    return {
      status: 'not_found',
      attemptedPath: '',
      cleanPath: '',
    };
  }

  const match = findMatchingLink(rawInput, links);

  if (!match) {
    return {
      status: 'not_found',
      attemptedPath: parsed.originalCasePath,
      cleanPath: parsed.cleanPath,
    };
  }

  const { link, matchedPrefix, remainder } = match;

  // Inactive links must not redirect, but return inactive status with owner's name
  if (!link.isActive) {
    return {
      status: 'inactive',
      link,
      owner: link.owner || 'Admin',
      attemptedPath: parsed.originalCasePath,
    };
  }

  const resolvedUrl = buildTargetUrl(
    link.targetUrl,
    remainder,
    parsed.queryString,
    parsed.hash
  );

  const isParameterMatch = Boolean(remainder);

  return {
    status: 'success',
    link,
    resolvedUrl,
    matchedPrefix,
    remainder,
    isParameterMatch,
  };
}
