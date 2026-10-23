/**
 * Test cases verifying the matching logic in resolver.ts
 *
 * To execute or inspect:
 * Can be run via tsx or node or imported in test runners.
 */
import {
  buildTargetUrl,
  findMatchingLink,
  isReservedShortName,
  parseGoInput,
  RESERVED_NAMES,
  resolveShortUrl,
} from './resolver';

// Sample dataset matching requirements
const testLinks = [
  {
    id: 'link-hr',
    shortName: 'hr',
    targetUrl: 'https://workday.company.internal/hr',
    owner: 'hr-team@company.internal',
    isActive: true,
  },
  {
    id: 'link-jira',
    shortName: 'jira',
    targetUrl: 'https://jira.company.local/browse',
    owner: 'eng-infra@company.internal',
    isActive: true,
  },
  {
    id: 'link-jira-special',
    shortName: 'jira/special',
    targetUrl: 'https://jira.company.local/special-desk',
    owner: 'eng-infra@company.internal',
    isActive: true,
  },
  {
    id: 'link-emp',
    shortName: 'emp',
    targetUrl: 'https://hrms.local/employee?id=%s',
    owner: 'hr-systems@company.internal',
    isActive: true,
  },
  {
    id: 'link-vpn',
    shortName: 'vpn',
    targetUrl: 'https://vpn.company.internal/login',
    owner: 'net-sec@company.internal',
    isActive: false, // Inactive link
  },
];

export function runResolverSelfTests(): { passed: number; total: number; errors: string[] } {
  const errors: string[] = [];
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    total++;
    if (condition) {
      passed++;
    } else {
      errors.push(`FAILED: ${testName} - ${JSON.stringify(details)}`);
    }
  }

  // 1. Case-insensitive matching (go/HR = go/hr)
  const hrUpper = resolveShortUrl('go/HR', testLinks);
  assert(
    hrUpper.status === 'success' && hrUpper.resolvedUrl === 'https://workday.company.internal/hr',
    'Requirement 1: Case-insensitive exact match (go/HR)',
    hrUpper
  );

  const hrMixed = resolveShortUrl('Go/Hr', testLinks);
  assert(
    hrMixed.status === 'success' && hrMixed.resolvedUrl === 'https://workday.company.internal/hr',
    'Requirement 1: Case-insensitive mixed case (Go/Hr)',
    hrMixed
  );

  // 2. Path passthrough & Longest configured prefix first
  // go/jira/PROJ-123 -> https://jira.company.local/browse/PROJ-123
  const jiraTicket = resolveShortUrl('go/jira/PROJ-123', testLinks);
  assert(
    jiraTicket.status === 'success' &&
      jiraTicket.resolvedUrl === 'https://jira.company.local/browse/PROJ-123',
    'Requirement 2: Path passthrough without placeholder',
    jiraTicket
  );

  // Longest configured prefix: "jira/special/123" must match "jira/special" instead of "jira"
  const jiraSpecial = resolveShortUrl('go/jira/special/TICKET-999', testLinks);
  assert(
    jiraSpecial.status === 'success' &&
      jiraSpecial.resolvedUrl === 'https://jira.company.local/special-desk/TICKET-999' &&
      jiraSpecial.matchedPrefix === 'jira/special',
    'Requirement 2: Longest prefix match preference',
    jiraSpecial
  );

  // 3. Parameterized links (%s placeholder in targetUrl)
  // go/emp/1045 with target https://hrms.local/employee?id=%s resolves to https://hrms.local/employee?id=1045
  const empLookup = resolveShortUrl('go/emp/1045', testLinks);
  assert(
    empLookup.status === 'success' &&
      empLookup.resolvedUrl === 'https://hrms.local/employee?id=1045',
    'Requirement 3: Parameterized %s substitution (go/emp/1045)',
    empLookup
  );

  // 4. Query string passthrough
  // append any ?query params from the go link to the target
  const jiraQuery = resolveShortUrl('go/jira/PROJ-123?view=detail&tab=comments', testLinks);
  assert(
    jiraQuery.status === 'success' &&
      jiraQuery.resolvedUrl ===
        'https://jira.company.local/browse/PROJ-123?view=detail&tab=comments',
    'Requirement 4: Query string passthrough without existing target params',
    jiraQuery
  );

  const empQuery = resolveShortUrl('go/emp/1045?view=full&session=active', testLinks);
  assert(
    empQuery.status === 'success' &&
      empQuery.resolvedUrl ===
        'https://hrms.local/employee?id=1045&view=full&session=active',
    'Requirement 4: Query string passthrough with existing target params (&)',
    empQuery
  );

  // 5. Inactive links show a "This link has been disabled" status with owner's name, not a redirect
  const vpnInactive = resolveShortUrl('go/vpn', testLinks);
  assert(
    vpnInactive.status === 'inactive' &&
      vpnInactive.owner === 'net-sec@company.internal',
    'Requirement 5: Inactive link returns inactive status and owner name',
    vpnInactive
  );

  // 7. Reserved names that cannot be used as shortNames
  for (const name of RESERVED_NAMES) {
    assert(
      isReservedShortName(name) && isReservedShortName(name.toUpperCase()),
      `Requirement 7: Reserved name "${name}" recognized`
    );
  }
  assert(!isReservedShortName('hr'), 'Requirement 7: Non-reserved "hr" allowed');
  assert(!isReservedShortName('jira'), 'Requirement 7: Non-reserved "jira" allowed');

  return { passed, total, errors };
}
