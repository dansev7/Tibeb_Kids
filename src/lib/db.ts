import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const sqlite = new Database(path.join(dbDir, 'little-learner.db'));
sqlite.pragma('journal_mode = WAL');

// Ensure tables exist on boot
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS child (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT DEFAULT 'star',
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
    type TEXT CHECK(type IN ('learn', 'review', 'tricky')) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS item (
    id TEXT PRIMARY KEY,
    world_id TEXT REFERENCES world(id) ON DELETE SET NULL,
    kind TEXT CHECK(kind IN ('letter_upper', 'letter_lower', 'number', 'fidel')) NOT NULL,
    symbol TEXT NOT NULL,
    display_name TEXT NOT NULL,
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
`);

// Self-heal default child and settings if absent
try {
  const childCheck = sqlite.prepare('SELECT count(*) as count FROM child').get() as { count: number };
  if (!childCheck || childCheck.count === 0) {
    sqlite.prepare("INSERT INTO child (id, name, avatar) VALUES (1, 'Learner', 'star')").run();
  }

  const settingsCheck = sqlite.prepare('SELECT count(*) as count FROM settings WHERE child_id = 1').get() as { count: number };
  if (!settingsCheck || settingsCheck.count === 0) {
    sqlite.prepare(`
      INSERT INTO settings (child_id, session_limit_min, volume, enabled_worlds_json, voice_gender, voice_speed)
      VALUES (1, 15, 0.8, '["abc-garden","number-farm","fidel-village"]', 'female', 0.9)
    `).run();
  }
} catch (e) {
  console.debug('[DB Init]', e);
}

export const db = drizzle(sqlite, { schema });
export { sqlite };
