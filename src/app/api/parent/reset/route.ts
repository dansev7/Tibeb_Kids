import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { levelProgress, itemMastery, attempts, sessions, worlds, levels } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  try {
    const childId = 1;

    // Clear history and mastery
    await db.delete(attempts).where(eq(attempts.childId, childId)).run();
    await db.delete(sessions).where(eq(sessions.childId, childId)).run();
    await db.delete(itemMastery).where(eq(itemMastery.childId, childId)).run();
    await db.delete(levelProgress).where(eq(levelProgress.childId, childId)).run();

    // Re-unlock the first level of each world
    const allWorlds = await db.select().from(worlds).all();
    for (const w of allWorlds) {
      const firstLevel = await db.select().from(levels)
        .where(eq(levels.worldId, w.id))
        .orderBy(levels.orderNum)
        .get();

      if (firstLevel) {
        await db.insert(levelProgress).values({
          childId,
          levelId: firstLevel.id,
          stars: 0,
          bestScore: 0,
          unlocked: 1,
        }).run();
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resetting progress:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
