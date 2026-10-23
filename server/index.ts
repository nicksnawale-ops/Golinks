import 'dotenv/config';
import { createApp } from './app';
import { loadConfig } from './config';
import { openDatabase } from './db/database';

// `--port=3001` overrides PORT from .env (used by `npm run dev:server`).
const portArg = process.argv.find((a) => a.startsWith('--port='));
if (portArg) process.env.PORT = portArg.split('=')[1];

const config = loadConfig();
const db = openDatabase(config.dbPath, {
  seedSampleData: config.seedSampleData,
  log: (msg) => console.log(`[db] ${msg}`),
});

const server = createApp(db, config).listen(config.port, config.host, () => {
  console.log(`GoLinks listening on http://${config.host}:${config.port} (db: ${config.dbPath}, static: ${config.staticDir})`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EACCES') {
    console.error(`Permission denied binding to port ${config.port}. Use a port >1024, run with CAP_NET_BIND_SERVICE, or use Docker.`);
  } else if (err.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use.`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
