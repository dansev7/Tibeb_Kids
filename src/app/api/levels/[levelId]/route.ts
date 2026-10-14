import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { levels, levelItems, items, worlds } from '@/lib/schema';
import type { Item } from '@/lib/schema';
import { eq, inArray } from 'drizzle-orm';
import { buildGameStages } from '@/lib/levelEngine';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ levelId: string }> }
) {
  try {
    const { levelId } = await params;

    // Get level
    const level = db.select().from(levels).where(eq(levels.id, levelId)).get();
    if (!level) {
      return NextResponse.json({ error: 'Level not found' }, { status: 404 });
    }

    // Get world
    const world = db.select().from(worlds).where(eq(worlds.id, level.worldId)).get();
    if (!world) {
      return NextResponse.json({ error: 'World not found' }, { status: 404 });
    }

    // Get items for this level
    const levelItemRows = db.select().from(levelItems)
      .where(eq(levelItems.levelId, levelId))
      .orderBy(levelItems.orderNum)
      .all();

    const itemIds = levelItemRows.map(li => li.itemId);
    // One batched query, then preserve the level_item ordering in memory
    const itemsById = new Map(
      itemIds.length > 0
        ? db.select().from(items).where(inArray(items.id, itemIds)).all().map(i => [i.id, i])
        : [],
    );
    const levelItemData = itemIds
      .map(itemId => itemsById.get(itemId))
      .filter((i): i is Item => Boolean(i));

    // Get all items in this world for distractors
    const allWorldItems = db.select().from(items)
      .where(eq(items.worldId, world.id))
      .all();

    // Format items
    const formatItem = (item: Item) => ({
      id: item.id,
      symbol: item.symbol,
      displayName: item.displayName,
      audioPath: item.audioPath,
      picturePath: item.picturePath,
      pictureWord: item.pictureWord,
      pictureWordAmharic: item.pictureWordAmharic,
      pictureWordEnglish: item.pictureWordEnglish,
      pictureWordAudioPath: item.pictureWordAudioPath,
      kind: item.kind,
      confusableWith: item.confusableWithJson ? JSON.parse(item.confusableWithJson) : [],
    });


    const formattedItems = levelItemData.map(formatItem);

    // Build distractors (other items from same world, not in current level)
    const distractorItems = allWorldItems
      .filter(item => !itemIds.includes(item.id))
      .map(formatItem);

    // Authored stage pipeline (levels.json → level.stages_json), unified
    // through src/lib/levelEngine so content fully drives the game flow.
    let authoredStages: string[] | null = null;
    if (level.stagesJson) {
      try {
        const parsed = JSON.parse(level.stagesJson);
        if (Array.isArray(parsed) && parsed.length > 0) authoredStages = parsed;
      } catch {
        // Fall back to defaults below
      }
    }

    const newItemIds = levelItemRows
      .filter(li => li.isNew === 1)
      .map(li => li.itemId);

    const stages = buildGameStages({
      stages: authoredStages,
      levelType: level.type,
      worldSlug: world.slug,
      items: formattedItems,
      distractorPool: distractorItems,
      newItemIds,
    });

    return NextResponse.json({
      id: level.id,
      title: level.title,
      type: level.type,
      worldSlug: world.slug,
      worldTitle: world.title,
      themeColor: world.themeColor,
      mascot: world.mascot,
      stages,
    });
  } catch (error) {
    console.error('Error fetching level:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
