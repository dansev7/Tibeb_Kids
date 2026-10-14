import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { levels, levelItems, items, worlds } from '@/lib/schema';
import { eq } from 'drizzle-orm';

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
    const levelItemData = itemIds.map(itemId => {
      return db.select().from(items).where(eq(items.id, itemId)).get();
    }).filter(Boolean);

    // Get all items in this world for distractors
    const allWorldItems = db.select().from(items)
      .where(eq(items.worldId, world.id))
      .all();

    // Format items
    const formatItem = (item: any) => ({
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

    // Build stages based on level and world type
    const stages = buildStages(level, world, formattedItems, distractorItems, levelItemRows);

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

function buildStages(
  level: any,
  world: any,
  items: any[],
  distractors: any[],
  levelItemRows: any[]
) {
  const newItems = items.filter((item) => {
    const row = levelItemRows.find(li => li.itemId === item.id);
    return row?.isNew === 1;
  });
  const allItems = items;

  const shuffle = <T>(arr: T[]): T[] => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const stages: any[] = [];
  const itemsToIntroduce = newItems.length > 0 ? newItems : allItems.slice(0, 4);

  // 1. MEET STAGE
  stages.push({
    type: 'meet',
    items: itemsToIntroduce,
  });

  // 2. FIND / COUNT STAGE
  if (world.slug === 'number-farm' && allItems.some(i => i.kind === 'number')) {
    stages.push({
      type: 'count',
      items: allItems.slice(0, 4),
    });
  } else {
    stages.push({
      type: 'find',
      items: allItems.slice(0, Math.min(allItems.length, 5)),
      distractors: distractors.slice(0, 6),
    });
  }

  // 3. MATCH STAGE
  if (allItems.length >= 2) {
    const pairs = allItems.slice(0, Math.min(allItems.length, 4)).map(item => ({
      left: item,
      right: {
        ...item,
        symbol: item.pictureWord || item.symbol,
        displayName: item.pictureWord || item.displayName,
      },
    }));
    stages.push({
      type: 'match',
      items: allItems,
      pairs,
    });
  }

  // 4. TRACE STAGE
  stages.push({
    type: 'trace',
    items: itemsToIntroduce.slice(0, 3),
  });

  // 5. TRICKY TWINS / SPOT THE DIFFERENCE (for tricky levels)
  if (level.type === 'tricky' && items[0]) {
    const target = items[0];
    const confusablePool = distractors.filter(d => target.confusableWith?.includes(d.id));
    stages.push({
      type: 'spotDifference',
      items: [target],
      distractors: confusablePool.length > 0 ? confusablePool : distractors.slice(0, 3),
    });
  }

  // 6. QUIZ STAGE (Mixed questions, no hints)
  stages.push({
    type: 'quiz',
    items: shuffle(allItems).slice(0, Math.min(allItems.length, 6)),
    distractors: distractors.slice(0, 6),
  });

  return stages;
}
