import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { seedDatabase } from '../src/lib/seeder';

export function seed() {
  const dbDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, 'little-learner.db');

  console.log(`[Seed] Initializing SQLite database at: ${dbPath}`);
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  seedDatabase(sqlite);
  sqlite.pragma('wal_checkpoint(TRUNCATE)');
  sqlite.close();
  console.log('[Seed] Database seeding completed successfully! ✨');
}

if (
  typeof process !== 'undefined' &&
  process.argv &&
  process.argv.some((arg) => arg.includes('seed'))
) {
  seed();
}
