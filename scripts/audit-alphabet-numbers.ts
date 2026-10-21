import { db } from '../src/lib/db';
import { worlds, levels, items, levelItems } from '../src/lib/schema';
import { eq, inArray } from 'drizzle-orm';
import { buildGameStages } from '../src/lib/levelEngine';
import fs from 'fs';
import path from 'path';

async function runAudit() {
  console.log('🔍 AUDITING ENGLISH ALPHABET & NUMBERS LEVELS AND ITEMS...\n');

  // Load JSON files
  const contentDir = path.join(process.cwd(), 'content');
  const englishJson = JSON.parse(fs.readFileSync(path.join(contentDir, 'english.json'), 'utf-8'));
  const numbersJson = JSON.parse(fs.readFileSync(path.join(contentDir, 'numbers.json'), 'utf-8'));
  const levelsJson = JSON.parse(fs.readFileSync(path.join(contentDir, 'levels.json'), 'utf-8'));

  const dbWorlds = await db.select().from(worlds).all();
  const dbLevels = await db.select().from(levels).all();
  const dbItems = await db.select().from(items).all();
  const dbLevelItems = await db.select().from(levelItems).all();

  console.log(`DB Worlds: ${dbWorlds.length}, Levels: ${dbLevels.length}, Items: ${dbItems.length}, LevelItems: ${dbLevelItems.length}`);

  let errorCount = 0;
  let warnCount = 0;

  function err(msg: string) {
    console.error(`❌ ERROR: ${msg}`);
    errorCount++;
  }

  function warn(msg: string) {
    console.warn(`⚠️ WARN: ${msg}`);
    warnCount++;
  }

  // --- 1. Audit English Items ---
  console.log('\n--- 1. AUDITING ENGLISH ITEMS ---');
  const enItems = englishJson.items;
  console.log(`Found ${enItems.length} items in english.json`);

  const upperLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const lowerLetters = 'abcdefghijklmnopqrstuvwxyz'.split('');

  for (const char of upperLetters) {
    const id = `upper_${char}`;
    const item = enItems.find((i: any) => i.id === id);
    if (!item) {
      err(`Missing English capital item ${id} in english.json`);
    } else {
      if (item.symbol !== char) err(`Capital ${id} has symbol '${item.symbol}', expected '${char}'`);
      if (item.kind !== 'letter_upper') err(`Capital ${id} has kind '${item.kind}', expected 'letter_upper'`);
      if (!item.displayName) err(`Capital ${id} has empty displayName`);
      if (!item.pictureWord) err(`Capital ${id} has empty pictureWord`);
    }
  }

  for (const char of lowerLetters) {
    const id = `lower_${char}`;
    const item = enItems.find((i: any) => i.id === id);
    if (!item) {
      err(`Missing English lowercase item ${id} in english.json`);
    } else {
      if (item.symbol !== char) err(`Lowercase ${id} has symbol '${item.symbol}', expected '${char}'`);
      if (item.kind !== 'letter_lower') err(`Lowercase ${id} has kind '${item.kind}', expected 'letter_lower'`);
      if (!item.displayName) err(`Lowercase ${id} has empty displayName`);
      if (!item.pictureWord) err(`Lowercase ${id} has empty pictureWord`);
    }
  }

  // Check confusable references
  for (const item of enItems) {
    if (item.confusableWith && Array.isArray(item.confusableWith)) {
      for (const confId of item.confusableWith) {
        if (!enItems.some((i: any) => i.id === confId)) {
          warn(`Item ${item.id} has confusable '${confId}' which does not exist in english.json`);
        }
      }
    }
  }

  // --- 2. Audit Number Items ---
  console.log('\n--- 2. AUDITING NUMBER ITEMS ---');
  const numItems = numbersJson.items;
  console.log(`Found ${numItems.length} items in numbers.json`);

  for (let i = 0; i <= 20; i++) {
    const id = `num_${i}`;
    const item = numItems.find((it: any) => it.id === id);
    if (!item) {
      err(`Missing number item ${id} in numbers.json`);
    } else {
      if (item.symbol !== String(i)) err(`Number ${id} has symbol '${item.symbol}', expected '${i}'`);
      if (item.kind !== 'number') err(`Number ${id} has kind '${item.kind}', expected 'number'`);
      if (!item.displayName) err(`Number ${id} has empty displayName`);
      if (!item.pictureWord) err(`Number ${id} has empty pictureWord`);
    }
  }

  // Check confusable references for numbers
  for (const item of numItems) {
    if (item.confusableWith && Array.isArray(item.confusableWith)) {
      for (const confId of item.confusableWith) {
        if (!numItems.some((i: any) => i.id === confId)) {
          warn(`Item ${item.id} has confusable '${confId}' which does not exist in numbers.json`);
        }
      }
    }
  }

  // --- 3. Audit ABC Garden Levels ---
  console.log('\n--- 3. AUDITING ABC GARDEN LEVELS ---');
  const abcWorld = levelsJson.worlds.find((w: any) => w.id === 'abc-garden');
  if (!abcWorld) {
    err('abc-garden world not found in levels.json');
  } else {
    console.log(`Found ${abcWorld.levels.length} levels in ABC Garden`);
    const allEnItemsMap = new Map(enItems.map((i: any) => [i.id, i]));
    const allWorldItemsFormatted = enItems.map((i: any) => ({
      ...i,
      confusableWith: i.confusableWith || [],
    }));

    for (const lvl of abcWorld.levels) {
      console.log(`Checking ABC Level ${lvl.order}: ${lvl.title} (${lvl.id}) [${lvl.type}]`);
      if (!lvl.itemIds || lvl.itemIds.length === 0) {
        err(`Level ${lvl.id} has no itemIds`);
      }
      for (const itemId of lvl.itemIds) {
        if (!allEnItemsMap.has(itemId)) {
          err(`Level ${lvl.id} references non-existent itemId: '${itemId}'`);
        }
      }
      if (lvl.newItemIds) {
        for (const itemId of lvl.newItemIds) {
          if (!allEnItemsMap.has(itemId)) {
            err(`Level ${lvl.id} references non-existent newItemId: '${itemId}'`);
          }
        }
      }

      // Test stage generation
      const levelItemData = (lvl.itemIds || [])
        .map((id: string) => allEnItemsMap.get(id))
        .filter(Boolean)
        .map((i: any) => ({ ...i, confusableWith: i.confusableWith || [] }));
      const distractorPool = allWorldItemsFormatted.filter((i: any) => !lvl.itemIds.includes(i.id));

      try {
        const stages = buildGameStages({
          stages: lvl.stages,
          levelType: lvl.type,
          worldSlug: 'abc-garden',
          items: levelItemData,
          distractorPool,
          newItemIds: lvl.newItemIds || [],
        });

        if (!stages || stages.length === 0) {
          err(`Level ${lvl.id} produced 0 stages!`);
        }

        for (let sIdx = 0; sIdx < stages.length; sIdx++) {
          const st = stages[sIdx];
          if (!st.items || st.items.length === 0) {
            err(`Level ${lvl.id} stage ${sIdx} (${st.type}) has empty items!`);
          }
          if (st.type === 'find' || st.type === 'quiz' || st.type === 'listen') {
            if (!st.distractors || st.distractors.length === 0) {
              warn(`Level ${lvl.id} stage ${st.type} has 0 distractors!`);
            }
          }
          if (st.type === 'match') {
            if (!st.pairs || st.pairs.length === 0) {
              err(`Level ${lvl.id} match stage has 0 pairs!`);
            } else {
              for (const p of st.pairs) {
                if (!p.left || !p.right) {
                  err(`Level ${lvl.id} match stage has broken pair!`);
                }
              }
            }
          }
          if (st.type === 'spotDifference') {
            if (!st.items[0]) {
              err(`Level ${lvl.id} spotDifference has no target item!`);
            }
            if (!st.distractors || st.distractors.length === 0) {
              err(`Level ${lvl.id} spotDifference has no distractors!`);
            }
          }
        }
      } catch (e: any) {
        err(`Level ${lvl.id} buildGameStages threw error: ${e.message}`);
      }
    }
  }

  // --- 4. Audit Number Farm Levels ---
  console.log('\n--- 4. AUDITING NUMBER FARM LEVELS ---');
  const numWorld = levelsJson.worlds.find((w: any) => w.id === 'number-farm');
  if (!numWorld) {
    err('number-farm world not found in levels.json');
  } else {
    console.log(`Found ${numWorld.levels.length} levels in Number Farm`);
    const allNumItemsMap = new Map(numItems.map((i: any) => [i.id, i]));
    const allWorldItemsFormatted = numItems.map((i: any) => ({
      ...i,
      confusableWith: i.confusableWith || [],
    }));

    for (const lvl of numWorld.levels) {
      console.log(`Checking Number Level ${lvl.order}: ${lvl.title} (${lvl.id}) [${lvl.type}]`);
      if (!lvl.itemIds || lvl.itemIds.length === 0) {
        err(`Level ${lvl.id} has no itemIds`);
      }
      for (const itemId of lvl.itemIds) {
        if (!allNumItemsMap.has(itemId)) {
          err(`Level ${lvl.id} references non-existent itemId: '${itemId}'`);
        }
      }
      if (lvl.newItemIds) {
        for (const itemId of lvl.newItemIds) {
          if (!allNumItemsMap.has(itemId)) {
            err(`Level ${lvl.id} references non-existent newItemId: '${itemId}'`);
          }
        }
      }

      // Test stage generation
      const levelItemData = (lvl.itemIds || [])
        .map((id: string) => allNumItemsMap.get(id))
        .filter(Boolean)
        .map((i: any) => ({ ...i, confusableWith: i.confusableWith || [] }));
      const distractorPool = allWorldItemsFormatted.filter((i: any) => !lvl.itemIds.includes(i.id));

      try {
        const stages = buildGameStages({
          stages: lvl.stages,
          levelType: lvl.type,
          worldSlug: 'number-farm',
          items: levelItemData,
          distractorPool,
          newItemIds: lvl.newItemIds || [],
        });

        if (!stages || stages.length === 0) {
          err(`Level ${lvl.id} produced 0 stages!`);
        }

        for (let sIdx = 0; sIdx < stages.length; sIdx++) {
          const st = stages[sIdx];
          if (!st.items || st.items.length === 0) {
            err(`Level ${lvl.id} stage ${sIdx} (${st.type}) has empty items!`);
          }
          if (st.type === 'find' || st.type === 'quiz' || st.type === 'listen') {
            if (!st.distractors || st.distractors.length === 0) {
              warn(`Level ${lvl.id} stage ${st.type} has 0 distractors!`);
            }
          }
          if (st.type === 'match') {
            if (!st.pairs || st.pairs.length === 0) {
              err(`Level ${lvl.id} match stage has 0 pairs!`);
            }
          }
          if (st.type === 'spotDifference') {
            if (!st.items[0]) {
              err(`Level ${lvl.id} spotDifference has no target item!`);
            }
            if (!st.distractors || st.distractors.length === 0) {
              err(`Level ${lvl.id} spotDifference has no distractors!`);
            }
          }
        }
      } catch (e: any) {
        err(`Level ${lvl.id} buildGameStages threw error: ${e.message}`);
      }
    }
  }

  // --- 5. Audit Database Sync ---
  console.log('\n--- 5. AUDITING DATABASE SYNC ---');
  // Check if DB items match JSON items
  for (const item of [...enItems, ...numItems]) {
    const dbItem = dbItems.find(i => i.id === item.id);
    if (!dbItem) {
      err(`Item ${item.id} exists in JSON but missing in SQLite DB!`);
    } else {
      if (dbItem.symbol !== item.symbol) {
        err(`Item ${item.id} DB symbol '${dbItem.symbol}' != JSON symbol '${item.symbol}'`);
      }
      if (dbItem.pictureWord !== item.pictureWord) {
        warn(`Item ${item.id} DB pictureWord '${dbItem.pictureWord}' != JSON '${item.pictureWord}'`);
      }
    }
  }

  // Check all levels in DB
  const jsonLevels = [...(abcWorld?.levels || []), ...(numWorld?.levels || [])];
  for (const lvl of jsonLevels) {
    const dbLvl = dbLevels.find(l => l.id === lvl.id);
    if (!dbLvl) {
      err(`Level ${lvl.id} exists in JSON but missing in SQLite DB!`);
    }
  }

  console.log(`\n========================================`);
  console.log(`AUDIT FINISHED with ${errorCount} ERRORS and ${warnCount} WARNINGS.`);
  console.log(`========================================`);
}

runAudit().catch(console.error);
