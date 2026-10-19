import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { worlds, levels, levelProgress, children } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { getEnabledWorlds } from '@/lib/worldAccess';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const childId = 1;
    const enabled = new Set(getEnabledWorlds(childId));

    // One aggregate query instead of a per-world/per-level N+1 loop
    const worldRows = db
      .select({
        id: worlds.id,
        slug: worlds.slug,
        title: worlds.title,
        emoji: worlds.emoji,
        themeColor: worlds.themeColor,
        mascot: worlds.mascot,
        totalLevels: sql<number>`count(${levels.id})`,
        completedLevels: sql<number>`sum(case when ${levelProgress.completedAt} is not null then 1 else 0 end)`,
        totalStars: sql<number>`coalesce(sum(case when ${levelProgress.completedAt} is not null then ${levelProgress.stars} else 0 end), 0)`,
      })
      .from(worlds)
      .leftJoin(levels, eq(levels.worldId, worlds.id))
      .leftJoin(
        levelProgress,
        sql`${levelProgress.levelId} = ${levels.id} AND ${levelProgress.childId} = ${childId}`,
      )
      .groupBy(worlds.id)
      .orderBy(worlds.orderNum)
      .all();

    const childResult = db.select().from(children).where(eq(children.id, childId)).get();

    return NextResponse.json({
      worlds: worldRows
        .filter(w => enabled.has(w.slug))
        .map(w => ({
          id: w.id,
          slug: w.slug,
          title: w.title,
          emoji: w.emoji,
          themeColor: w.themeColor,
          mascot: w.mascot,
          totalLevels: Number(w.totalLevels),
          completedLevels: Number(w.completedLevels),
          totalStars: Number(w.totalStars),
        })),
      childName: childResult?.name || 'Learner',
    });
  } catch (error) {
    console.error('Error fetching worlds:', error);
    try {
      const contentPath = path.join(process.cwd(), 'content', 'levels.json');
      if (fs.existsSync(contentPath)) {
        const raw = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
        return NextResponse.json({
          worlds: (raw.worlds || []).map((w: any) => ({
            id: w.id,
            slug: w.slug,
            title: w.title,
            emoji: w.emoji,
            themeColor: w.themeColor,
            mascot: w.mascot,
            totalLevels: (w.levels || []).length,
            completedLevels: 0,
            totalStars: 0,
          })),
          childName: 'Hemen Anbes',
        });
      }
    } catch {}
    return NextResponse.json({ worlds: [], childName: 'Learner' });
  }
}
