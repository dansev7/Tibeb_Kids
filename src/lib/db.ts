import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { ensureSchema, bootstrapDefaults } from './ddl';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const sqlite = new Database(path.join(dbDir, 'little-learner.db'));
sqlite.pragma('journal_mode = WAL');

// Ensure tables exist on boot (canonical DDL shared with scripts/seed.ts)
ensureSchema(sqlite);
bootstrapDefaults(sqlite);

export const db = drizzle(sqlite, { schema });
export { sqlite };
