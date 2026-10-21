import { buildGameStages } from '../src/lib/levelEngine';
import { getItemEmoji } from '../src/utils/itemVisuals';
import { getRenderedStrokes } from '../src/utils/strokeGuides';
import fs from 'fs';
import path from 'path';

const contentDir = path.join(process.cwd(), 'content');
const levelsJson = JSON.parse(fs.readFileSync(path.join(contentDir, 'levels.json'), 'utf-8'));
const englishJson = JSON.parse(fs.readFileSync(path.join(contentDir, 'english.json'), 'utf-8'));
const numbersJson = JSON.parse(fs.readFileSync(path.join(contentDir, 'numbers.json'), 'utf-8'));
const amharicJson = JSON.parse(fs.readFileSync(path.join(contentDir, 'amharic.json'), 'utf-8'));

const allItems = [
  ...englishJson.items.map((i: any) => ({ ...i, worldId: 'abc-garden' })),
  ...numbersJson.items.map((i: any) => ({ ...i, worldId: 'number-farm' })),
  ...amharicJson.items.map((i: any) => ({ ...i, worldId: 'fidel-village' })),
];
const itemsMap = new Map(allItems.map((i: any) => [i.id, i]));

const KNOWN_GAME_TYPES = ['meet', 'count', 'trace', 'find', 'match', 'spotDifference', 'listen', 'quiz'];

let failureCount = 0;
let warningCount = 0;

function fail(levelId: string, stageType: string, msg: string) {
  console.error(`❌ [${levelId} -> ${stageType}] ${msg}`);
  failureCount++;
}

function warn(levelId: string, stageType: string, msg: string) {
  console.warn(`⚠️ [${levelId} -> ${stageType}] ${msg}`);
  warningCount++;
}

for (const world of levelsJson.worlds) {
  console.log(`\n================ Testing World: ${world.title} (${world.id}) ================`);

  for (const lvl of world.levels) {
    const levelItems = (lvl.itemIds || []).map((id: string) => itemsMap.get(id)).filter(Boolean);
    const distractorPool = allItems.filter((i: any) => i.worldId === world.id && !lvl.itemIds.includes(i.id));

    const stages = buildGameStages({
      stages: lvl.stages,
      levelType: lvl.type,
      worldSlug: world.slug,
      items: levelItems,
      distractorPool,
      newItemIds: lvl.newItemIds || [],
    });

    if (stages.length === 0) {
      fail(lvl.id, 'all', 'No stages generated for level!');
      continue;
    }

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      if (!KNOWN_GAME_TYPES.includes(stage.type)) {
        fail(lvl.id, stage.type, `Unknown game type '${stage.type}' not rendered by PlayPage!`);
      }

      if (!stage.items || stage.items.length === 0) {
        fail(lvl.id, stage.type, `Stage ${i} has 0 items!`);
      }

      // Check item integrity
      for (const item of stage.items) {
        if (!item.id || !item.symbol) {
          fail(lvl.id, stage.type, `Item missing id or symbol: ${JSON.stringify(item)}`);
        }
      }

      // Game specific validations
      if (stage.type === 'match') {
        if (!stage.pairs || stage.pairs.length === 0) {
          fail(lvl.id, 'match', 'No pairs defined for match stage');
        } else {
          if (stage.pairs.length > 5) {
            fail(lvl.id, 'match', `SCREEN OVERFLOW BUG: ${stage.pairs.length} pairs on screen! Maximum child-usable is 5.`);
          }
          for (const p of stage.pairs) {
            if (!p.left || !p.right) {
              fail(lvl.id, 'match', `Invalid pair structure: ${JSON.stringify(p)}`);
            }
          }
        }
      }

      if (stage.type === 'count') {
        for (const item of stage.items) {
          const raw = parseInt(item.symbol, 10);
          if (isNaN(raw)) {
            fail(lvl.id, 'count', `Non-numeric symbol '${item.symbol}' in count game!`);
          }
          const emoji = getItemEmoji(item);
          if (!emoji || emoji === '✨') {
            warn(lvl.id, 'count', `No specific emoji mapped for item '${item.id}' (${item.pictureWord})`);
          }
        }
      }

      if (stage.type === 'trace') {
        for (const item of stage.items) {
          const strokes = getRenderedStrokes(item.symbol, { minX: 80, maxX: 320, minY: 80, maxY: 320 });
          if (!strokes || strokes.length === 0) {
            fail(lvl.id, 'trace', `No strokes rendered for item '${item.id}' symbol '${item.symbol}'`);
          }
        }
      }

      if (stage.type === 'find' || stage.type === 'quiz') {
        if (!stage.distractors || stage.distractors.length < 2) {
          warn(lvl.id, stage.type, `Few distractors: ${stage.distractors?.length || 0}`);
        }
      }

      if (stage.type === 'spotDifference') {
        if (!stage.items[0]) {
          fail(lvl.id, 'spotDifference', 'No target item');
        }
        if (!stage.distractors || stage.distractors.length === 0) {
          fail(lvl.id, 'spotDifference', 'No confusable distractors');
        }
      }
    }
  }
}

console.log(`\n================ ALL-WORLDS SIMULATION RESULT ================`);
console.log(`Failures: ${failureCount}, Warnings: ${warningCount}`);
