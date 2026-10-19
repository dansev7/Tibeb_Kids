import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { ensureSchema, bootstrapDefaults } from './ddl';
import { seedDatabase } from './seeder';
import path from 'path';
import fs from 'fs';
import os from 'os';

function initDatabase(): Database.Database {
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );

  let dbPath: string = '';

  if (isServerless) {
    // Vercel / AWS Lambda: /tmp is the only writable directory
    dbPath = path.join('/tmp', 'little-learner.db');

    if (!fs.existsSync(dbPath)) {
      const bundledPath = path.join(process.cwd(), 'data', 'little-learner.db');
      if (fs.existsSync(bundledPath)) {
        try {
          fs.copyFileSync(bundledPath, dbPath);
        } catch (e) {
          console.warn('[DB] Could not copy bundled DB to /tmp, will seed fresh:', e);
        }
      }
    }
  } else {
    const dbDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
      try {
        fs.mkdirSync(dbDir, { recursive: true });
      } catch (err) {
        console.warn('[DB] Failed to create data dir, using os.tmpdir():', err);
        dbPath = path.join(os.tmpdir(), 'little-learner.db');
      }
    }
    if (!dbPath) {
      dbPath = path.join(dbDir, 'little-learner.db');
    }
  }

  const sqlite = new Database(dbPath);

  // In serverless, avoid WAL file conflicts across concurrent Lambda containers
  if (isServerless) {
    sqlite.pragma('journal_mode = DELETE');
  } else {
    sqlite.pragma('journal_mode = WAL');
  }

  ensureSchema(sqlite);
  bootstrapDefaults(sqlite);

  // Self-heal: If database has no worlds, automatically seed from content JSON
  try {
    const worldCount = sqlite.prepare('SELECT count(*) as count FROM world').get() as { count: number } | undefined;
    if (!worldCount || worldCount.count === 0) {
      seedDatabase(sqlite);
    }
  } catch {
    seedDatabase(sqlite);
  }

  return sqlite;
}

let sqlite: Database.Database;
try {
  sqlite = initDatabase();
} catch (err) {
  console.error('[DB] Failed to initialize disk SQLite DB, falling back to in-memory instance:', err);
  sqlite = new Database(':memory:');
  ensureSchema(sqlite);
  bootstrapDefaults(sqlite);
  try {
    seedDatabase(sqlite);
  } catch (seedErr) {
    console.error('[DB] In-memory auto-seed failed:', seedErr);
  }
}

export const db = drizzle(sqlite, { schema });
export { sqlite };
