import path from 'node:path';

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
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
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = Number.parseInt(env.PORT || '80', 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT "${env.PORT}"`);
  }

  return {
    host: env.HOST || '0.0.0.0',
    port,
    dbPath: path.resolve(env.DB_PATH || './data/golinks.db'),
    staticDir: path.resolve(env.STATIC_DIR || './dist'),
    seedSampleData: bool(env.SEED_SAMPLE_DATA, true),
    allowDataReset: bool(env.ALLOW_DATA_RESET, false),
    trustProxy: bool(env.TRUST_PROXY, false),
    logRequests: bool(env.LOG_REQUESTS, true),
  };
}
