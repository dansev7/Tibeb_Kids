/**
 * Level Engine for Little Learner
 *
 * Builds interactive, multi-stage game sequences tailored for 5-year-old learners:
 * - Stage types: meet, find, match, quiz, celebrate
 * - Meet: Introduces new letters/numbers/fidels one-by-one with sound and picture
 * - Find: Given a sound or symbol, find it among 3-4 choices (prioritizing confusable distractors)
 * - Match: Drag and connect pairs (e.g. capital to lowercase, or symbol to picture)
 * - Quiz: 5-8 mixed multi-sensory questions without hints
 * - Celebrate: Star fanfare celebration and progress rewards
 */

export interface ItemLike {
  id: string;
  worldId?: string | null;
  kind?: string;
  symbol: string;
  displayName?: string | null;
  audioPath?: string | null;
  picturePath?: string | null;
  pictureWord?: string | null;
  pictureWordAmharic?: string | null;
  pictureWordEnglish?: string | null;
  pictureWordAudioPath?: string | null;
  strokePathsJson?: string | null;
  confusableWithJson?: string | null;
  confusableWith?: string[] | null;
  isNew?: number | boolean | null;
}

export interface LevelLike {
  id: string;
  worldId?: string | null;
  orderNum?: number;
  order?: number;
  title?: string;
  description?: string | null;
  type?: 'learn' | 'review' | 'tricky' | string;
  stages?: string[];
  newItemIds?: string[];
  itemIds?: string[];
}

export interface MeetStage<T extends ItemLike = ItemLike> {
  type: 'meet';
  items: T[];
}

export interface FindQuestion<T extends ItemLike = ItemLike> {
  id: string;
  targetItem: T;
  choices: T[];
  promptAudio: string | null;
  promptSymbol: string;
  promptPicture?: string | null;
}

export interface FindStage<T extends ItemLike = ItemLike> {
  type: 'find';
  items: T[];
  questions: FindQuestion<T>[];
}

export interface MatchPair<T extends ItemLike = ItemLike> {
  id: string;
  item: T;
  left: {
    id: string;
    label: string;
    symbol: string;
    audioPath?: string | null;
  };
  right: {
    id: string;
    label: string;
    symbol?: string;
    picturePath?: string | null;
    pictureWord?: string | null;
    audioPath?: string | null;
  };
}

export interface MatchStage<T extends ItemLike = ItemLike> {
  type: 'match';
  items: T[];
  pairs: MatchPair<T>[];
}

export type QuizQuestionType =
  | 'hear_and_pick_symbol'
  | 'see_picture_pick_symbol'
  | 'see_symbol_pick_picture';

export interface QuizQuestion<T extends ItemLike = ItemLike> {
  id: string;
  type: QuizQuestionType;
  targetItem: T;
  choices: T[];
  promptAudio: string | null;
  promptSymbol?: string;
  promptPicture?: string | null;
  promptWord?: string | null;
}

export interface QuizStage<T extends ItemLike = ItemLike> {
  type: 'quiz';
  items: T[];
  questions: QuizQuestion<T>[];
}

export interface CelebrateStage<T extends ItemLike = ItemLike> {
  type: 'celebrate';
  items: T[];
  starsMax: number;
  levelTitle: string;
}

export type Stage<T extends ItemLike = ItemLike> =
  | MeetStage<T>
  | FindStage<T>
  | MatchStage<T>
  | QuizStage<T>
  | CelebrateStage<T>;

/**
 * Fisher-Yates array shuffle.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Parses confusables list for an item.
 */
function getConfusables(item: ItemLike): string[] {
  if (Array.isArray(item.confusableWith)) {
    return item.confusableWith;
  }
  if (typeof item.confusableWithJson === 'string') {
    try {
      const parsed = JSON.parse(item.confusableWithJson);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore json parse error
    }
  }
  return [];
}

/**
 * Selects 2-3 distractors for a target item from available world items,
 * prioritizing confusable items if available.
 */
function pickDistractors<T extends ItemLike>(
  target: T,
  pool: T[],
  count: number = 3
): T[] {
  const confusableIds = getConfusables(target);
  const otherItems = pool.filter((it) => it.id !== target.id);

  const confusableMatches: T[] = [];
  const normalMatches: T[] = [];

  for (const it of otherItems) {
    if (confusableIds.includes(it.id)) {
      confusableMatches.push(it);
    } else {
      normalMatches.push(it);
    }
  }

  const shuffledConfusables = shuffleArray(confusableMatches);
  const shuffledNormals = shuffleArray(normalMatches);

  const selected = [...shuffledConfusables, ...shuffledNormals].slice(0, count);
  return selected;
}

/**
 * Builds the full stage sequence for a level:
 * meet -> find -> match -> quiz -> celebrate
 */
export function buildLevelStages<T extends ItemLike>(
  level: LevelLike,
  items: T[],
  allWorldItems: T[] = items
): Stage<T>[] {
  if (!items || items.length === 0) {
    return [];
  }

  // 1. Determine new items vs review items
  let newItems: T[] = [];
  if (level.newItemIds && Array.isArray(level.newItemIds) && level.newItemIds.length > 0) {
    newItems = items.filter((it) => level.newItemIds?.includes(it.id));
  } else {
    const flagged = items.filter((it) => Boolean(it.isNew));
    if (flagged.length > 0) {
      newItems = flagged;
    } else if (level.type === 'learn' || level.type === 'tricky') {
      newItems = items;
    }
  }

  // Determine stage sequence to construct
  const stageTypes =
    level.stages && Array.isArray(level.stages) && level.stages.length > 0
      ? level.stages
      : level.type === 'review'
      ? ['find', 'match', 'quiz', 'celebrate']
      : ['meet', 'find', 'match', 'quiz', 'celebrate'];

  const stages: Stage<T>[] = [];
  const distractorPool = allWorldItems.length >= 4 ? allWorldItems : items;

  for (const st of stageTypes) {
    if (st === 'meet') {
      // Meet stage: introduces new items (or all items if review with meet specified)
      const meetItems = newItems.length > 0 ? newItems : items;
      if (meetItems.length > 0) {
        stages.push({
          type: 'meet',
          items: meetItems,
        });
      }
    } else if (st === 'find') {
      // Find stage: pick target from 3-4 choices
      const targetItems = newItems.length > 0 ? newItems : items;
      const questions: FindQuestion<T>[] = targetItems.map((target, idx) => {
        const distractors = pickDistractors(target, distractorPool, 3);
        const choices = shuffleArray([target, ...distractors]);
        return {
          id: `find-q-${idx}-${target.id}`,
          targetItem: target,
          choices,
          promptAudio: target.audioPath ?? null,
          promptSymbol: target.symbol,
          promptPicture: target.picturePath ?? null,
        };
      });

      stages.push({
        type: 'find',
        items: targetItems,
        questions,
      });
    } else if (st === 'match') {
      // Match stage: drag and match pairs (symbol to picture/word or uppercase to lowercase)
      const matchCandidateItems = items.slice(0, 5); // 3 to 5 pairs for optimal young child focus
      const pairs: MatchPair<T>[] = matchCandidateItems.map((item, idx) => ({
        id: `match-pair-${idx}-${item.id}`,
        item,
        left: {
          id: `left-${item.id}`,
          label: item.displayName ?? item.symbol,
          symbol: item.symbol,
          audioPath: item.audioPath,
        },
        right: {
          id: `right-${item.id}`,
          label: item.pictureWord ?? item.displayName ?? item.symbol,
          symbol: item.symbol,
          picturePath: item.picturePath,
          pictureWord: item.pictureWord,
          audioPath: item.pictureWordAudioPath ?? item.audioPath,
        },
      }));

      stages.push({
        type: 'match',
        items: matchCandidateItems,
        pairs,
      });
    } else if (st === 'quiz') {
      // Quiz stage: 5-8 mixed questions without hints
      const targetCount = Math.min(8, Math.max(5, items.length));
      const questions: QuizQuestion<T>[] = [];
      const questionTypes: QuizQuestionType[] = [
        'hear_and_pick_symbol',
        'see_picture_pick_symbol',
        'see_symbol_pick_picture',
      ];

      for (let i = 0; i < targetCount; i++) {
        const target = items[i % items.length];
        const qType = questionTypes[i % questionTypes.length];
        const distractors = pickDistractors(target, distractorPool, 3);
        const choices = shuffleArray([target, ...distractors]);

        questions.push({
          id: `quiz-q-${i}-${target.id}`,
          type: qType,
          targetItem: target,
          choices,
          promptAudio:
            qType === 'hear_and_pick_symbol'
              ? target.audioPath ?? null
              : target.pictureWordAudioPath ?? target.audioPath ?? null,
          promptSymbol: target.symbol,
          promptPicture: target.picturePath ?? null,
          promptWord: target.pictureWord ?? null,
        });
      }

      stages.push({
        type: 'quiz',
        items,
        questions: shuffleArray(questions),
      });
    } else if (st === 'celebrate') {
      // Celebrate stage: summary with stars
      stages.push({
        type: 'celebrate',
        items,
        starsMax: 3,
        levelTitle: level.title ?? 'Level Complete!',
      });
    }
  }

  return stages;
}

// ---------------------------------------------------------------------------
// Runtime stage builder (served by /api/levels/[levelId], consumed by /play)
// ---------------------------------------------------------------------------

/**
 * A stage in the wire format the play page renders:
 * items + optional distractors/pairs. This is the single source of truth
 * for turning authored `stages` (levels.json) into a playable sequence.
 */
export interface GameStage<T extends ItemLike = ItemLike> {
  type: string;
  items: T[];
  distractors?: T[];
  pairs?: Array<{ left: T; right: T }>;
}

export interface GameStageOptions<T extends ItemLike> {
  /** Authored stage order from levels.json; falls back to defaults by level type. */
  stages?: string[] | null;
  levelType: 'learn' | 'review' | 'tricky' | string;
  worldSlug?: string | null;
  /** All items belonging to the level, in authored order. */
  items: T[];
  /** Items from the same world that are NOT part of this level. */
  distractorPool: T[];
  /** Items marked is_new for this level (meet/trace focus). */
  newItemIds?: string[];
}

/**
 * Default stage pipeline when a level has no authored stages.
 * Number worlds count instead of find; tricky levels always spot-difference.
 */
export function defaultStagesForLevel(levelType: string, hasNumbers: boolean): string[] {
  const picker = hasNumbers ? 'count' : 'find';
  if (levelType === 'review') {
    return [picker, 'match', 'quiz', 'celebrate'];
  }
  if (levelType === 'tricky') {
    return ['meet', picker, 'match', 'trace', 'spotDifference', 'quiz', 'celebrate'];
  }
  return ['meet', picker, 'match', 'trace', 'quiz', 'celebrate'];
}

/**
 * Builds the playable stage list for a level, honoring the authored
 * `stages` array when present. 'celebrate' is a marker only — the play
 * page renders its CelebrationScreen once the returned list is exhausted,
 * so it is not emitted as a stage here.
 */
export function buildGameStages<T extends ItemLike>(opts: GameStageOptions<T>): GameStage<T>[] {
  const { levelType, items, distractorPool, newItemIds = [] } = opts;
  if (items.length === 0) return [];

  const hasNumbers = items.some((i) => i.kind === 'number');
  const authored =
    Array.isArray(opts.stages) && opts.stages.length > 0
      ? opts.stages
      : defaultStagesForLevel(levelType, hasNumbers);

  const itemsToIntroduce =
    newItemIds.length > 0
      ? items.filter((i) => newItemIds.includes(i.id))
      : items;

  const stages: GameStage<T>[] = [];

  for (const st of authored) {
    switch (st) {
      case 'meet':
        stages.push({ type: 'meet', items: itemsToIntroduce.length > 0 ? itemsToIntroduce : items });
        break;
      case 'find':
        stages.push({
          type: 'find',
          items: itemsToIntroduce.length > 0 ? itemsToIntroduce : items,
          distractors: distractorPool.slice(0, 6),
        });
        break;
      case 'count':
        stages.push({ type: 'count', items: itemsToIntroduce.length > 0 ? itemsToIntroduce : items });
        break;
      case 'match': {
        if (items.length < 2) break;
        const matchItems = itemsToIntroduce.length > 0 ? itemsToIntroduce : items;
        const pairs = matchItems.map((item) => ({
          left: item,
          right: {
            ...item,
            symbol: item.pictureWord ?? item.symbol,
            displayName: item.pictureWord ?? item.displayName,
          } as T,
        }));
        stages.push({ type: 'match', items: matchItems, pairs });
        break;
      }
      case 'trace':
        stages.push({ type: 'trace', items: itemsToIntroduce.length > 0 ? itemsToIntroduce : items });
        break;
      case 'spotDifference': {
        if (levelType !== 'tricky' || !items[0]) break;
        const target = items[0];
        const confusableIds = getConfusables(target);
        // Confusable siblings can live inside the level itself (e.g. b/d/p/q
        // in "Tricky Twins") — search level items first, then world extras.
        const pool = [...items, ...distractorPool].filter(
          (i) => i.id !== target.id && confusableIds.includes(i.id)
        );
        stages.push({
          type: 'spotDifference',
          items: [target],
          distractors: pool.length > 0 ? pool : distractorPool.slice(0, 3),
        });
        break;
      }
      case 'listen':
        stages.push({
          type: 'listen',
          items: shuffleArray(items).slice(0, 4),
          distractors: distractorPool.slice(0, 6),
        });
        break;
      case 'quiz':
        stages.push({
          type: 'quiz',
          items: shuffleArray(items).slice(0, Math.min(items.length, 6)),
          distractors: distractorPool.slice(0, 6),
        });
        break;
      case 'celebrate':
        // Rendered by the play page after the last stage — nothing to emit.
        break;
    }
  }

  return stages;
}
