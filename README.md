# GoLinks — internal URL shortcuts for the company LAN

Type `go/hr`, `go/jira/PROJ-123` or `go/emp/1045` in a browser and land on the right internal page.

- **React + TypeScript + Tailwind** UI (Vite) for creating, browsing and managing links
- **Node.js + Express** server that answers go links with a real **HTTP 302** before the UI loads
- **SQLite** (better-sqlite3) storage with migrations, audit log and online backups
- One process, one port, one database file. Docker image included.

```
Browser ──GET /jira/PROJ-123──▶ Express ──302 Location: https://jira.company.local/browse/PROJ-123
                                  │
                                  ├─ /api/*        REST API (JSON)
                                  ├─ /assets/*     built React assets
                                  ├─ /:shortName*  go-link resolver → 302, or the SPA's
                                  │                "Link not found" (404) / "disabled" (410) page
                                  └─ everything else → React app (dashboard, directory, …)
```

## Contents

1. [Project layout](#project-layout)
2. [Local development](#local-development)
3. [Production build & start](#production-build--start)
4. [Docker](#docker)
5. [Configuration](#configuration)
6. [Database: migrations, seeding, backup & restore](#database)
7. [Network setup (DNS, browsers)](#network-setup)
8. [How links resolve](#how-links-resolve)
9. [REST API](#rest-api)
10. [Identity & permissions](#identity--permissions)
11. [Tests](#tests)

## Project layout

```
shared/            Code used by both browser and server
  resolver.ts      Go-link matching rules (case-insensitive, longest prefix, %s, query passthrough)
  validation.ts    shortName / URL validation
  fuzzyMatch.ts    "Did you mean…" suggestions
  seedData.ts      Sample links + audit events
  types/           GoLink, AuditLogEntry, User types
server/
  index.ts         Entry point (reads .env, opens DB, listens)
  app.ts           Express app: /api → /assets → go-link redirects → SPA fallback
  routes/          api.ts (REST), redirect.ts (302 handler)
  services/        Business logic, server-side validation, RBAC
  repositories/    SQLite queries
  db/              migrations.ts, seed.ts, database.ts, cli.ts (migrate | seed | backup)
src/               React app (services/linkService.ts now calls the REST API)
tests/             node:test suites for the resolver and the HTTP server
```

## Local development

Requirements: **Node.js 20+** (22 LTS recommended) and npm.

```bash
npm install
cp .env.example .env          # optional for dev; defaults work

# terminal 1 — API + redirect server on http://localhost:3001 (auto-restarts on change)
npm run dev:server

# terminal 2 — React dev server with hot reload on http://localhost:3000 (proxies /api → :3001)
npm run dev
```

- Open http://localhost:3000 for the UI.
- Try real redirects against the server directly: `curl -I http://localhost:3001/hr`.
- The dev database lives at `./data/golinks.db` and is seeded with sample links the first time.

Useful scripts:

| Script | What it does |
| --- | --- |
| `npm run lint` | Type-check client (`tsconfig.json`) and server (`server/tsconfig.json`) |
| `npm test` | Run resolver + server tests |
| `npm run build` | Build React app → `dist/`, bundle server → `dist-server/` |
| `npm start` | Run the production server (`node dist-server/index.js`) |
| `npm run db:migrate` / `db:seed` / `db:backup` | Database maintenance (see below) |

## Production build & start

```bash
npm ci
npm run build
npm prune --omit=dev          # optional: drop build-only packages
cp .env.example .env          # then edit: PORT, DB_PATH, ...
npm start
```

`npm start` serves the UI, API and redirects on `PORT` (default **80**).

### Listening on port 80 without root (Linux)

Ports below 1024 are privileged. Pick one option:

- **systemd (recommended)** — `/etc/systemd/system/golinks.service`:

  ```ini
  [Unit]
  Description=GoLinks
  After=network.target

  [Service]
  WorkingDirectory=/opt/golinks
  ExecStart=/usr/bin/node dist-server/index.js
  User=golinks
  AmbientCapabilities=CAP_NET_BIND_SERVICE
  Restart=always
  Environment=NODE_ENV=production

  [Install]
  WantedBy=multi-user.target
  ```

  `sudo systemctl enable --now golinks`, logs via `journalctl -u golinks -f`.

- **setcap** — `sudo setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(which node)")"` (applies to every script run by that node binary).
- **Docker** — see below; the container listens on 8080 and Docker publishes it on host port 80.

On **Windows Server**, Docker Desktop or a service wrapper such as NSSM works; make sure IIS (or anything else) is not already bound to port 80, and allow inbound TCP 80 in Windows Firewall.

## Docker

```bash
cp .env.example .env          # optional; HOST_PORT controls the published port (default 80)
docker compose up -d --build
docker compose logs -f
```

- The image is multi-stage: it type-checks, runs the tests and builds inside the build stage, and the runtime stage contains only production dependencies plus the built output, running as the non-root `node` user.
- The SQLite database is stored at `/data/golinks.db` on the named volume **`golinks-data`**, so it survives `docker compose down`, rebuilds and upgrades. (`docker compose down -v` **deletes** it.)
- Health check: `GET /api/health` (shown in `docker ps`).
- Upgrade: `git pull && docker compose up -d --build`. Migrations run automatically at start-up.

## Configuration

All settings come from environment variables (or `.env`). See [`.env.example`](.env.example).

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `80` | HTTP port. In Docker the container uses 8080; set `HOST_PORT` instead. |
| `HOST` | `0.0.0.0` | Interface to bind. |
| `DB_PATH` | `./data/golinks.db` | SQLite file (directory is created automatically). |
| `STATIC_DIR` | `./dist` | Built React app. |
| `SEED_SAMPLE_DATA` | `true` | Seed sample links when the database is first created. |
| `ALLOW_DATA_RESET` | `false` | Enables the admin "Reset sample shortcuts" / audit-reset buttons. Leave `false` in production. |
| `TRUST_PROXY` | `false` | Set `true` behind a reverse proxy. |
| `LOG_REQUESTS` | `true` | One log line per request, including the 302 target. |
| `HOST_PORT` | `80` | Docker only: host port published by compose. |
| `VITE_API_PROXY_TARGET` | `http://localhost:3001` | Dev only: where Vite proxies `/api`. |
| `VITE_API_BASE_URL` | *(empty)* | Build-time: API origin if not same-origin. |

## Database

Schema (see `server/db/migrations.ts`):

- `links`: one row per go link. `UNIQUE INDEX idx_links_short_name_lower ON links(lower(short_name))` guarantees case-insensitive uniqueness.
- `users`: directory users (currently the four mock identities from the UI).
- `audit_log`: every create / edit / delete / (de)activate / owner reassignment / import, written in the same transaction as the change.
- `schema_migrations`: applied migration versions.

**Migrations** run automatically every time the server starts. To run them manually:

```bash
npm run db:migrate                      # dev (tsx)
node dist-server/db/cli.js migrate      # production build
```

To change the schema, append a new entry with the next `version` to `MIGRATIONS`. Never edit one that has already shipped.

**Seeding**: a brand-new database gets the sample links automatically (unless `SEED_SAMPLE_DATA=false`). To re-add any missing sample links later: `npm run db:seed` (existing shortNames are left alone).

### Backup

The database runs in WAL mode, so **don't just copy the `.db` file while the server is running**. Use the online backup command, which is safe while the server keeps serving:

```bash
# bare metal
node dist-server/db/cli.js backup                       # → data/backups/golinks-<timestamp>.db
node dist-server/db/cli.js backup /mnt/backup/golinks.db

# Docker
docker compose exec golinks node dist-server/db/cli.js backup /data/backups/golinks-$(date +%F).db
docker compose cp golinks:/data/backups/golinks-$(date +%F).db ./
```

Nightly cron example (host running Docker):

```cron
15 2 * * * cd /opt/golinks && docker compose exec -T golinks node dist-server/db/cli.js backup /data/backups/golinks-$(date +\%F).db && docker compose cp golinks:/data/backups/golinks-$(date +\%F).db /srv/backups/
```

An application-level JSON export is also available at `GET /api/export` (and can be re-imported with `POST /api/import`).

### Restore

Bare metal:

1. `systemctl stop golinks` (or stop the process).
2. Replace `data/golinks.db` with the backup and delete `golinks.db-wal` / `golinks.db-shm` if they exist.
3. Start the server again.

Docker (the volume is named `<project>_golinks-data`, usually `golinks_golinks-data`; check with `docker volume ls`):

```bash
docker compose stop
docker run --rm -v golinks_golinks-data:/data -v "$PWD":/backup alpine \
  sh -c 'rm -f /data/golinks.db-wal /data/golinks.db-shm && cp /backup/golinks-2026-01-01.db /data/golinks.db && chown 1000:1000 /data/golinks.db'
docker compose start
```

## Network setup

The goal is that every machine on the LAN resolves the bare name **`go`** to this server, so `http://go/hr` works.

### 1. Give the server a fixed IP

Use a static IP or a DHCP reservation, e.g. `10.0.10.25`.

### 2. DNS A record `go` → server LAN IP

Create the record in the internal DNS zone your clients already use, e.g. `corp.example.com`:

| Name | Type | Value |
| --- | --- | --- |
| `go` | A | `10.0.10.25` |

- **Windows DNS / Active Directory**: DNS Manager → *Forward Lookup Zones* → your AD zone → *New Host (A)* → name `go`.
  PowerShell: `Add-DnsServerResourceRecordA -ZoneName "corp.example.com" -Name "go" -IPv4Address "10.0.10.25"`
- **BIND**: `go  IN  A  10.0.10.25` in the zone file.
- **dnsmasq / Pi-hole**: `address=/go.corp.example.com/10.0.10.25` (or a Local DNS record).
- **Router UI**: add a static host `go`.

Check it from a client: `nslookup go` and `nslookup go.corp.example.com` should both return the server IP.

### 3. (Optional) DHCP DNS suffix so the bare name `go` resolves

Clients turn `go` into `go.corp.example.com` by appending their DNS search suffix. Domain-joined Windows machines already do this for the AD domain. For other devices, set:

- **DHCP option 15** (*DNS Domain Name*) = `corp.example.com`
- **DHCP option 119** (*Domain Search List*) = `corp.example.com`, for macOS/Linux/mobile clients
- or a GPO: *Computer Configuration → Administrative Templates → Network → DNS Client → DNS Suffix Search List*

Clients pick up the change on their next DHCP renewal (`ipconfig /renew`).

### 4. Browser first-use note

Browsers treat a bare word like `go/hr` as a possible search, so the **first time**, users should type the full form:

```
http://go/hr
```

Once `http://go/` has loaded successfully, Chrome and Edge recognise `go` as an intranet host, and typing `go/hr` goes straight to the link. A bookmark or a desktop shortcut to `http://go/` also helps. Tell users to type `go/`, not `www.go`.

### 5. Chrome / Edge policies (recommended for managed fleets)

Push these with Group Policy / Intune / Google Admin so `go/…` works from day one and never turns into a search or an HTTPS error:

| Policy | Browser | Value | Why |
| --- | --- | --- | --- |
| `GoToIntranetSiteForSingleWordEntryInAddressBar` | Edge | `Enabled` | Single-word address-bar entries try the intranet host first instead of searching. |
| `IntranetRedirectBehavior` | Chrome, Edge | `2` (skip DNS-interception probes, keep the "Did you mean http://go/…?" infobar) | Users who type `go/hr` and get a search page are offered the intranet link immediately. |
| `HttpAllowlist` | Chrome, Edge | `go`, `go.corp.example.com` | Exempts the go server from HTTPS-Upgrades / HTTPS-First mode, since the service is plain HTTP on the LAN. |
| `DnsOverHttpsMode` | Chrome, Edge | `off` (or keep DoH pointed at the internal resolver) | Public DNS-over-HTTPS cannot resolve internal names such as `go`. |

Templates: Chrome — https://chromeenterprise.google/browser/download/ (policy templates); Edge — https://www.microsoft.com/edge/business/download. Policy names vary slightly between browser versions, so check `chrome://policy` / `edge://policy` on a client after applying them.

For Firefox, set `browser.fixup.domainwhitelist.go = true` (enterprise policy `Preferences`) so `go/hr` is treated as a host.

### Quick test without DNS

On a single machine, add `10.0.10.25  go` to `/etc/hosts` (or `C:\Windows\System32\drivers\etc\hosts`) and browse to `http://go/hr`.

### HTTPS (optional)

Go links are normally plain HTTP on the LAN. If you need TLS, put a reverse proxy (nginx, Caddy, Traefik, IIS ARR) in front with a certificate from your internal CA for `go` and `go.corp.example.com`, set `HOST=127.0.0.1` and `TRUST_PROXY=true`, and proxy everything to the app.

## How links resolve

Rules (implemented once in `shared/resolver.ts` and used by both the server and the UI):

| Request | Link | Redirects to |
| --- | --- | --- |
| `/hr`, `/HR`, `/go/hr` | `hr` → `https://workday.company.internal/hr/portal` | that URL (case-insensitive) |
| `/jira/PROJ-123` | `jira` → `https://jira.company.local/browse` | `…/browse/PROJ-123` (path passthrough, longest prefix first) |
| `/emp/1045` | `emp` → `https://hrms.local/employee?id=%s` | `…/employee?id=1045` (`%s` parameter) |
| `/jira/PROJ-1?view=full` | `jira` | `…/browse/PROJ-1?view=full` (query passthrough) |
| `/vpn` (inactive) | — | the React "This link has been disabled" page, HTTP 410 |
| `/unknown` | — | the React "Link not found" page with suggestions, HTTP 404 |

Each successful **GET** redirect increments `clickCount` and sets `lastAccessedAt`. `HEAD` requests (`curl -I`, link checkers) do not count.

Redirects are sent with `Cache-Control: private, no-store`, so a changed target takes effect immediately.

**Never treated as go links**: `/api/*`, `/assets/*`, any path whose first segment contains a dot (`/favicon.ico`), and all reserved names. Reserved names, which cannot be created as shortcuts, are: `admin, api, login, logout, create, edit, links, settings, static, assets, dashboard, directory, my-links, audit-log, help, how-to-use, setup-guide, details, link, go`.

## REST API

All endpoints are JSON. Errors look like `{ "error": "message" }`. Writes require the `X-GoLinks-User-Id` header (see below).

| Method | Path | Who | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | any | Liveness/DB check |
| GET | `/api/links` | any | List. Query: `query`, `category`, `visibility`, `isActive`, `shortName`, `sortBy` (`clicks`/`recent`/`name`/`lastAccessed`), `sortOrder` |
| POST | `/api/links` | user | Create `{ shortName, targetUrl, description?, category?, owner?, visibility?, isActive?, tags? }` → 201 |
| GET | `/api/links/validate?shortName=&excludeId=` | any | `{ valid, error? }` (format, reserved and uniqueness checks) |
| GET | `/api/links/:id` | any | One link |
| PUT | `/api/links/:id` | owner/admin | Partial update |
| DELETE | `/api/links/:id` | owner/admin | → 204 |
| POST | `/api/links/:id/click` | any | Record a click |
| GET | `/api/resolve/<path>?<query>` | any | Resolve without redirecting (200 found, 404 not found, 410 disabled); records a click on success |
| GET | `/api/categories` | any | Category list |
| GET | `/api/users` | any | Directory users |
| GET | `/api/audit` | admin | Query: `action`, `actor`, `shortName`, `dateFrom`, `dateTo`, `limit` |
| POST | `/api/import` | admin | `[...links]` or `{ links: [...], mode: "upsert" \| "create" }` → `{ imported, created, updated, skipped[] }` |
| GET | `/api/export` | any | All links as a JSON download |
| GET | `/api/stats` | any | Totals, per-category counts, top and recent links |
| POST | `/api/reset`, `/api/audit/reset`; DELETE `/api/audit` | admin | Only when `ALLOW_DATA_RESET=true` |

Server-side validation: shortName is 2–50 characters of `a-z 0-9 - _ /` (normalised to lowercase, with a leading `go/` stripped), not reserved, no `//`, and unique ignoring case. `targetUrl` must be a valid `http://` or `https://` URL (with `%s` / `{query}` placeholders allowed), at most 2048 characters. Field types and lengths are also enforced.

Example:

```bash
curl -X POST http://go/api/links \
  -H 'Content-Type: application/json' -H 'X-GoLinks-User-Id: user_admin' \
  -d '{"shortName":"standup","targetUrl":"https://meet.company.internal/standup","category":"Engineering"}'
```

## Identity & permissions

The UI still uses the **mock user switcher** that came with the prototype (four users, seeded into the `users` table). The selected user's id is sent as `X-GoLinks-User-Id`, and the server applies the same rules as the UI:

- **Admin**: manages any link, reassigns owners, views the audit log, imports.
- **Employee**: creates links (always owned by themselves) and edits/deletes only their own.

⚠️ **This header is self-asserted.** Anyone on the LAN can send any user id. It gives you accountability among cooperative users, not security. Before relying on roles, put the app behind your SSO (for example a reverse proxy doing OIDC/Kerberos that injects a trusted user header), then change `actorMiddleware` in `server/auth.ts` to read that header and populate `users` from your directory.

## Tests

```bash
npm test
```

- `tests/resolver.test.ts` covers the matching rules: case-insensitivity, path passthrough, longest prefix, `%s`, query/hash passthrough, inactive links, not-found and reserved names, and validation. It also runs the original `src/utils/resolver.test.ts` self-tests.
- `tests/server.test.ts` starts the real Express app on an in-memory database and checks the 302 `Location` headers, click counting (GET vs HEAD), the 404/410 SPA fallbacks, that `/api`, `/assets` and app routes are never treated as go links, CRUD + RBAC + audit, import/export, stats and malformed input.
