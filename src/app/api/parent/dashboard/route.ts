import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { worlds, levels, levelProgress, items, itemMastery } from '@/lib/schema';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const childId = 1;

    // Worlds with progress in one aggregate query (no per-world/per-level loop)
    const worldRows = await db
      .select({
        id: worlds.id,
        emoji: worlds.emoji,
        title: worlds.title,
        themeColor: worlds.themeColor,
        totalLevels: sql<number>`count(${levels.id})`,
        completedLevels: sql<number>`sum(case when ${levelProgress.completedAt} is not null then 1 else 0 end)`,
        totalStars: sql<number>`coalesce(sum(case when ${levelProgress.completedAt} is not null then ${levelProgress.stars} else 0 end), 0)`,
      })
      .from(worlds)
      .leftJoin(levels, sql`${levels.worldId} = ${worlds.id}`)
      .leftJoin(
        levelProgress,
        sql`${levelProgress.levelId} = ${levels.id} AND ${levelProgress.childId} = ${childId}`,
      )
      .groupBy(worlds.id)
      .orderBy(worlds.orderNum)
      .all();

    const worldsWithProgress = worldRows.map(w => ({
      id: w.id,
      emoji: w.emoji,
      title: w.title,
      themeColor: w.themeColor,
      totalLevels: Number(w.totalLevels),
      completedLevels: Number(w.completedLevels),
      totalStars: Number(w.totalStars),
    }));

    // All items with mastery in one left join (no per-item query)
    const itemRows = await db
      .select({
        id: items.id,
        symbol: items.symbol,
        kind: items.kind,
        leitnerBox: itemMastery.leitnerBox,
        correctDays: itemMastery.correctDays,
        totalCorrect: itemMastery.totalCorrect,
        totalWrong: itemMastery.totalWrong,
      })
      .from(items)
      .leftJoin(
        itemMastery,
        sql`${itemMastery.itemId} = ${items.id} AND ${itemMastery.childId} = ${childId}`,
      )
      .all();

    const itemsWithMastery = itemRows.map(row => {
      const totalCorrect = row.totalCorrect || 0;
      const totalWrong = row.totalWrong || 0;
      const status: 'not_started' | 'learning' | 'mastered' = row.leitnerBox
        ? ((row.correctDays || 0) >= 3 ? 'mastered' : 'learning')
        : 'not_started';

      return {
        id: row.id,
        symbol: row.symbol,
        kind: row.kind,
        status,
        totalCorrect,
        totalWrong,
        leitnerBox: row.leitnerBox || 0,
      };
    });

    // Needs practice: items with most wrong answers
    const needsPractice = itemsWithMastery
      .filter(item => item.totalWrong > 0)
      .sort((a, b) => b.totalWrong - a.totalWrong)
      .slice(0, 10);

    return NextResponse.json({
      worlds: worldsWithProgress,
      items: itemsWithMastery,
      needsPractice,
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return NextResponse.json({ worlds: [], items: [], needsPractice: [] });
  }
}
