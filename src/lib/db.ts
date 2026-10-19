import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema';
import { ensureSchemaLibSql, bootstrapDefaultsLibSql } from './ddl';
import path from 'path';
import fs from 'fs';

/**
 * Resolves database configuration:
 * 1. If TURSO_DATABASE_URL (or DATABASE_URL) is present, connects to the
 *    centralized persistent Turso SQLite cloud database.
 * 2. Otherwise, seamlessly connects to the local persistent SQLite file at data/little-learner.db.
 */
function getDatabaseConfig(): { url: string; authToken?: string } {
  const remoteUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;

  if (
    remoteUrl &&
    (remoteUrl.startsWith('libsql://') ||
      remoteUrl.startsWith('https://') ||
      remoteUrl.startsWith('http://'))
  ) {
    return { url: remoteUrl, authToken };
  }

  // Local persistent SQLite fallback
  const dbDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true });
    } catch {}
  }
  const localDbPath = path.join(dbDir, 'little-learner.db');
  return { url: `file:${localDbPath}` };
}

const config = getDatabaseConfig();
export const client: Client = createClient(config);
export const db: LibSQLDatabase<typeof schema> = drizzle(client, { schema });

let initPromise: Promise<void> | null = null;

/**
 * Ensures schema tables and default records exist on fresh or remote databases.
 */
export async function ensureDbInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await ensureSchemaLibSql(client);
        await bootstrapDefaultsLibSql(client);
      } catch (err) {
        console.warn('[DB] Auto-init notice:', err);
      }
    })();
  }
  return initPromise;
}

// Ensure database initialization begins in the background
ensureDbInitialized().catch(() => {});
