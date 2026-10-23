import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  buildTargetUrl,
  findMatchingLink,
  isReservedShortName,
  parseGoInput,
  resolveShortUrl,
} from '../shared/resolver';
import { validateShortNameFormat, validateTargetUrl } from '../shared/validation';
import { runResolverSelfTests } from '../src/utils/resolver.test';

const links = [
  { id: 'hr', shortName: 'hr', targetUrl: 'https://workday.company.internal/hr', owner: 'hr@co', isActive: true },
  { id: 'jira', shortName: 'jira', targetUrl: 'https://jira.company.local/browse', owner: 'eng@co', isActive: true },
  { id: 'jira-special', shortName: 'jira/special', targetUrl: 'https://jira.company.local/special-desk', owner: 'eng@co', isActive: true },
  { id: 'emp', shortName: 'emp', targetUrl: 'https://hrms.local/employee?id=%s', owner: 'people@co', isActive: true },
  { id: 'vpn', shortName: 'vpn', targetUrl: 'https://vpn.company.internal/login', owner: 'net-sec@co', isActive: false },
];

function resolvedUrl(input: string): string | undefined {
  const r = resolveShortUrl(input, links);
  return r.status === 'success' ? r.resolvedUrl : undefined;
}

describe('existing resolver self-tests (src/utils/resolver.test.ts)', () => {
  test('all pass', () => {
    const result = runResolverSelfTests();
    assert.deepEqual(result.errors, []);
    assert.equal(result.passed, result.total);
  });
});

describe('case-insensitive matching', () => {
  for (const input of ['hr', 'HR', 'Hr', 'go/HR', '/hr/', 'http://go/HR']) {
    test(input, () => assert.equal(resolvedUrl(input), 'https://workday.company.internal/hr'));
  }
});

describe('path passthrough', () => {
  test('appends remainder and preserves its case', () => {
    assert.equal(resolvedUrl('jira/PROJ-123'), 'https://jira.company.local/browse/PROJ-123');
    assert.equal(resolvedUrl('JIRA/PROJ-123'), 'https://jira.company.local/browse/PROJ-123');
  });
  test('longest configured prefix wins', () => {
    const r = resolveShortUrl('jira/special/T-9', links);
    assert.equal(r.status, 'success');
    if (r.status === 'success') {
      assert.equal(r.matchedPrefix, 'jira/special');
      assert.equal(r.resolvedUrl, 'https://jira.company.local/special-desk/T-9');
    }
  });
  test('prefix only matches on a segment boundary', () => {
    assert.equal(findMatchingLink('hrportal', links), null);
  });
  test('remainder is inserted before an existing target query string', () => {
    assert.equal(buildTargetUrl('https://a.local/base?x=1', 'sub', ''), 'https://a.local/base/sub?x=1');
  });
});

describe('%s parameters', () => {
  test('substitutes remainder', () => assert.equal(resolvedUrl('emp/1045'), 'https://hrms.local/employee?id=1045'));
  test('empty placeholder without remainder', () => assert.equal(resolvedUrl('emp'), 'https://hrms.local/employee?id='));
  test('{query} placeholder', () =>
    assert.equal(buildTargetUrl('https://search.local/?q={query}', 'abc', ''), 'https://search.local/?q=abc'));
});

describe('query passthrough', () => {
  test('to a target without a query', () =>
    assert.equal(resolvedUrl('jira/PROJ-1?view=full&tab=2'), 'https://jira.company.local/browse/PROJ-1?view=full&tab=2'));
  test('to a target that already has a query', () =>
    assert.equal(resolvedUrl('emp/1045?tab=pay'), 'https://hrms.local/employee?id=1045&tab=pay'));
  test('on an exact match', () => assert.equal(resolvedUrl('hr?ref=chat'), 'https://workday.company.internal/hr?ref=chat'));
  test('hash fragments are preserved', () =>
    assert.equal(resolvedUrl('jira/P-1?a=1#c'), 'https://jira.company.local/browse/P-1?a=1#c'));
  test('parseGoInput splits path, query and hash', () =>
    assert.deepEqual(parseGoInput('go/jira/PROJ-123?view=full#comment'), {
      cleanPath: 'jira/proj-123',
      originalCasePath: 'jira/PROJ-123',
      queryString: 'view=full',
      hash: 'comment',
    }));
});

describe('inactive links', () => {
  test('return inactive status with owner, no URL', () => {
    const r = resolveShortUrl('VPN', links);
    assert.equal(r.status, 'inactive');
    if (r.status === 'inactive') assert.equal(r.owner, 'net-sec@co');
  });
  test('sub-paths of an inactive link are inactive too', () => {
    assert.equal(resolveShortUrl('vpn/anything', links).status, 'inactive');
  });
});

describe('not found', () => {
  test('unknown name', () => {
    const r = resolveShortUrl('nope/abc', links);
    assert.equal(r.status, 'not_found');
    if (r.status === 'not_found') assert.equal(r.attemptedPath, 'nope/abc');
  });
  test('empty input', () => assert.equal(resolveShortUrl('', links).status, 'not_found'));
});

describe('reserved names', () => {
  for (const name of ['api', 'assets', 'admin', 'dashboard', 'directory', 'my-links', 'audit-log', 'help', 'setup-guide', 'details', 'link', 'edit', 'create']) {
    test(`${name} is reserved (any case, any sub-path)`, () => {
      assert.ok(isReservedShortName(name));
      assert.ok(isReservedShortName(name.toUpperCase() + '/x'));
      assert.equal(validateShortNameFormat(name).valid, false);
    });
  }
  test('"go" alone is reserved; "go/x" is just the go/ prefix for "x"', () => {
    assert.ok(isReservedShortName('go'));
    assert.equal(validateShortNameFormat('go').valid, false);
    assert.equal(isReservedShortName('go/hr'), false);
  });
  test('normal names are allowed', () => {
    for (const name of ['hr', 'jira', 'it-help', 'team/docs', 'apis', 'golinks']) {
      assert.equal(validateShortNameFormat(name).valid, true, name);
    }
  });
});

describe('validation', () => {
  test('shortName rules', () => {
    assert.equal(validateShortNameFormat('a').valid, false);
    assert.equal(validateShortNameFormat('x'.repeat(51)).valid, false);
    assert.equal(validateShortNameFormat('has space').valid, false);
    assert.equal(validateShortNameFormat('a//b').valid, false);
    assert.equal(validateShortNameFormat('Go/HR').valid, true); // normalized to "hr"
  });
  test('target URL must be http(s)', () => {
    assert.equal(validateTargetUrl('https://ok.local/x').valid, true);
    assert.equal(validateTargetUrl('http://ok.local/?id=%s').valid, true);
    assert.equal(validateTargetUrl('javascript:alert(1)').valid, false);
    assert.equal(validateTargetUrl('ftp://files.local').valid, false);
    assert.equal(validateTargetUrl('not a url').valid, false);
    assert.equal(validateTargetUrl('').valid, false);
  });
});
