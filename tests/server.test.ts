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

let server: Server;
let db: DB;
let base: string;
const staticDir = fs.mkdtempSync(path.join(os.tmpdir(), 'golinks-static-'));
const SPA_MARKER = '<div id="root"></div><!-- golinks-spa -->';

const ADMIN = { 'X-GoLinks-User-Id': 'user_admin' };
const EMPLOYEE = { 'X-GoLinks-User-Id': 'user_nikhil' };

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
  };
  server = createApp(db, config).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
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

    const exported = await fetch(base + '/api/export');
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
