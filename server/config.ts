import path from 'node:path';

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function int(name: string, value: string | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined || value === '') return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`Invalid ${name} "${value}" (expected ${min}-${max})`);
  return n;
}

export interface BootstrapAdmin {
  email: string;
  password: string;
  name: string;
}

export interface ServerConfig {
  host: string;
  port: number;
  dbPath: string;
  staticDir: string;
  seedSampleData: boolean;
  allowDataReset: boolean;
  trustProxy: boolean;
  logRequests: boolean;
  /** Session lifetime in hours. */
  sessionTtlHours: number;
  /** Mark the session cookie Secure (only when the app is served over HTTPS). */
  cookieSecure: boolean;
  /** Days of per-click history to keep (links.click_count totals are never pruned). */
  clickRetentionDays: number;
  /** First admin account, created/activated at startup when ADMIN_EMAIL + ADMIN_PASSWORD are set. */
  bootstrapAdmin: BootstrapAdmin | null;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = int('PORT', env.PORT, 80, 1, 65535);
  const adminEmail = env.ADMIN_EMAIL?.trim();
  const adminPassword = env.ADMIN_PASSWORD;

  return {
    host: env.HOST || '0.0.0.0',
    port,
    dbPath: path.resolve(env.DB_PATH || './data/golinks.db'),
    staticDir: path.resolve(env.STATIC_DIR || './dist'),
    seedSampleData: bool(env.SEED_SAMPLE_DATA, true),
    allowDataReset: bool(env.ALLOW_DATA_RESET, false),
    trustProxy: bool(env.TRUST_PROXY, false),
    logRequests: bool(env.LOG_REQUESTS, true),
    sessionTtlHours: int('SESSION_TTL_HOURS', env.SESSION_TTL_HOURS, 12, 1, 24 * 90),
    cookieSecure: bool(env.COOKIE_SECURE, false),
    clickRetentionDays: int('CLICK_RETENTION_DAYS', env.CLICK_RETENTION_DAYS, 365, 7, 3650),
    bootstrapAdmin:
      adminEmail && adminPassword
        ? { email: adminEmail, password: adminPassword, name: env.ADMIN_NAME?.trim() || 'GoLinks Administrator' }
        : null,
  };
}
