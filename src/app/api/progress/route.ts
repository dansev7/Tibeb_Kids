import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { levelProgress, levels, itemMastery, attempts } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { updateMastery, getNextReviewDate } from '@/lib/srs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { levelId, stars, results, partial } = body;
    const childId = 1;

    // Partial saves stream per-stage results while the level is still in
    // progress; only the final save may complete the level and unlock stars.
    if (!partial) {
      // Update level progress
      const existing = db.select().from(levelProgress)
        .where(sql`${levelProgress.childId} = ${childId} AND ${levelProgress.levelId} = ${levelId}`)
        .get();

      const now = new Date().toISOString();

      if (existing) {
        // Update only if better stars
        const newStars = Math.max(existing.stars || 0, stars);
        db.update(levelProgress)
          .set({
            stars: newStars,
            bestScore: Math.max(existing.bestScore || 0, stars),
            completedAt: now,
          })
          .where(sql`${levelProgress.childId} = ${childId} AND ${levelProgress.levelId} = ${levelId}`)
          .run();
      } else {
        db.insert(levelProgress).values({
          childId,
          levelId,
          stars,
          bestScore: stars,
          completedAt: now,
          unlocked: 1,
        }).run();
      }

      // Unlock the next level
      const level = db.select().from(levels).where(eq(levels.id, levelId)).get();
      if (level) {
        const nextLevel = db.select().from(levels)
          .where(sql`${levels.worldId} = ${level.worldId} AND ${levels.orderNum} = ${level.orderNum + 1}`)
          .get();

        if (nextLevel) {
          const nextProgress = db.select().from(levelProgress)
            .where(sql`${levelProgress.childId} = ${childId} AND ${levelProgress.levelId} = ${nextLevel.id}`)
            .get();

          if (!nextProgress) {
            db.insert(levelProgress).values({
              childId,
              levelId: nextLevel.id,
              stars: 0,
              bestScore: 0,
              unlocked: 1,
            }).run();
          } else if (!nextProgress.unlocked) {
            db.update(levelProgress)
              .set({ unlocked: 1 })
              .where(sql`${levelProgress.childId} = ${childId} AND ${levelProgress.levelId} = ${nextLevel.id}`)
              .run();
          }
        }
      }
    }

    const now = new Date().toISOString();

    // Record attempts and update mastery
    if (results && Array.isArray(results)) {
      for (const result of results) {
        // Record attempt (gameType comes from the stage that produced the result)
        db.insert(attempts).values({
          childId,
          itemId: result.itemId,
          levelId,
          gameType: result.gameType || 'quiz',
          correct: result.correct ? 1 : 0,
          usedHint: result.usedHint ? 1 : 0,
          firstTry: result.firstTry ? 1 : 0,
        }).run();

        // Update item mastery using the shared Leitner SRS library
        const mastery = db.select().from(itemMastery)
          .where(sql`${itemMastery.childId} = ${childId} AND ${itemMastery.itemId} = ${result.itemId}`)
          .get();

        const today = new Date().toISOString().split('T')[0];

        if (mastery) {
          const updated = updateMastery(
            Boolean(result.correct),
            mastery.leitnerBox || 1,
            mastery.correctDays || 0
          );

          // correct_days tracks distinct correct days, not raw attempts
          const lastDay = mastery.lastSeenAt?.split('T')[0];
          const correctDays = result.correct && lastDay === today
            ? (mastery.correctDays || 0)
            : updated.correctDays;

          db.update(itemMastery)
            .set({
              leitnerBox: updated.nextBox,
              correctDays,
              lastSeenAt: now,
              nextReviewAt: getNextReviewDate(updated.nextBox),
              totalCorrect: (mastery.totalCorrect || 0) + (result.correct ? 1 : 0),
              totalWrong: (mastery.totalWrong || 0) + (result.correct ? 0 : 1),
            })
            .where(sql`${itemMastery.childId} = ${childId} AND ${itemMastery.itemId} = ${result.itemId}`)
            .run();
        } else {
          const updated = updateMastery(Boolean(result.correct), 1, 0);

          db.insert(itemMastery).values({
            childId,
            itemId: result.itemId,
            leitnerBox: updated.nextBox,
            correctDays: updated.correctDays,
            lastSeenAt: now,
            nextReviewAt: result.correct ? updated.nextReviewAt : now,
            totalCorrect: result.correct ? 1 : 0,
            totalWrong: result.correct ? 0 : 1,
          }).run();
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving progress:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
