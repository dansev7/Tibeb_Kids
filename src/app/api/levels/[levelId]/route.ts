import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { levels, levelItems, items, worlds } from '@/lib/schema';
import type { Item } from '@/lib/schema';
import { eq, inArray } from 'drizzle-orm';
import { buildGameStages } from '@/lib/levelEngine';
import fs from 'fs';
import path from 'path';

function getLevelFromContent(levelId: string) {
  try {
    const contentDir = path.join(process.cwd(), 'content');
    const levelsFilePath = path.join(contentDir, 'levels.json');
    if (!fs.existsSync(levelsFilePath)) return null;

    const levelsRaw = JSON.parse(fs.readFileSync(levelsFilePath, 'utf-8'));
    let targetWorld: any = null;
    let targetLevel: any = null;

    for (const w of levelsRaw.worlds || []) {
      const found = (w.levels || []).find((l: any) => l.id === levelId);
      if (found) {
        targetWorld = w;
        targetLevel = found;
        break;
      }
    }

    if (!targetWorld || !targetLevel) return null;

    const englishData = fs.existsSync(path.join(contentDir, 'english.json'))
      ? JSON.parse(fs.readFileSync(path.join(contentDir, 'english.json'), 'utf-8'))
      : { items: [] };
    const numbersData = fs.existsSync(path.join(contentDir, 'numbers.json'))
      ? JSON.parse(fs.readFileSync(path.join(contentDir, 'numbers.json'), 'utf-8'))
      : { items: [] };
    const amharicData = fs.existsSync(path.join(contentDir, 'amharic.json'))
      ? JSON.parse(fs.readFileSync(path.join(contentDir, 'amharic.json'), 'utf-8'))
      : { items: [] };

    const allItems = [
      ...(englishData.items || []).map((it: any) => ({ ...it, worldId: 'abc-garden' })),
      ...(numbersData.items || []).map((it: any) => ({ ...it, worldId: 'number-farm' })),
      ...(amharicData.items || []).map((it: any) => ({ ...it, worldId: 'fidel-village' })),
    ];

    const itemsMap = new Map(allItems.map((it: any) => [it.id, it]));
    const itemIds: string[] = targetLevel.itemIds || [];
    const levelItemData = itemIds.map(id => itemsMap.get(id)).filter(Boolean);
    const allWorldItems = allItems.filter(it => it.worldId === targetWorld.id);
    const distractorItems = allWorldItems.filter(it => !itemIds.includes(it.id));

    const stages = buildGameStages({
      stages: targetLevel.stages,
      levelType: targetLevel.type,
      worldSlug: targetWorld.slug,
      items: levelItemData,
      distractorPool: distractorItems,
      newItemIds: targetLevel.newItemIds || [],
    });

    return {
      id: targetLevel.id,
      title: targetLevel.title,
      type: targetLevel.type,
      worldSlug: targetWorld.slug,
      worldTitle: targetWorld.title,
      themeColor: targetWorld.themeColor,
      mascot: targetWorld.mascot,
      stages,
    };
  } catch (err) {
    console.error('Error in getLevelFromContent fallback:', err);
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ levelId: string }> }
) {
  let resolvedLevelId = '';
  try {
    const { levelId } = await params;
    resolvedLevelId = levelId;

    // Get level
    const level = await db.select().from(levels).where(eq(levels.id, levelId)).get();
    if (!level) {
      return NextResponse.json({ error: 'Level not found' }, { status: 404 });
    }

    // Get world
    const world = await db.select().from(worlds).where(eq(worlds.id, level.worldId)).get();
    if (!world) {
      return NextResponse.json({ error: 'World not found' }, { status: 404 });
    }

    // Get items for this level
    const levelItemRows = await db.select().from(levelItems)
      .where(eq(levelItems.levelId, levelId))
      .orderBy(levelItems.orderNum)
      .all();

    const itemIds = levelItemRows.map(li => li.itemId);
    // One batched query, then preserve the level_item ordering in memory
    const itemsFetched = itemIds.length > 0
      ? await db.select().from(items).where(inArray(items.id, itemIds)).all()
      : [];
    const itemsById = new Map(itemsFetched.map(i => [i.id, i]));
    const levelItemData = itemIds
      .map(itemId => itemsById.get(itemId))
      .filter((i): i is Item => Boolean(i));

    // Get all items in this world for distractors
    const allWorldItems = await db.select().from(items)
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
    console.error(`Error fetching level ${resolvedLevelId}:`, error);

    // Fallback: If DB query fails for any reason, load directly from content JSON files
    if (resolvedLevelId) {
      const fallback = getLevelFromContent(resolvedLevelId);
      if (fallback) {
        console.log(`[Level Fallback] Served ${resolvedLevelId} from content bundle`);
        return NextResponse.json(fallback);
      }
    }

    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Internal error', message }, { status: 500 });
  }
}
