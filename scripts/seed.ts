import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

function findContentDir(): string {
  const candidates = [
    path.join(process.cwd(), 'content'),
    path.join(__dirname, '..', 'content'),
    path.join(__dirname, 'content'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'levels.json'))) {
      return candidate;
    }
  }
  throw new Error(`Content directory not found. Looked in: ${candidates.join(', ')}`);
}

function findDbPath(): string {
  const dbDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return path.join(dbDir, 'little-learner.db');
}

export function seed() {
  const dbPath = findDbPath();
  const contentDir = findContentDir();

  console.log(`[Seed] Initializing SQLite database at: ${dbPath}`);
  console.log(`[Seed] Reading content files from: ${contentDir}`);

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // 1. Create tables
  sqlite.exec(`
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
  `);

  try {
    sqlite.exec("ALTER TABLE settings ADD COLUMN voice_gender TEXT DEFAULT 'female'");
  } catch {}
  try {
    sqlite.exec("ALTER TABLE settings ADD COLUMN voice_speed REAL DEFAULT 0.9");
  } catch {}
  try {
    sqlite.exec('ALTER TABLE level ADD COLUMN stages_json TEXT');
  } catch {}

  // Run all inserts inside an idempotent transaction
  const seedTransaction = sqlite.transaction(() => {

    // 2. Clear existing data
    sqlite.prepare('DELETE FROM level_item').run();
    sqlite.prepare('DELETE FROM level_progress').run();
    sqlite.prepare('DELETE FROM item_mastery').run();
    sqlite.prepare('DELETE FROM attempt').run();
    sqlite.prepare('DELETE FROM session').run();
    sqlite.prepare('DELETE FROM settings').run();
    sqlite.prepare('DELETE FROM level').run();
    sqlite.prepare('DELETE FROM item').run();
    sqlite.prepare('DELETE FROM world').run();
    sqlite.prepare('DELETE FROM child').run();

    // Reset autoincrement sequence
    try {
      sqlite.prepare("DELETE FROM sqlite_sequence WHERE name IN ('child','attempt','session')").run();
    } catch {
      // ignore if sqlite_sequence doesn't exist yet
    }

    // 3. Insert default child
    const insertChild = sqlite.prepare(`
      INSERT INTO child (id, name, avatar, created_at)
      VALUES (1, 'Learner', 'star', datetime('now'))
    `);
    insertChild.run();

    // 4. Insert default settings
    const insertSettings = sqlite.prepare(`
      INSERT INTO settings (child_id, session_limit_min, volume, enabled_worlds_json, voice_gender, voice_speed)
      VALUES (1, 15, 0.8, '["abc-garden","number-farm","fidel-village"]', 'female', 0.9)
    `);
    insertSettings.run();


    // 5. Read JSON content files
    const levelsRaw = fs.readFileSync(path.join(contentDir, 'levels.json'), 'utf-8');
    const englishRaw = fs.readFileSync(path.join(contentDir, 'english.json'), 'utf-8');
    const numbersRaw = fs.readFileSync(path.join(contentDir, 'numbers.json'), 'utf-8');
    const amharicRaw = fs.readFileSync(path.join(contentDir, 'amharic.json'), 'utf-8');

    const levelsData = JSON.parse(levelsRaw);
    const englishData = JSON.parse(englishRaw);
    const numbersData = JSON.parse(numbersRaw);
    const amharicData = JSON.parse(amharicRaw);

    // 6. Insert Worlds and Levels
    const insertWorld = sqlite.prepare(`
      INSERT INTO world (id, slug, title, emoji, theme_color, mascot, order_num)
      VALUES (@id, @slug, @title, @emoji, @theme_color, @mascot, @order_num)
    `);

    const insertLevel = sqlite.prepare(`
      INSERT INTO level (id, world_id, order_num, title, description, type, stages_json)
      VALUES (@id, @world_id, @order_num, @title, @description, @type, @stages_json)
    `);

    const insertLevelProgress = sqlite.prepare(`
      INSERT INTO level_progress (child_id, level_id, stars, best_score, completed_at, unlocked)
      VALUES (1, @level_id, 0, 0, NULL, @unlocked)
    `);

    let worldCount = 0;
    let levelCount = 0;

    for (const w of levelsData.worlds) {
      insertWorld.run({
        id: w.id,
        slug: w.slug,
        title: w.title,
        emoji: w.emoji ?? null,
        theme_color: w.themeColor ?? null,
        mascot: w.mascot ?? null,
        order_num: w.order,
      });
      worldCount++;

      const levelsList = w.levels || [];
      // Sort levels by order to find the first level
      const sortedLevels = [...levelsList].sort(
        (a: { order: number }, b: { order: number }) => a.order - b.order
      );

      for (let i = 0; i < sortedLevels.length; i++) {
        const lvl = sortedLevels[i];
        insertLevel.run({
          id: lvl.id,
          world_id: w.id,
          order_num: lvl.order,
          title: lvl.title,
          description: lvl.description ?? null,
          type: lvl.type,
          stages_json: Array.isArray(lvl.stages) ? JSON.stringify(lvl.stages) : null,
        });
        levelCount++;

        // Unlock the first level in each world
        const isFirst = i === 0;
        insertLevelProgress.run({
          level_id: lvl.id,
          unlocked: isFirst ? 1 : 0,
        });
      }
    }

    // 7. Insert Items
    const insertItem = sqlite.prepare(`
      INSERT INTO item (
        id, world_id, kind, symbol, display_name, audio_path, picture_path,
        picture_word, picture_word_amharic, picture_word_english,
        picture_word_audio_path, stroke_paths_json, confusable_with_json
      ) VALUES (
        @id, @world_id, @kind, @symbol, @display_name, @audio_path, @picture_path,
        @picture_word, @picture_word_amharic, @picture_word_english,
        @picture_word_audio_path, @stroke_paths_json, @confusable_with_json
      )
    `);

    let itemCount = 0;

    interface SeedItem {
      id: string;
      kind: string;
      symbol: string;
      displayName?: string;
      audioPath?: string;
      picturePath?: string;
      pictureWord?: string;
      pictureWordAmharic?: string;
      pictureWordEnglish?: string;
      pictureWordAudioPath?: string;
      strokePathsJson?: unknown;
      confusableWith?: string[];
    }

    function insertItemCollection(items: SeedItem[], defaultWorldId: string) {
      for (const it of items) {
        insertItem.run({
          id: it.id,
          world_id: defaultWorldId,
          kind: it.kind,
          symbol: it.symbol,
          display_name: it.displayName ?? null,
          audio_path: it.audioPath ?? null,
          picture_path: it.picturePath ?? null,
          picture_word: it.pictureWord ?? null,
          picture_word_amharic: it.pictureWordAmharic ?? null,
          picture_word_english: it.pictureWordEnglish ?? null,
          picture_word_audio_path: it.pictureWordAudioPath ?? null,
          stroke_paths_json: it.strokePathsJson ? JSON.stringify(it.strokePathsJson) : null,
          confusable_with_json: JSON.stringify(it.confusableWith || []),
        });
        itemCount++;
      }
    }

    insertItemCollection(englishData.items || [], 'abc-garden');
    insertItemCollection(numbersData.items || [], 'number-farm');
    insertItemCollection(amharicData.items || [], 'fidel-village');

    // 8. Insert Level Items
    const insertLevelItem = sqlite.prepare(`
      INSERT INTO level_item (level_id, item_id, order_num, is_new)
      VALUES (@level_id, @item_id, @order_num, @is_new)
    `);

    let levelItemCount = 0;

    for (const w of levelsData.worlds) {
      for (const lvl of w.levels || []) {
        const itemIds: string[] = lvl.itemIds || [];
        const newItemIds: string[] = lvl.newItemIds || [];
        const seenItems = new Set<string>();

        let orderNum = 1;
        for (const itemId of itemIds) {
          if (seenItems.has(itemId)) continue;
          seenItems.add(itemId);

          const isNew = newItemIds.includes(itemId) ? 1 : 0;
          insertLevelItem.run({
            level_id: lvl.id,
            item_id: itemId,
            order_num: orderNum++,
            is_new: isNew,
          });
          levelItemCount++;
        }
      }
    }

    console.log(`[Seed] Successfully inserted:`);
    console.log(`  - ${worldCount} worlds`);
    console.log(`  - ${levelCount} levels`);
    console.log(`  - ${itemCount} items`);
    console.log(`  - ${levelItemCount} level-item relationships`);
    console.log(`  - Default child 'Learner' with initial settings and unlocked levels`);
  });

  seedTransaction();
  sqlite.close();
  console.log('[Seed] Database seeding completed successfully! ✨');
}

// Run immediately if executed directly via CLI
if (
  typeof process !== 'undefined' &&
  process.argv &&
  process.argv.some((arg) => arg.includes('seed'))
) {
  seed();
}
