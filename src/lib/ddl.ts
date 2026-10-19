import type Database from 'better-sqlite3';
import type { Client } from '@libsql/client';

export const DDL_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS child (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    avatar TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS world (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    emoji TEXT,
    theme_color TEXT,
    mascot TEXT,
    order_num INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS level (
    id TEXT PRIMARY KEY,
    world_id TEXT NOT NULL REFERENCES world(id) ON DELETE CASCADE,
    order_num INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK(type IN ('learn','review','tricky')),
    stages_json TEXT
  );

  CREATE TABLE IF NOT EXISTS item (
    id TEXT PRIMARY KEY,
    world_id TEXT REFERENCES world(id) ON DELETE SET NULL,
    kind TEXT NOT NULL CHECK(kind IN ('letter_upper','letter_lower','number','fidel')),
    symbol TEXT NOT NULL,
    display_name TEXT,
    audio_path TEXT,
    picture_path TEXT,
    picture_word TEXT,
    picture_word_amharic TEXT,
    picture_word_english TEXT,
    picture_word_audio_path TEXT,
    stroke_paths_json TEXT,
    confusable_with_json TEXT
  );

  CREATE TABLE IF NOT EXISTS level_item (
    level_id TEXT NOT NULL REFERENCES level(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES item(id) ON DELETE CASCADE,
    order_num INTEGER NOT NULL,
    is_new INTEGER DEFAULT 0,
    PRIMARY KEY(level_id, item_id)
  );

  CREATE TABLE IF NOT EXISTS level_progress (
    child_id INTEGER NOT NULL REFERENCES child(id) ON DELETE CASCADE,
    level_id TEXT NOT NULL REFERENCES level(id) ON DELETE CASCADE,
    stars INTEGER DEFAULT 0,
    best_score REAL DEFAULT 0,
    completed_at TEXT,
    unlocked INTEGER DEFAULT 0,
    PRIMARY KEY(child_id, level_id)
  );

  CREATE TABLE IF NOT EXISTS item_mastery (
    child_id INTEGER NOT NULL REFERENCES child(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES item(id) ON DELETE CASCADE,
    leitner_box INTEGER DEFAULT 1,
    correct_days INTEGER DEFAULT 0,
    last_seen_at TEXT,
    next_review_at TEXT,
    total_correct INTEGER DEFAULT 0,
    total_wrong INTEGER DEFAULT 0,
    PRIMARY KEY(child_id, item_id)
  );

  CREATE TABLE IF NOT EXISTS attempt (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL REFERENCES child(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES item(id) ON DELETE SET NULL,
    level_id TEXT REFERENCES level(id) ON DELETE SET NULL,
    game_type TEXT,
    correct INTEGER,
    used_hint INTEGER,
    first_try INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL REFERENCES child(id) ON DELETE CASCADE,
    started_at TEXT,
    ended_at TEXT,
    minutes REAL
  );

  CREATE TABLE IF NOT EXISTS settings (
    child_id INTEGER PRIMARY KEY REFERENCES child(id) ON DELETE CASCADE,
    session_limit_min INTEGER DEFAULT 15,
    volume REAL DEFAULT 0.8,
    enabled_worlds_json TEXT DEFAULT '["abc-garden","number-farm","fidel-village"]',
    voice_gender TEXT DEFAULT 'female',
    voice_speed REAL DEFAULT 0.9
  );
`;

const SCHEMA_MIGRATIONS: Array<string> = [
  'ALTER TABLE level ADD COLUMN stages_json TEXT',
  "ALTER TABLE settings ADD COLUMN voice_gender TEXT DEFAULT 'female'",
  'ALTER TABLE settings ADD COLUMN voice_speed REAL DEFAULT 0.9',
];

/**
 * Single source of truth for the SQLite schema for Better-SQLite3.
 */
export function ensureSchema(sqlite: Database.Database): void {
  sqlite.exec(DDL_SCHEMA_SQL);
  for (const sql of SCHEMA_MIGRATIONS) {
    try {
      sqlite.exec(sql);
    } catch {
      // Column already exists
    }
  }
}

/**
 * Schema initialization for LibSQL / Turso Client.
 */
export async function ensureSchemaLibSql(client: Client): Promise<void> {
  await client.executeMultiple(DDL_SCHEMA_SQL);
  for (const sql of SCHEMA_MIGRATIONS) {
    try {
      await client.execute(sql);
    } catch {
      // Column already exists
    }
  }
}

/** Guarantee the default child + settings row exist for Better-SQLite3. */
export function bootstrapDefaults(sqlite: Database.Database): void {
  try {
    sqlite.prepare("INSERT INTO child (id, name, avatar) SELECT 1, 'Hemen Anbes', 'star' WHERE NOT EXISTS (SELECT 1 FROM child WHERE id = 1)").run();
    sqlite.prepare(`
      INSERT INTO settings (child_id, session_limit_min, volume, enabled_worlds_json, voice_gender, voice_speed)
      SELECT 1, 15, 0.8, '["abc-garden","number-farm","fidel-village"]', 'parent', 0.9
      WHERE NOT EXISTS (SELECT 1 FROM settings WHERE child_id = 1)
    `).run();
  } catch (e) {
    console.debug('[DB Init] bootstrap skipped:', e);
  }
}

/** Guarantee the default child + settings row exist for LibSQL / Turso. */
export async function bootstrapDefaultsLibSql(client: Client): Promise<void> {
  try {
    await client.execute("INSERT INTO child (id, name, avatar) SELECT 1, 'Hemen Anbes', 'star' WHERE NOT EXISTS (SELECT 1 FROM child WHERE id = 1)");
    await client.execute(`
      INSERT INTO settings (child_id, session_limit_min, volume, enabled_worlds_json, voice_gender, voice_speed)
      SELECT 1, 15, 0.8, '["abc-garden","number-farm","fidel-village"]', 'parent', 0.9
      WHERE NOT EXISTS (SELECT 1 FROM settings WHERE child_id = 1)
    `);
  } catch (e) {
    console.debug('[DB Init LibSQL] bootstrap skipped:', e);
  }
}
