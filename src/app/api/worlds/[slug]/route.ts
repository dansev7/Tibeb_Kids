import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { worlds, levels, levelProgress } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { getEnabledWorlds } from '@/lib/worldAccess';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const childId = 1;

    // Respect the parent's enabled-worlds setting
    if (!getEnabledWorlds(childId).includes(slug)) {
      return NextResponse.json({ error: 'World not found' }, { status: 404 });
    }

    // Get world
    const world = db.select().from(worlds).where(eq(worlds.slug, slug)).get();
    if (!world) {
      return NextResponse.json({ error: 'World not found' }, { status: 404 });
    }

    // Get levels for this world
    const worldLevels = db.select().from(levels)
      .where(eq(levels.worldId, world.id))
      .orderBy(levels.orderNum)
      .all();

    // Get progress for each level
    const levelsWithProgress = worldLevels.map(level => {
      const progress = db.select().from(levelProgress)
        .where(sql`${levelProgress.childId} = ${childId} AND ${levelProgress.levelId} = ${level.id}`)
        .get();

      return {
        id: level.id,
        order: level.orderNum,
        title: level.title,
        type: level.type,
        stars: progress?.stars || 0,
        unlocked: progress?.unlocked === 1 || false,
        completed: !!progress?.completedAt,
      };
    });

    return NextResponse.json({
      id: world.id,
      slug: world.slug,
      title: world.title,
      emoji: world.emoji,
      themeColor: world.themeColor,
      mascot: world.mascot,
      levels: levelsWithProgress,
    });
  } catch (error) {
    console.error('Error fetching world:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
