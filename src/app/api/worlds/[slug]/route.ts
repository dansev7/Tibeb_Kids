import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { worlds, levels, levelProgress } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { getEnabledWorlds } from '@/lib/worldAccess';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const childId = 1;

    // Respect the parent's enabled-worlds setting
    const enabledWorlds = await getEnabledWorlds(childId);
    if (!enabledWorlds.includes(slug)) {
      return NextResponse.json({ error: 'World not found' }, { status: 404 });
    }

    // Get world
    const world = await db.select().from(worlds).where(eq(worlds.slug, slug)).get();
    if (!world) {
      return NextResponse.json({ error: 'World not found' }, { status: 404 });
    }

    // Get levels for this world with progress in one join (no per-level query)
    const levelRows = await db
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
      phase: slug === 'abc-garden' && row.order > 17 ? 2 : 1,
      phaseOrder: slug === 'abc-garden' && row.order > 17 ? row.order - 17 : row.order,
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
    try {
      const { slug } = await params;
      const contentPath = path.join(process.cwd(), 'content', 'levels.json');
      if (fs.existsSync(contentPath)) {
        const raw = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
        const found = raw.worlds.find((w: any) => w.slug === slug);
        if (found) {
          return NextResponse.json({
            id: found.id,
            slug: found.slug,
            title: found.title,
            emoji: found.emoji,
            themeColor: found.themeColor,
            mascot: found.mascot,
            levels: (found.levels || []).map((lvl: any, idx: number) => ({
              id: lvl.id,
              order: lvl.order,
              phase: lvl.phase || (slug === 'abc-garden' && lvl.order > 17 ? 2 : 1),
              phaseOrder: lvl.phaseOrder || (slug === 'abc-garden' && lvl.order > 17 ? lvl.order - 17 : lvl.order),
              title: lvl.title,
              type: lvl.type,
              stars: 0,
              unlocked: idx === 0 || lvl.id === 'abc-18',
              completed: false,
            })),
          });
        }
      }
    } catch {}
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
