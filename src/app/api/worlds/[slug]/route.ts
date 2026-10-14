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

    // Get levels for this world with progress in one join (no per-level query)
    const levelRows = db
      .select({
        id: levels.id,
        order: levels.orderNum,
        title: levels.title,
        type: levels.type,
        stars: levelProgress.stars,
        unlocked: levelProgress.unlocked,
        completedAt: levelProgress.completedAt,
      })
      .from(levels)
      .leftJoin(
        levelProgress,
        sql`${levelProgress.levelId} = ${levels.id} AND ${levelProgress.childId} = ${childId}`,
      )
      .where(eq(levels.worldId, world.id))
      .orderBy(levels.orderNum)
      .all();

    const levelsWithProgress = levelRows.map(row => ({
      id: row.id,
      order: row.order,
      title: row.title,
      type: row.type,
      stars: row.stars || 0,
      unlocked: row.unlocked === 1 || false,
      completed: !!row.completedAt,
    }));

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
