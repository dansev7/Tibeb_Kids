import { db } from '../src/lib/db';
import { worlds, levels, items, levelItems, levelProgress, itemMastery, children, settings } from '../src/lib/schema';
import { eq } from 'drizzle-orm';
import assert from 'assert';

async function runTests() {
  console.log('🧪 Starting Little Learner System Verification...\n');

  // Test 1: Worlds check
  const allWorlds = db.select().from(worlds).all();
  console.log(`✓ Found ${allWorlds.length} worlds in database (ABC Garden, Number Farm, Fidel Village)`);
  assert.strictEqual(allWorlds.length, 3, 'Must have 3 worlds');

  // Test 2: Levels check
  const allLevels = db.select().from(levels).all();
  console.log(`✓ Found ${allLevels.length} levels loaded`);
  assert(allLevels.length >= 36, 'Must have at least 36 levels across 3 worlds');

  // Test 3: Items check
  const allItems = db.select().from(items).all();
  console.log(`✓ Found ${allItems.length} educational items (capitals, smalls, numbers, fidels)`);
  assert(allItems.length >= 100, 'Must have at least 100 items');

  // Test 4: Check default child & settings
  const learner = db.select().from(children).where(eq(children.id, 1)).get();
  assert(learner, 'Default child must exist');
  console.log(`✓ Default child profile verified: ${learner.name}`);

  const childSettings = db.select().from(settings).where(eq(settings.childId, 1)).get();
  assert(childSettings, 'Default settings must exist');
  assert(['female', 'male', 'parent'].includes(childSettings.voiceGender || ''), 'Voice gender must be female, male, or parent');
  assert(typeof childSettings.voiceSpeed === 'number' && childSettings.voiceSpeed >= 0.5 && childSettings.voiceSpeed <= 1.5, 'Voice speed must be between 0.5 and 1.5');
  console.log(`✓ Child settings verified: session limit ${childSettings.sessionLimitMin}m, volume ${childSettings.volume}, voice: ${childSettings.voiceGender} (${childSettings.voiceSpeed}x speed)`);


  // Test 5: Verify unlocked level 1 for each world
  for (const w of allWorlds) {
    const firstLevel = db.select().from(levels)
      .where(eq(levels.worldId, w.id))
      .orderBy(levels.orderNum)
      .get();
    assert(firstLevel, `World ${w.id} must have a first level`);

    const progress = db.select().from(levelProgress)
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

  console.log('\n🎉 ALL SYSTEM VERIFICATION CHECKS PASSED PERFECTLY!');
}

runTests().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
