import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import { createApp } from '../server/app';
import { ServerConfig } from '../server/config';
import { DB, openDatabase } from '../server/db/database';
import { setPasswordHash } from '../server/repositories/userRepository';
import { hashPassword } from '../server/security/passwords';

let server: Server;
let db: DB;
let base: string;
const staticDir = fs.mkdtempSync(path.join(os.tmpdir(), 'golinks-static-'));
const SPA_MARKER = '<div id="root"></div><!-- golinks-spa -->';

// Session cookies, filled in by signing in during before().
let ADMIN: Record<string, string> = {};
let EMPLOYEE: Record<string, string> = {};
let OTHER_EMPLOYEE: Record<string, string> = {};
const PASSWORD = 'correct-horse-battery';

/** Signs in and returns a { Cookie } header for that session. */
async function signIn(email: string, password = PASSWORD): Promise<Record<string, string>> {
  const res = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(res.status, 200, `sign in as ${email}`);
  const cookie = (res.headers.get('set-cookie') || '').split(';')[0];
  assert.match(cookie, /^golinks_session=/);
  return { Cookie: cookie };
}

before(async () => {
  fs.mkdirSync(path.join(staticDir, 'assets'));
  fs.writeFileSync(path.join(staticDir, 'index.html'), `<!doctype html><html><body>${SPA_MARKER}</body></html>`);
  fs.writeFileSync(path.join(staticDir, 'assets', 'app.js'), 'console.log(1)');

  db = openDatabase(':memory:', { seedSampleData: true });
  const config: ServerConfig = {
    host: '127.0.0.1',
    port: 0,
    dbPath: ':memory:',
    staticDir,
    seedSampleData: true,
    allowDataReset: false,
    trustProxy: false,
    logRequests: false,
    sessionTtlHours: 12,
    cookieSecure: false,
    clickRetentionDays: 365,
    bootstrapAdmin: null,
    demoMode: false,
  };
  server = createApp(db, config).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  for (const id of ['user_admin', 'user_nikhil', 'user_sarah']) setPasswordHash(db, id, hashPassword(PASSWORD));
  ADMIN = await signIn('admin@company.internal');
  EMPLOYEE = await signIn('nikhil.nawale01@gmail.com');
  OTHER_EMPLOYEE = await signIn('hr-ops@company.internal');
});

after(() => {
  server.close();
  db.close();
  fs.rmSync(staticDir, { recursive: true, force: true });
});

const get = (p: string, init: RequestInit = {}) => fetch(base + p, { redirect: 'manual', ...init });

async function api(method: string, p: string, body?: unknown, headers: Record<string, string> = ADMIN) {
  const res = await fetch(base + '/api' + p, {
    method,
    headers: { ...headers, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : undefined };
}

function clickCount(shortName: string): number {
  return (db.prepare('SELECT click_count FROM links WHERE short_name = ?').get(shortName) as { click_count: number })
    .click_count;
}

async function expectRedirect(p: string, location: string) {
  const res = await get(p);
  assert.equal(res.status, 302, `${p} status`);
  assert.equal(res.headers.get('location'), location, `${p} location`);
}

async function expectSpa(p: string, status: number) {
  const res = await get(p);
  assert.equal(res.status, status, `${p} status`);
  assert.ok((await res.text()).includes(SPA_MARKER), `${p} serves the SPA`);
}

describe('redirect routes', () => {
  test('exact match → 302', () => expectRedirect('/hr', 'https://workday.company.internal/hr/portal'));

  test('case-insensitive', async () => {
    await expectRedirect('/HR', 'https://workday.company.internal/hr/portal');
    await expectRedirect('/Payroll', 'https://adp.company.internal/portal/payroll');
  });

  test('trailing slash', () => expectRedirect('/wiki/', 'https://confluence.company.internal/display/KNOWLEDGE'));

  test('path passthrough', async () => {
    await expectRedirect('/jira/PROJ-123', 'https://jira.company.local/browse/PROJ-123');
    await expectRedirect('/JIRA/PROJ-123/comments', 'https://jira.company.local/browse/PROJ-123/comments');
  });

  test('encoded path segments pass through untouched', () =>
    expectRedirect('/jira/A%20B', 'https://jira.company.local/browse/A%20B'));

  test('%s parameters', () => expectRedirect('/emp/1045', 'https://hrms.local/employee?id=1045'));

  test('query passthrough', async () => {
    await expectRedirect('/jira/PROJ-123?view=full&tab=2', 'https://jira.company.local/browse/PROJ-123?view=full&tab=2');
    await expectRedirect('/emp/1045?tab=pay', 'https://hrms.local/employee?id=1045&tab=pay');
    await expectRedirect('/hr?ref=chat', 'https://workday.company.internal/hr/portal?ref=chat');
  });

  test('go/ prefix alias', () => expectRedirect('/go/hr', 'https://workday.company.internal/hr/portal'));

  test('redirect is not cacheable', async () => {
    const res = await get('/hr');
    assert.match(res.headers.get('cache-control') || '', /no-store/);
  });

  test('GET increments clickCount and lastAccessedAt; HEAD does not', async () => {
    const before = clickCount('timesheet');
    await get('/timesheet');
    assert.equal(clickCount('timesheet'), before + 1);
    const row = db.prepare('SELECT last_accessed_at FROM links WHERE short_name = ?').get('timesheet') as {
      last_accessed_at: string;
    };
    assert.ok(Date.now() - Date.parse(row.last_accessed_at) < 5000);

    await get('/timesheet', { method: 'HEAD' });
    assert.equal(clickCount('timesheet'), before + 1);
  });

  test('not found → SPA with 404', () => expectSpa('/does-not-exist', 404));

  test('not found sub-path → SPA with 404', () => expectSpa('/nope/abc?x=1', 404));

  test('inactive link → SPA with 410, no click recorded', async () => {
    const { status } = await api('PUT', '/links/seed-10-vpn', { isActive: false });
    assert.equal(status, 200);
    const before = clickCount('vpn');
    await expectSpa('/vpn', 410);
    await expectSpa('/VPN/setup', 410);
    assert.equal(clickCount('vpn'), before);
    await api('PUT', '/links/seed-10-vpn', { isActive: true });
    await expectRedirect('/vpn', 'https://vpn.company.internal/instructions/globalprotect');
  });

  test('app page routes are never treated as go links', async () => {
    // Even if such a row sneaks into the DB (e.g. a legacy import), the SPA wins.
    db.prepare(
      `INSERT INTO links (id, short_name, target_url, owner, created_at, updated_at)
       VALUES ('rogue', 'dashboard', 'https://evil.local', 'x', '2025-01-01', '2025-01-01')`
    ).run();
    for (const p of ['/', '/dashboard', '/directory', '/my-links', '/audit-log', '/help', '/setup-guide', '/create', '/edit/abc', '/details/abc', '/link/abc', '/go']) {
      await expectSpa(p, 200);
    }
    db.prepare("DELETE FROM links WHERE id = 'rogue'").run();
  });

  test('/assets and /api are never treated as go links', async () => {
    const asset = await get('/assets/app.js');
    assert.equal(asset.status, 200);
    assert.equal(await asset.text(), 'console.log(1)');
    assert.equal((await get('/assets/missing.js')).status, 404);
    const apiMissing = await get('/api/nope');
    assert.equal(apiMissing.status, 404);
    assert.deepEqual(await apiMissing.json(), { error: 'Unknown API endpoint.' });
  });

  test('static file paths (with a dot) are not go links', () => expectSpa('/favicon.ico', 200));
});

describe('API', () => {
  test('GET /api/links returns seeded links sorted by clicks', async () => {
    const { status, body } = await api('GET', '/links');
    assert.equal(status, 200);
    assert.ok(body.length >= 11);
    assert.ok(body[0].clickCount >= body[1].clickCount);
  });

  test('GET /api/links filters', async () => {
    const { body } = await api('GET', '/links?category=HR&sortBy=name');
    const names = body.map((l: { shortName: string }) => l.shortName);
    assert.ok(body.every((l: { category: string }) => l.category === 'HR'));
    assert.deepEqual(names, [...names].sort());
    const byName = await api('GET', '/links?shortName=GO/JIRA');
    assert.equal(byName.body.length, 1);
    assert.equal(byName.body[0].id, 'seed-06-jira');
  });

  test('GET /api/resolve/* mirrors redirect logic and records clicks', async () => {
    const before = clickCount('jira');
    const { status, body } = await api('GET', '/resolve/JIRA/PROJ-9?view=1');
    assert.equal(status, 200);
    assert.equal(body.found, true);
    assert.equal(body.resolvedUrl, 'https://jira.company.local/browse/PROJ-9?view=1');
    assert.equal(clickCount('jira'), before + 1);

    const missing = await api('GET', '/resolve/hrr');
    assert.equal(missing.status, 404);
    assert.equal(missing.body.found, false);
    assert.ok(missing.body.suggestions.some((s: { shortName: string }) => s.shortName === 'hr'));
  });

  test('create requires an identity', async () => {
    const { status } = await api('POST', '/links', { shortName: 'anon', targetUrl: 'https://a.local' }, {});
    assert.equal(status, 401);
  });

  test('create validates shortName, reserved names, URL and uniqueness', async () => {
    const cases: Array<[unknown, number]> = [
      [{ shortName: 'x', targetUrl: 'https://a.local' }, 400],
      [{ shortName: 'bad name', targetUrl: 'https://a.local' }, 400],
      [{ shortName: 'api', targetUrl: 'https://a.local' }, 400],
      [{ shortName: 'dashboard', targetUrl: 'https://a.local' }, 400],
      [{ shortName: 'okname', targetUrl: 'javascript:alert(1)' }, 400],
      [{ shortName: 'okname', targetUrl: 'not a url' }, 400],
      [{ shortName: 'okname' }, 400],
      [{ shortName: 'okname', targetUrl: 'https://a.local', isActive: 'yes' }, 400],
      [{ shortName: 'HR', targetUrl: 'https://a.local' }, 409],
      [[1, 2], 400],
    ];
    for (const [body, expected] of cases) {
      const res = await api('POST', '/links', body, EMPLOYEE);
      assert.equal(res.status, expected, JSON.stringify(body));
      assert.ok(res.body.error);
    }
  });

  test('create → read → update → delete, with audit trail', async () => {
    const created = await api(
      'POST',
      '/links',
      { shortName: 'Go/Team-Docs', targetUrl: 'https://docs.local', category: 'Engineering', tags: ['a', 'a', 'b'], owner: 'someone@else' },
      EMPLOYEE
    );
    assert.equal(created.status, 201);
    assert.equal(created.body.shortName, 'team-docs');
    assert.equal(created.body.owner, 'nikhil.nawale01@gmail.com'); // employees always own their links
    assert.deepEqual(created.body.tags, ['a', 'b']);
    const id = created.body.id;

    await expectRedirect('/team-docs/page', 'https://docs.local/page');

    assert.equal((await api('GET', `/links/${id}`)).body.shortName, 'team-docs');

    // employees cannot edit others' links or reassign ownership
    assert.equal((await api('PUT', '/links/seed-01-hr', { targetUrl: 'https://x.local' }, EMPLOYEE)).status, 403);
    assert.equal((await api('PUT', `/links/${id}`, { owner: 'admin@company.internal' }, EMPLOYEE)).status, 403);

    const updated = await api('PUT', `/links/${id}`, { targetUrl: 'https://docs2.local' }, EMPLOYEE);
    assert.equal(updated.status, 200);
    await expectRedirect('/team-docs', 'https://docs2.local');

    assert.equal((await api('PUT', `/links/${id}`, { shortName: 'wiki' }, EMPLOYEE)).status, 409);

    const audit = await api('GET', '/audit?shortName=team-docs');
    assert.deepEqual(audit.body.map((e: { action: string }) => e.action).sort(), ['create', 'edit']);

    assert.equal((await api('DELETE', `/links/${id}`, undefined, EMPLOYEE)).status, 204);
    assert.equal((await api('GET', `/links/${id}`)).status, 404);
    assert.equal((await api('DELETE', `/links/${id}`)).status, 404);
    await expectSpa('/team-docs', 404);
  });

  test('GET /api/links/validate', async () => {
    assert.deepEqual((await api('GET', '/links/validate?shortName=brand-new')).body, { valid: true });
    assert.equal((await api('GET', '/links/validate?shortName=HR')).body.valid, false);
    assert.equal((await api('GET', '/links/validate?shortName=hr&excludeId=seed-01-hr')).body.valid, true);
    assert.equal((await api('GET', '/links/validate?shortName=assets')).body.valid, false);
  });

  test('audit is admin only', async () => {
    assert.equal((await api('GET', '/audit', undefined, EMPLOYEE)).status, 403);
    assert.equal((await api('GET', '/audit')).status, 200);
  });

  test('import (admin only) validates rows; export round-trips', async () => {
    assert.equal((await api('POST', '/import', { links: [] }, EMPLOYEE)).status, 403);

    const res = await api('POST', '/import', {
      mode: 'create',
      links: [
        { shortName: 'imp-one', targetUrl: 'https://one.local', description: 'one', category: 'IT' },
        { shortName: 'hr', targetUrl: 'https://dup.local' },
        { shortName: 'static', targetUrl: 'https://reserved.local' },
        { shortName: 'imp-bad', targetUrl: 'ftp://bad' },
      ],
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.imported, 1);
    assert.deepEqual(res.body.skipped.map((s: { index: number }) => s.index), [1, 2, 3]);

    assert.equal((await fetch(base + '/api/export')).status, 401);
    assert.equal((await fetch(base + '/api/export', { headers: EMPLOYEE })).status, 403);
    const exported = await fetch(base + '/api/export', { headers: ADMIN });
    assert.match(exported.headers.get('content-disposition') || '', /attachment/);
    const all = await exported.json();
    const one = all.find((l: { shortName: string }) => l.shortName === 'imp-one');
    const upsert = await api('POST', '/import', [{ ...one, targetUrl: 'https://one-v2.local' }]);
    assert.equal(upsert.body.updated, 1);
    assert.equal((await api('GET', `/links/${one.id}`)).body.targetUrl, 'https://one-v2.local');
  });

  test('stats', async () => {
    const { body } = await api('GET', '/stats');
    assert.ok(body.totalLinks >= 11);
    assert.equal(body.totalLinks, body.activeLinks + body.inactiveLinks);
    assert.ok(body.topLinks.length > 0);
  });

  test('reset is disabled unless ALLOW_DATA_RESET=true', async () => {
    assert.equal((await api('POST', '/reset')).status, 403);
    assert.equal((await api('POST', '/audit/reset')).status, 403);
  });

  test('malformed JSON → 400', async () => {
    const res = await fetch(base + '/api/links', {
      method: 'POST',
      headers: { ...ADMIN, 'Content-Type': 'application/json' },
      body: '{bad',
    });
    assert.equal(res.status, 400);
  });
});

describe('sign-in and sessions', () => {
  test('the old self-asserted header grants nothing', async () => {
    const res = await api('POST', '/links', { shortName: 'spoofed', targetUrl: 'https://a.local' }, {
      'X-GoLinks-User-Id': 'user_admin',
    });
    assert.equal(res.status, 401);
  });

  test('wrong password, unknown email and password-less accounts all get the same 401', async () => {
    for (const [email, password] of [
      ['admin@company.internal', 'wrong-password'],
      ['nobody@company.internal', PASSWORD],
      ['finance-ops@company.internal', PASSWORD], // seeded user with no password
    ]) {
      const res = await api('POST', '/auth/login', { email, password }, {});
      assert.equal(res.status, 401, email);
      assert.equal(res.body.error, 'Incorrect email or password.');
    }
  });

  test('session cookie is httpOnly and SameSite=Lax', async () => {
    const res = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ADMIN@company.internal', password: PASSWORD }),
    });
    const cookie = res.headers.get('set-cookie') || '';
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);
  });

  test('demo accounts are not published unless DEMO_MODE is on', async () => {
    assert.deepEqual((await api('GET', '/auth/demo', undefined, {})).body, { enabled: false, accounts: [] });
  });

  test('/auth/me and logout', async () => {
    const session = await signIn('admin@company.internal');
    assert.equal((await api('GET', '/auth/me', undefined, session)).body.email, 'admin@company.internal');
    assert.equal((await api('GET', '/auth/me', undefined, {})).status, 401);
    assert.equal((await api('POST', '/auth/logout', undefined, session)).status, 204);
    assert.equal((await api('GET', '/auth/me', undefined, session)).status, 401);
  });

  test('repeated failures are rate limited', async () => {
    let last = 0;
    for (let i = 0; i < 11; i++) {
      last = (await api('POST', '/auth/login', { email: 'ratelimit@company.internal', password: 'nope-nope' }, {})).status;
    }
    assert.equal(last, 429);
  });

  test('change password signs out other sessions', async () => {
    const a = await signIn('hr-ops@company.internal');
    const b = await signIn('hr-ops@company.internal');
    assert.equal((await api('POST', '/auth/password', { currentPassword: 'wrong-one', newPassword: 'new-password-1' }, a)).status, 400);
    assert.equal((await api('POST', '/auth/password', { currentPassword: PASSWORD, newPassword: 'short' }, a)).status, 400);
    assert.equal((await api('POST', '/auth/password', { currentPassword: PASSWORD, newPassword: 'new-password-1' }, a)).status, 204);
    assert.equal((await api('GET', '/auth/me', undefined, a)).status, 200);
    assert.equal((await api('GET', '/auth/me', undefined, b)).status, 401);
    // put it back for other tests
    setPasswordHash(db, 'user_sarah', hashPassword(PASSWORD));
    OTHER_EMPLOYEE = await signIn('hr-ops@company.internal');
  });

  test('cross-site writes are blocked', async () => {
    const res = await fetch(base + '/api/links', {
      method: 'POST',
      headers: { ...ADMIN, 'Content-Type': 'application/json', Origin: 'http://evil.example' },
      body: JSON.stringify({ shortName: 'csrf-link', targetUrl: 'https://a.local' }),
    });
    assert.equal(res.status, 403);
    const sameOrigin = await fetch(base + '/api/links/validate?shortName=x1', { headers: { ...ADMIN, Origin: base } });
    assert.equal(sameOrigin.status, 200);
  });
});

describe('user management', () => {
  test('admin only, and /api/users no longer leaks ids to anonymous callers', async () => {
    assert.equal((await api('GET', '/users', undefined, {})).status, 401);
    assert.equal((await api('GET', '/users', undefined, EMPLOYEE)).status, 403);
    const { body } = await api('GET', '/users');
    assert.ok(body.length >= 4);
    assert.ok(body.every((u: Record<string, unknown>) => !('passwordHash' in u) && !('password_hash' in u)));
  });

  test('create user, sign in, deactivate → signed out', async () => {
    const created = await api('POST', '/users', {
      name: 'New Person',
      email: 'New.Person@company.internal',
      role: 'employee',
      department: 'Ops',
      password: 'a-good-password',
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.email, 'new.person@company.internal');
    assert.equal((await api('POST', '/users', { name: 'Dup', email: 'new.person@company.internal', password: 'a-good-password' })).status, 409);

    const session = await signIn('new.person@company.internal', 'a-good-password');
    assert.equal((await api('PUT', `/users/${created.body.id}`, { isActive: false })).status, 200);
    assert.equal((await api('GET', '/auth/me', undefined, session)).status, 401);
    assert.equal((await api('POST', '/auth/login', { email: 'new.person@company.internal', password: 'a-good-password' }, {})).status, 401);
  });

  test('cannot remove the last admin who can sign in', async () => {
    assert.equal((await api('PUT', '/users/user_admin', { role: 'employee' })).status, 400);
    assert.equal((await api('PUT', '/users/user_admin', { isActive: false })).status, 400);
  });
});

describe('private links', () => {
  let privateId = '';

  before(async () => {
    const res = await api('POST', '/links', { shortName: 'secret-plan', targetUrl: 'https://secret.local', visibility: 'private' }, EMPLOYEE);
    assert.equal(res.status, 201);
    privateId = res.body.id;
  });

  test('hidden from other employees and anonymous users everywhere', async () => {
    for (const who of [OTHER_EMPLOYEE, {}]) {
      const list = await api('GET', '/links', undefined, who);
      assert.ok(!list.body.some((l: { id: string }) => l.id === privateId));
      assert.equal((await api('GET', `/links/${privateId}`, undefined, who)).status, 404);
      assert.equal((await api('GET', '/resolve/secret-plan', undefined, who)).status, 404);
      const redirect = await get('/secret-plan', { headers: who });
      assert.equal(redirect.status, 404);
    }
    assert.equal((await api('PUT', `/links/${privateId}`, { targetUrl: 'https://x.local' }, OTHER_EMPLOYEE)).status, 404);
    assert.equal((await api('DELETE', `/links/${privateId}`, undefined, OTHER_EMPLOYEE)).status, 404);
  });

  test('visible to the owner and admins', async () => {
    for (const who of [EMPLOYEE, ADMIN]) {
      assert.equal((await api('GET', `/links/${privateId}`, undefined, who)).status, 200);
      const redirect = await get('/secret-plan', { headers: who });
      assert.equal(redirect.status, 302);
      assert.equal(redirect.headers.get('location'), 'https://secret.local');
    }
  });

  test('duplicate check does not reveal the private owner', async () => {
    const res = await api('GET', '/links/validate?shortName=secret-plan', undefined, OTHER_EMPLOYEE);
    assert.equal(res.body.valid, false);
    assert.doesNotMatch(res.body.error, /nikhil/);
    const create = await api('POST', '/links', { shortName: 'secret-plan', targetUrl: 'https://a.local' }, OTHER_EMPLOYEE);
    assert.equal(create.status, 409);
    assert.doesNotMatch(create.body.error, /nikhil/);
  });

  test('stats only count what you can see', async () => {
    const mine = (await api('GET', '/stats', undefined, EMPLOYEE)).body.totalLinks;
    const theirs = (await api('GET', '/stats', undefined, OTHER_EMPLOYEE)).body.totalLinks;
    assert.equal(mine, theirs + 1);
  });
});

describe('insights', () => {
  test('missing links are recorded, admin-only, and drop off once created', async () => {
    await get('/payroll-help');
    await get('/payroll-help');
    await get('/PAYROLL-HELP/anything');
    await get('/x'); // too short to be a valid name: not recorded

    assert.equal((await api('GET', '/insights/missing', undefined, EMPLOYEE)).status, 403);
    let list = (await api('GET', '/insights/missing')).body as Array<{ shortName: string; requestCount: number }>;
    assert.equal(list.find((i) => i.shortName === 'payroll-help')?.requestCount, 3);
    assert.ok(!list.some((i) => i.shortName === 'x'));

    await api('POST', '/links', { shortName: 'payroll-help', targetUrl: 'https://help.local' });
    list = (await api('GET', '/insights/missing')).body;
    assert.ok(!list.some((i) => i.shortName === 'payroll-help'));

    await get('/typo-name');
    assert.equal((await api('DELETE', '/insights/missing/typo-name')).status, 204);
    assert.ok(!(await api('GET', '/insights/missing')).body.some((i: { shortName: string }) => i.shortName === 'typo-name'));
  });

  test('click history per day, per link and overall', async () => {
    await get('/holidays');
    await get('/holidays', { headers: EMPLOYEE });

    const series = (await api('GET', '/links/seed-09-holidays/clicks?days=7')).body as Array<{
      date: string;
      clicks: number;
      uniqueUsers: number;
    }>;
    assert.equal(series.length, 7);
    const today = series[series.length - 1];
    assert.equal(today.date, new Date().toISOString().slice(0, 10));
    assert.ok(today.clicks >= 2);
    assert.ok(today.uniqueUsers >= 1);

    const stats = (await api('GET', '/stats')).body;
    assert.equal(stats.dailyClicks.length, 30);
    assert.ok(stats.dailyClicks[29].clicks >= 2);
  });

  test('deleting a link removes its click history', async () => {
    const created = await api('POST', '/links', { shortName: 'temp-clicks', targetUrl: 'https://t.local' });
    await get('/temp-clicks');
    const count = () =>
      (db.prepare('SELECT COUNT(*) AS n FROM click_events WHERE link_id = ?').get(created.body.id) as { n: number }).n;
    assert.equal(count(), 1);
    await api('DELETE', `/links/${created.body.id}`);
    assert.equal(count(), 0);
  });
});

describe('demo mode', () => {
  test('known passwords when on, retracted when switched off', async () => {
    const { applyDemoMode, getDemoAccounts } = await import('../server/db/demo');
    const demoDb = openDatabase(':memory:', { seedSampleData: true, demoMode: true });
    const accounts = getDemoAccounts(demoDb);
    assert.deepEqual(accounts.map((a) => a.role).sort(), ['admin', 'employee']);
    const { getUserCredentials } = await import('../server/repositories/userRepository');
    const { verifyPassword } = await import('../server/security/passwords');
    for (const a of accounts) assert.ok(verifyPassword(a.password, getUserCredentials(demoDb, a.email)?.passwordHash));

    const log = applyDemoMode(demoDb, false);
    assert.equal(log.length, 2);
    for (const a of accounts) assert.equal(getUserCredentials(demoDb, a.email)?.passwordHash, null);
    demoDb.close();
  });
});
