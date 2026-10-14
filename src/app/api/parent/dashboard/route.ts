import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { worlds, levels, levelProgress, items, itemMastery } from '@/lib/schema';
import { eq, sql, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const childId = 1;

    // Get all worlds with progress
    const allWorlds = db.select().from(worlds).orderBy(worlds.orderNum).all();
    const worldsWithProgress = allWorlds.map(world => {
      const worldLevels = db.select().from(levels).where(eq(levels.worldId, world.id)).all();
      let completedLevels = 0;
      let totalStars = 0;
      for (const level of worldLevels) {
        const progress = db.select().from(levelProgress)
          .where(sql`${levelProgress.childId} = ${childId} AND ${levelProgress.levelId} = ${level.id}`)
          .get();
        if (progress?.completedAt) {
          completedLevels++;
          totalStars += progress.stars || 0;
        }
      }
      return {
        id: world.id,
        emoji: world.emoji,
        title: world.title,
        themeColor: world.themeColor,
        totalLevels: worldLevels.length,
        completedLevels,
        totalStars,
      };
    });

    // Get all items with mastery status
    const allItems = db.select().from(items).all();
    const itemsWithMastery = allItems.map(item => {
      const mastery = db.select().from(itemMastery)
        .where(sql`${itemMastery.childId} = ${childId} AND ${itemMastery.itemId} = ${item.id}`)
        .get();

      let status: 'not_started' | 'learning' | 'mastered' = 'not_started';
      if (mastery) {
        status = (mastery.correctDays || 0) >= 3 ? 'mastered' : 'learning';
      }

      return {
        id: item.id,
        symbol: item.symbol,
        kind: item.kind,
        status,
        totalCorrect: mastery?.totalCorrect || 0,
        totalWrong: mastery?.totalWrong || 0,
        leitnerBox: mastery?.leitnerBox || 0,
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
