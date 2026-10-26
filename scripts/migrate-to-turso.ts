import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { ensureSchemaLibSql } from '../src/lib/ddl';

/**
 * Migration Script: Local SQLite -> Turso Centralized Cloud SQLite
 * 
 * Usage:
 *   $env:TURSO_DATABASE_URL="libsql://your-db-org.turso.io"
 *   $env:TURSO_AUTH_TOKEN="your-token"
 *   npx tsx scripts/migrate-to-turso.ts
 */
function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const envPath = path.join(process.cwd(), file);
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
      for (const line of lines) {
        const match = line.trim().match(/^([A-Za-z0-9_]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^['"]|['"]$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    }
  }
}

export async function migrateToTurso() {
  loadEnv();
  const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;

  if (!tursoUrl) {
    console.error('❌ Missing TURSO_DATABASE_URL environment variable.');
    console.log('\nTo migrate your data to Turso:');
    console.log('1. Install Turso CLI: curl -sSfL https://get.tur.so/install.ps1 | pwsh');
    console.log('2. Create database: turso db create little-learner');
    console.log('3. Get URL: turso db show little-learner --url');
    console.log('4. Create token: turso db tokens create little-learner');
    console.log('5. Set env variables and run this script:\n');
    console.log('   $env:TURSO_DATABASE_URL = "libsql://little-learner-<user>.turso.io"');
    console.log('   $env:TURSO_AUTH_TOKEN = "your-token"');
    console.log('   npx tsx scripts/migrate-to-turso.ts\n');
    process.exit(1);
  }

  const localDbPath = path.join(process.cwd(), 'data', 'little-learner.db');
  if (!fs.existsSync(localDbPath)) {
    console.error(`❌ Local database not found at ${localDbPath}. Run 'npm run seed' first.`);
    process.exit(1);
  }

  console.log(`🔌 Opening local SQLite database: ${localDbPath}`);
  const localDb = new Database(localDbPath, { readonly: true });

  console.log(`☁️  Connecting to Turso remote database: ${tursoUrl}`);
  const turso = createClient({ url: tursoUrl, authToken });

  console.log('📋 Ensuring schema on Turso...');
  await ensureSchemaLibSql(turso);
  console.log('✓ Schema applied successfully.');

  const tables = [
    'child',
    'settings',
    'world',
    'level',
    'item',
    'level_item',
    'level_progress',
    'item_mastery',
    'attempt',
    'session',
  ];

  console.log('\n🚀 Transferring data to Turso...\n');

  for (const table of tables) {
    const rows = localDb.prepare(`SELECT * FROM ${table}`).all();
    if (rows.length === 0) {
      console.log(`  - ${table}: 0 rows (skipping)`);
      continue;
    }

    const sample = rows[0] as Record<string, any>;
    const columns = Object.keys(sample);
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

    // Batch execute to Turso in chunks of 50 to respect LibSQL batch limits
    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const statements = chunk.map((r: any) => ({
        sql,
        args: columns.map((col) => r[col] ?? null),
      }));
      await turso.batch(statements, 'write');
    }

    console.log(`  ✓ ${table}: ${rows.length} rows migrated`);
  }

  localDb.close();
  console.log('\n🎉 Successfully migrated all data to your centralized Turso cloud database!');
  console.log('Now, add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to your Vercel Project Environment Variables.');
}

migrateToTurso().catch((err) => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
