import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { worlds, levels, levelProgress, children } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { getEnabledWorlds } from '@/lib/worldAccess';

export async function GET() {
  try {
    // Get all worlds with progress
    const childId = 1;
    const enabled = getEnabledWorlds(childId);
    const allWorlds = db.select().from(worlds).orderBy(worlds.orderNum).all()
      .filter(world => enabled.includes(world.slug));

    // Get child (default child id = 1)
    const childResult = db.select().from(children).where(eq(children.id, childId)).get();


    const worldsWithProgress = allWorlds.map(world => {
      // Count levels for this world
      const worldLevels = db.select().from(levels).where(eq(levels.worldId, world.id)).all();
      const totalLevels = worldLevels.length;

      // Count completed levels and stars
      let completedLevels = 0;
      let totalStars = 0;
      for (const level of worldLevels) {
        const progress = db.select().from(levelProgress)
          .where(sql`${levelProgress.childId} = ${childId} AND ${levelProgress.levelId} = ${level.id}`)
          .get();
        if (progress && progress.completedAt) {
          completedLevels++;
          totalStars += progress.stars || 0;
        }
      }

      return {
        id: world.id,
        slug: world.slug,
        title: world.title,
        emoji: world.emoji,
        themeColor: world.themeColor,
        mascot: world.mascot,
        totalLevels,
        completedLevels,
        totalStars,
      };
    });

    return NextResponse.json({
      worlds: worldsWithProgress,
      childName: childResult?.name || 'Learner',
    });
  } catch (error) {
    console.error('Error fetching worlds:', error);
    return NextResponse.json({ worlds: [], childName: 'Learner' });
  }
}
