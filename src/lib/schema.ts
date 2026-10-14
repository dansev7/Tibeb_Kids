import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// child table
// ---------------------------------------------------------------------------
export const child = sqliteTable('child', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  avatar: text('avatar'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ---------------------------------------------------------------------------
// world table
// ---------------------------------------------------------------------------
export const world = sqliteTable('world', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  emoji: text('emoji'),
  themeColor: text('theme_color'),
  mascot: text('mascot'),
  orderNum: integer('order_num').notNull(),
});

// ---------------------------------------------------------------------------
// level table
// ---------------------------------------------------------------------------
export const level = sqliteTable('level', {
  id: text('id').primaryKey(),
  worldId: text('world_id')
    .notNull()
    .references(() => world.id, { onDelete: 'cascade' }),
  orderNum: integer('order_num').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type', { enum: ['learn', 'review', 'tricky'] }).notNull(),
  stagesJson: text('stages_json'),
});

// ---------------------------------------------------------------------------
// item table
// ---------------------------------------------------------------------------
export const item = sqliteTable('item', {
  id: text('id').primaryKey(),
  worldId: text('world_id').references(() => world.id, { onDelete: 'set null' }),
  kind: text('kind', {
    enum: ['letter_upper', 'letter_lower', 'number', 'fidel'],
  }).notNull(),
  symbol: text('symbol').notNull(),
  displayName: text('display_name'),
  audioPath: text('audio_path'),
  picturePath: text('picture_path'),
  pictureWord: text('picture_word'),
  pictureWordAmharic: text('picture_word_amharic'),
  pictureWordEnglish: text('picture_word_english'),
  pictureWordAudioPath: text('picture_word_audio_path'),
  strokePathsJson: text('stroke_paths_json'),
  confusableWithJson: text('confusable_with_json'),
});

// ---------------------------------------------------------------------------
// level_item table
// ---------------------------------------------------------------------------
export const levelItem = sqliteTable(
  'level_item',
  {
    levelId: text('level_id')
      .notNull()
      .references(() => level.id, { onDelete: 'cascade' }),
    itemId: text('item_id')
      .notNull()
      .references(() => item.id, { onDelete: 'cascade' }),
    orderNum: integer('order_num').notNull(),
    isNew: integer('is_new').default(0),
  },
  (table) => [
    primaryKey({ columns: [table.levelId, table.itemId] }),
  ]
);

// ---------------------------------------------------------------------------
// level_progress table
// ---------------------------------------------------------------------------
export const levelProgress = sqliteTable(
  'level_progress',
  {
    childId: integer('child_id')
      .notNull()
      .references(() => child.id, { onDelete: 'cascade' }),
    levelId: text('level_id')
      .notNull()
      .references(() => level.id, { onDelete: 'cascade' }),
    stars: integer('stars').default(0),
    bestScore: real('best_score').default(0),
    completedAt: text('completed_at'),
    unlocked: integer('unlocked').default(0),
  },
  (table) => [
    primaryKey({ columns: [table.childId, table.levelId] }),
  ]
);

// ---------------------------------------------------------------------------
// item_mastery table
// ---------------------------------------------------------------------------
export const itemMastery = sqliteTable(
  'item_mastery',
  {
    childId: integer('child_id')
      .notNull()
      .references(() => child.id, { onDelete: 'cascade' }),
    itemId: text('item_id')
      .notNull()
      .references(() => item.id, { onDelete: 'cascade' }),
    leitnerBox: integer('leitner_box').default(1),
    correctDays: integer('correct_days').default(0),
    lastSeenAt: text('last_seen_at'),
    nextReviewAt: text('next_review_at'),
    totalCorrect: integer('total_correct').default(0),
    totalWrong: integer('total_wrong').default(0),
  },
  (table) => [
    primaryKey({ columns: [table.childId, table.itemId] }),
  ]
);

// ---------------------------------------------------------------------------
// attempt table
// ---------------------------------------------------------------------------
export const attempt = sqliteTable('attempt', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  childId: integer('child_id')
    .notNull()
    .references(() => child.id, { onDelete: 'cascade' }),
  itemId: text('item_id').references(() => item.id, { onDelete: 'set null' }),
  levelId: text('level_id').references(() => level.id, { onDelete: 'set null' }),
  gameType: text('game_type'),
  correct: integer('correct'),
  usedHint: integer('used_hint'),
  firstTry: integer('first_try'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ---------------------------------------------------------------------------
// session table
// ---------------------------------------------------------------------------
export const session = sqliteTable('session', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  childId: integer('child_id')
    .notNull()
    .references(() => child.id, { onDelete: 'cascade' }),
  startedAt: text('started_at'),
  endedAt: text('ended_at'),
  minutes: real('minutes'),
});

// ---------------------------------------------------------------------------
// settings table
// ---------------------------------------------------------------------------
export const settings = sqliteTable('settings', {
  childId: integer('child_id')
    .primaryKey()
    .references(() => child.id, { onDelete: 'cascade' }),
  sessionLimitMin: integer('session_limit_min').default(15),
  volume: real('volume').default(0.8),
  enabledWorldsJson: text('enabled_worlds_json').default(
    '["abc-garden","number-farm","fidel-village"]'
  ),
  voiceGender: text('voice_gender').default('female'),
  voiceSpeed: real('voice_speed').default(0.9),
});


// Aliases for snake_case and plural table names
export const level_item = levelItem;
export const level_progress = levelProgress;
export const item_mastery = itemMastery;
export const worlds = world;
export const levels = level;
export const items = item;
export const levelItems = levelItem;
export const attempts = attempt;
export const sessions = session;
export const children = child;


// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const childRelations = relations(child, ({ many, one }) => ({
  levelProgresses: many(levelProgress),
  itemMasteries: many(itemMastery),
  attempts: many(attempt),
  sessions: many(session),
  settings: one(settings, {
    fields: [child.id],
    references: [settings.childId],
  }),
}));

export const worldRelations = relations(world, ({ many }) => ({
  levels: many(level),
  items: many(item),
}));

export const levelRelations = relations(level, ({ one, many }) => ({
  world: one(world, {
    fields: [level.worldId],
    references: [world.id],
  }),
  levelItems: many(levelItem),
  levelProgresses: many(levelProgress),
  attempts: many(attempt),
}));

export const itemRelations = relations(item, ({ one, many }) => ({
  world: one(world, {
    fields: [item.worldId],
    references: [world.id],
  }),
  levelItems: many(levelItem),
  itemMasteries: many(itemMastery),
  attempts: many(attempt),
}));

export const levelItemRelations = relations(levelItem, ({ one }) => ({
  level: one(level, {
    fields: [levelItem.levelId],
    references: [level.id],
  }),
  item: one(item, {
    fields: [levelItem.itemId],
    references: [item.id],
  }),
}));

export const levelProgressRelations = relations(levelProgress, ({ one }) => ({
  child: one(child, {
    fields: [levelProgress.childId],
    references: [child.id],
  }),
  level: one(level, {
    fields: [levelProgress.levelId],
    references: [level.id],
  }),
}));

export const itemMasteryRelations = relations(itemMastery, ({ one }) => ({
  child: one(child, {
    fields: [itemMastery.childId],
    references: [child.id],
  }),
  item: one(item, {
    fields: [itemMastery.itemId],
    references: [item.id],
  }),
}));

export const attemptRelations = relations(attempt, ({ one }) => ({
  child: one(child, {
    fields: [attempt.childId],
    references: [child.id],
  }),
  item: one(item, {
    fields: [attempt.itemId],
    references: [item.id],
  }),
  level: one(level, {
    fields: [attempt.levelId],
    references: [level.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  child: one(child, {
    fields: [session.childId],
    references: [child.id],
  }),
}));

export const settingsRelations = relations(settings, ({ one }) => ({
  child: one(child, {
    fields: [settings.childId],
    references: [child.id],
  }),
}));

// ---------------------------------------------------------------------------
// TypeScript Inferred Types
// ---------------------------------------------------------------------------
export type Child = typeof child.$inferSelect;
export type NewChild = typeof child.$inferInsert;

export type World = typeof world.$inferSelect;
export type NewWorld = typeof world.$inferInsert;

export type Level = typeof level.$inferSelect;
export type NewLevel = typeof level.$inferInsert;

export type Item = typeof item.$inferSelect;
export type NewItem = typeof item.$inferInsert;

export type LevelItem = typeof levelItem.$inferSelect;
export type NewLevelItem = typeof levelItem.$inferInsert;

export type LevelProgress = typeof levelProgress.$inferSelect;
export type NewLevelProgress = typeof levelProgress.$inferInsert;

export type ItemMastery = typeof itemMastery.$inferSelect;
export type NewItemMastery = typeof itemMastery.$inferInsert;

export type Attempt = typeof attempt.$inferSelect;
export type NewAttempt = typeof attempt.$inferInsert;

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;

export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
