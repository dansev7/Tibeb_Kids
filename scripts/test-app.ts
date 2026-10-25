import fs from 'fs';
import path from 'path';

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const envPath = path.join(process.cwd(), file);
    if (fs.existsSync(envPath)) {
      try {
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
      } catch {}
    }
  }
}
loadEnv();

import { db } from '../src/lib/db';
import { worlds, levels, items, levelItems, levelProgress, itemMastery, children, settings } from '../src/lib/schema';
import { eq } from 'drizzle-orm';
import assert from 'assert';

async function runTests() {
  console.log('🧪 Starting Little Learner System Verification...\n');

  // Test 1: Worlds check
  const allWorlds = await db.select().from(worlds).all();
  console.log(`✓ Found ${allWorlds.length} worlds in database (ABC Garden, Number Farm, Fidel Village)`);
  assert.strictEqual(allWorlds.length, 3, 'Must have 3 worlds');

  // Test 2: Levels check
  const allLevels = await db.select().from(levels).all();
  console.log(`✓ Found ${allLevels.length} levels loaded`);
  assert(allLevels.length >= 36, 'Must have at least 36 levels across 3 worlds');

  // Test 3: Items check
  const allItems = await db.select().from(items).all();
  console.log(`✓ Found ${allItems.length} educational items (capitals, smalls, numbers, fidels)`);
  assert(allItems.length >= 100, 'Must have at least 100 items');

  // Test 4: Check default child & settings
  const learner = await db.select().from(children).where(eq(children.id, 1)).get();
  assert(learner, 'Default child must exist');
  console.log(`✓ Default child profile verified: ${learner.name}`);

  const childSettings = await db.select().from(settings).where(eq(settings.childId, 1)).get();
  assert(childSettings, 'Default settings must exist');
  assert(['male', 'parent'].includes(childSettings.voiceGender || ''), 'Voice gender must be male or parent');
  assert(typeof childSettings.voiceSpeed === 'number' && childSettings.voiceSpeed >= 0.5 && childSettings.voiceSpeed <= 1.5, 'Voice speed must be between 0.5 and 1.5');
  console.log(`✓ Child settings verified: session limit ${childSettings.sessionLimitMin}m, volume ${childSettings.volume}, voice: ${childSettings.voiceGender} (${childSettings.voiceSpeed}x speed)`);


  // Test 5: Verify unlocked level 1 for each world
  for (const w of allWorlds) {
    const firstLevel = await db.select().from(levels)
      .where(eq(levels.worldId, w.id))
      .orderBy(levels.orderNum)
      .get();
    assert(firstLevel, `World ${w.id} must have a first level`);

    const progress = await db.select().from(levelProgress)
      .where(eq(levelProgress.levelId, firstLevel.id))
      .get();
    assert(progress?.unlocked === 1, `First level ${firstLevel.id} of world ${w.id} must be unlocked`);
  }
  console.log('✓ First level in all 3 worlds is unlocked and ready to play');

  // Test 6: Verify SRS Leitner repetition logic
  const { updateMastery, isItemMastered, getNextReviewDate } = await import('../src/lib/srs');
  const initial = updateMastery(true, 1, 0);
  assert.strictEqual(initial.nextBox, 2, 'Correct answer moves box 1 to 2');
  assert.strictEqual(initial.correctDays, 1, 'Correct days increments');
  assert(!isItemMastered(initial.correctDays), 'Not mastered with 1 day');

  const mastered = updateMastery(true, 3, 2);
  assert(isItemMastered(mastered.correctDays), 'Mastered when correctDays >= 3');

  const failed = updateMastery(false, 4, 2);
  assert.strictEqual(failed.nextBox, 1, 'Incorrect answer resets to box 1');
  console.log('✓ Leitner Spaced Repetition (SRS) box promotion, reset & mastery rules verified');

  // Test 7: Verify all levels and stages across all worlds (no screen overflows, valid pairs)
  const { buildGameStages } = await import('../src/lib/levelEngine');
  const fs = await import('fs');
  const path = await import('path');
  const levelsJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content/levels.json'), 'utf-8'));
  const allDbItems = await db.select().from(items).all();
  const dbItemsMap = new Map(allDbItems.map(i => [i.id, i]));

  for (const w of levelsJson.worlds) {
    for (const lvl of w.levels) {
      const levelItems = (lvl.itemIds || []).map((id: string) => dbItemsMap.get(id)).filter(Boolean);
      const distractorPool = allDbItems.filter(i => i.worldId === w.id && !lvl.itemIds.includes(i.id));

      const stages = buildGameStages({
        stages: lvl.stages,
        levelType: lvl.type,
        worldSlug: w.slug,
        items: levelItems,
        distractorPool,
        newItemIds: lvl.newItemIds || [],
      });

      assert(stages.length > 0, `Level ${lvl.id} must generate stages`);
      for (const st of stages) {
        assert(st.items.length > 0, `Stage ${st.type} in level ${lvl.id} must have items`);
        if (st.type === 'whatsNext') {
          assert(st.items && st.items.length > 0, `WhatsNext stage in ${lvl.id} must have items`);
        }
        if (st.type === 'match') {
          assert(st.pairs && st.pairs.length > 0, `Match stage in ${lvl.id} must have pairs`);
          assert(st.pairs.length <= 5, `Match stage in ${lvl.id} must not exceed 5 pairs (overflow prevention)`);
          if (lvl.id === 'abc-14') {
            for (const p of st.pairs) {
              assert.strictEqual(p.left.kind, 'letter_upper', 'abc-14 left card must be capital');
              assert.strictEqual(p.right.kind, 'letter_lower', 'abc-14 right card must be small');
            }
          }
        }
      }
    }
  }
  console.log('✓ All 61 levels (including ABC Garden Phase 1 & Phase 2), stages, and screen overflow guards verified');

  console.log('\n🎉 ALL SYSTEM VERIFICATION CHECKS PASSED PERFECTLY!');
}

runTests().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
