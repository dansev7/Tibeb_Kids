import type Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { ensureSchema } from './ddl';

function findContentDir(): string {
  const contentDir = path.join(process.cwd(), 'content');
  if (fs.existsSync(path.join(contentDir, 'levels.json'))) {
    return contentDir;
  }
  return path.resolve(process.cwd(), 'content');
}

export function seedDatabase(sqlite: Database.Database): void {
  try {
    const contentDir = findContentDir();

    // 1. Ensure schema exists
    ensureSchema(sqlite);

    // Run all inserts in a transaction
    const seedTx = sqlite.transaction(() => {
      let preservedChildName = 'Hemen Anbes';
      let preservedAvatar = 'star';
      try {
        const existing = sqlite.prepare('SELECT name, avatar FROM child WHERE id = 1').get() as any;
        if (existing?.name) preservedChildName = existing.name;
        if (existing?.avatar) preservedAvatar = existing.avatar;
      } catch {}

      // Non-destructive seeding: Only refresh level_item curriculum associations
      try {
        sqlite.prepare('DELETE FROM level_item').run();
      } catch {}

      // Insert default child profile if not exists
      sqlite.prepare(`
        INSERT OR IGNORE INTO child (id, name, avatar, created_at)
        VALUES (1, @name, @avatar, datetime('now'))
      `).run({ name: preservedChildName, avatar: preservedAvatar });

      // Insert default settings if not exists
      sqlite.prepare(`
        INSERT OR IGNORE INTO settings (child_id, session_limit_min, volume, enabled_worlds_json, voice_gender, voice_speed)
        VALUES (1, 15, 0.8, '["abc-garden","number-farm","fidel-village"]', 'male', 0.9)
      `).run();

      // Read JSON content files
      const levelsRaw = fs.readFileSync(path.join(contentDir, 'levels.json'), 'utf-8');
      const englishRaw = fs.readFileSync(path.join(contentDir, 'english.json'), 'utf-8');
      const numbersRaw = fs.readFileSync(path.join(contentDir, 'numbers.json'), 'utf-8');
      const amharicRaw = fs.readFileSync(path.join(contentDir, 'amharic.json'), 'utf-8');

      const levelsData = JSON.parse(levelsRaw);
      const englishData = JSON.parse(englishRaw);
      const numbersData = JSON.parse(numbersRaw);
      const amharicData = JSON.parse(amharicRaw);

      // Insert or update Worlds and Levels
      const insertWorld = sqlite.prepare(`
        INSERT OR REPLACE INTO world (id, slug, title, emoji, theme_color, mascot, order_num)
        VALUES (@id, @slug, @title, @emoji, @theme_color, @mascot, @order_num)
      `);

      const insertLevel = sqlite.prepare(`
        INSERT OR REPLACE INTO level (id, world_id, order_num, title, description, type, stages_json)
        VALUES (@id, @world_id, @order_num, @title, @description, @type, @stages_json)
      `);

      const insertLevelProgress = sqlite.prepare(`
        INSERT OR IGNORE INTO level_progress (child_id, level_id, stars, best_score, completed_at, unlocked)
        VALUES (1, @level_id, 0, 0, NULL, @unlocked)
      `);

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

        const levelsList = w.levels || [];
        const sortedLevels = [...levelsList].sort((a: any, b: any) => a.order - b.order);

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

          // Unlock first level in each world without overriding existing progress
          insertLevelProgress.run({
            level_id: lvl.id,
            unlocked: i === 0 ? 1 : 0,
          });
        }
      }

      // Insert or update Items
      const insertItem = sqlite.prepare(`
        INSERT OR REPLACE INTO item (
          id, world_id, kind, symbol, display_name, audio_path, picture_path,
          picture_word, picture_word_amharic, picture_word_english,
          picture_word_audio_path, stroke_paths_json, confusable_with_json
        ) VALUES (
          @id, @world_id, @kind, @symbol, @display_name, @audio_path, @picture_path,
          @picture_word, @picture_word_amharic, @picture_word_english,
          @picture_word_audio_path, @stroke_paths_json, @confusable_with_json
        )
      `);

      const insertItemCollection = (items: any[], defaultWorldId: string) => {
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
        }
      };

      insertItemCollection(englishData.items || [], 'abc-garden');
      insertItemCollection(numbersData.items || [], 'number-farm');
      insertItemCollection(amharicData.items || [], 'fidel-village');

      // Insert Level Items
      const insertLevelItem = sqlite.prepare(`
        INSERT OR REPLACE INTO level_item (level_id, item_id, order_num, is_new)
        VALUES (@level_id, @item_id, @order_num, @is_new)
      `);

      for (const w of levelsData.worlds) {
        for (const lvl of w.levels || []) {
          const itemIds: string[] = lvl.itemIds || [];
          const newItemIds: string[] = lvl.newItemIds || [];
          const seen = new Set<string>();

          let orderNum = 1;
          for (const itemId of itemIds) {
            if (seen.has(itemId)) continue;
            seen.add(itemId);

            insertLevelItem.run({
              level_id: lvl.id,
              item_id: itemId,
              order_num: orderNum++,
              is_new: newItemIds.includes(itemId) ? 1 : 0,
            });
          }
        }
      }
    });

    seedTx();
  } catch (err) {
    console.error('[Seeder] Error during database seeding:', err);
  }
}
