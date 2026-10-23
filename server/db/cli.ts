/**
 * Database maintenance CLI.
 *   migrate          Create the database file if needed and apply pending migrations
 *   seed             Insert the sample links (skips shortNames that already exist)
 *   backup <file>    Write a consistent online backup (safe while the server is running)
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../config';
import { openDatabase } from './database';
import { seedSampleLinks } from './seed';

async function main() {
  const [command, arg] = process.argv.slice(2);
  const config = loadConfig();
  const log = (msg: string) => console.log(msg);

  switch (command) {
    case 'migrate': {
      const db = openDatabase(config.dbPath, { seedSampleData: config.seedSampleData, log });
      console.log(`Database ready at ${config.dbPath}`);
      db.close();
      break;
    }
    case 'seed': {
      const db = openDatabase(config.dbPath, { seedSampleData: false, log });
      console.log(`Inserted ${seedSampleLinks(db)} sample links`);
      db.close();
      break;
    }
    case 'backup': {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const target = path.resolve(arg || path.join(path.dirname(config.dbPath), 'backups', `golinks-${stamp}.db`));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const db = openDatabase(config.dbPath, { seedSampleData: false });
      await db.backup(target);
      db.close();
      console.log(`Backup written to ${target}`);
      break;
    }
    default:
      console.error('Usage: cli.ts <migrate|seed|backup [file]>');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
