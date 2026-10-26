import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { seedDatabase } from '../src/lib/seeder';
import { migrateToTurso } from './migrate-to-turso';

export async function seed() {
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
  console.log('[Seed] Local SQLite database seeding completed successfully! ✨');

  // Check if Turso cloud database is configured; if so, sync to Turso automatically
  for (const file of ['.env.local', '.env']) {
    const envPath = path.join(process.cwd(), file);
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
      for (const line of lines) {
        const match = line.trim().match(/^([A-Za-z0-9_]+)=(.*)$/);
        if (match && !process.env[match[1].trim()]) {
          process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
        }
      }
    }
  }

  if (process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL) {
    console.log('[Seed] Syncing fresh data to Turso cloud database...');
    try {
      await migrateToTurso();
      console.log('[Seed] Turso cloud database synced successfully! ☁️✨');
    } catch (err) {
      console.warn('[Seed] Warning: could not sync to Turso cloud:', err);
    }
  }
}

if (
  typeof process !== 'undefined' &&
  process.argv &&
  process.argv.some((arg) => arg.includes('seed'))
) {
  seed().catch((err) => {
    console.error('[Seed] Seeding failed:', err);
    process.exit(1);
  });
}

