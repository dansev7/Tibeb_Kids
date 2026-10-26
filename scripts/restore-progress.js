const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

// 1. Read .env for Turso credentials
const envPath = path.join(__dirname, '..', '.env');
let tursoUrl = '';
let tursoToken = '';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('TURSO_DATABASE_URL=')) {
      tursoUrl = trimmed.replace(/^TURSO_DATABASE_URL=['"]?/, '').replace(/['"]?$/, '');
    }
    if (trimmed.startsWith('TURSO_AUTH_TOKEN=')) {
      tursoToken = trimmed.replace(/^TURSO_AUTH_TOKEN=['"]?/, '').replace(/['"]?$/, '');
    }
  }
}

const childId = 1;
const completedTime = new Date().toISOString();

// Prepare progress records to set
// English: Phase 1 (abc-1 to abc-17) completed with 3 stars! abc-18 unlocked!
// Math: num-1 to num-6 completed with 3 stars! num-7 unlocked!
// Fidel: fidel-1 unlocked!
const progressUpdates = [];

// ABC Garden Phase 1 (Levels 1 to 17) -> COMPLETED
for (let i = 1; i <= 17; i++) {
  progressUpdates.push({
    child_id: childId,
    level_id: `abc-${i}`,
    stars: 3,
    best_score: 3,
    completed_at: completedTime,
    unlocked: 1,
  });
}

// ABC Garden Phase 2 Level 1 (abc-18) -> UNLOCKED
progressUpdates.push({
  child_id: childId,
  level_id: 'abc-18',
  stars: 0,
  best_score: 0,
  completed_at: null,
  unlocked: 1,
});

// ABC Garden Phase 2 remaining (abc-19 to abc-32) -> locked
for (let i = 19; i <= 32; i++) {
  progressUpdates.push({
    child_id: childId,
    level_id: `abc-${i}`,
    stars: 0,
    best_score: 0,
    completed_at: null,
    unlocked: 0,
  });
}

// Number Farm Levels 1 to 6 -> COMPLETED
for (let i = 1; i <= 6; i++) {
  progressUpdates.push({
    child_id: childId,
    level_id: `num-${i}`,
    stars: 3,
    best_score: 3,
    completed_at: completedTime,
    unlocked: 1,
  });
}

// Number Farm Level 7 (Currently on Level 7) -> UNLOCKED
progressUpdates.push({
  child_id: childId,
  level_id: 'num-7',
  stars: 0,
  best_score: 0,
  completed_at: null,
  unlocked: 1,
});

// Number Farm Levels 8 to 12 -> locked
for (let i = 8; i <= 12; i++) {
  progressUpdates.push({
    child_id: childId,
    level_id: `num-${i}`,
    stars: 0,
    best_score: 0,
    completed_at: null,
    unlocked: 0,
  });
}

// Fidel Village Level 1 -> UNLOCKED
progressUpdates.push({
  child_id: childId,
  level_id: 'fidel-1',
  stars: 0,
  best_score: 0,
  completed_at: null,
  unlocked: 1,
});
for (let i = 2; i <= 17; i++) {
  progressUpdates.push({
    child_id: childId,
    level_id: `fidel-${i}`,
    stars: 0,
    best_score: 0,
    completed_at: null,
    unlocked: 0,
  });
}

async function run() {
  console.log('Restoring progress for Hemen Anbes (Child ID: 1)...');

  // 1. Update local SQLite
  const localDbPath = path.join(__dirname, '..', 'data', 'little-learner.db');
  if (fs.existsSync(localDbPath)) {
    const sqlite = new Database(localDbPath);
    const upsertSql = sqlite.prepare(`
      INSERT OR REPLACE INTO level_progress (child_id, level_id, stars, best_score, completed_at, unlocked)
      VALUES (@child_id, @level_id, @stars, @best_score, @completed_at, @unlocked)
    `);

    sqlite.transaction(() => {
      for (const row of progressUpdates) {
        upsertSql.run(row);
      }
    })();
    sqlite.close();
    console.log('✓ Restored in local SQLite database');
  }

  // 2. Update Turso Cloud
  if (tursoUrl) {
    console.log(`Connecting to Turso Cloud at ${tursoUrl}...`);
    const turso = createClient({ url: tursoUrl, authToken: tursoToken });

    const statements = progressUpdates.map((row) => ({
      sql: `INSERT OR REPLACE INTO level_progress (child_id, level_id, stars, best_score, completed_at, unlocked)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [row.child_id, row.level_id, row.stars, row.best_score, row.completed_at, row.unlocked],
    }));

    // Batch execute
    const chunkSize = 25;
    for (let i = 0; i < statements.length; i += chunkSize) {
      const chunk = statements.slice(i, i + chunkSize);
      await turso.batch(chunk, 'write');
    }
    console.log('✓ Restored in Turso Cloud database');
  }

  console.log('\n🎉 Successfully restored user progress!');
  console.log('- English Phase 1: 17/17 completed (17 levels with 3 stars)');
  console.log('- English Phase 2: Level 1 (abc-18) unlocked and ready to play!');
  console.log('- Number Farm: Levels 1-6 completed (with 3 stars), Level 7 unlocked and ready to play!');
  console.log('- Fidel Village: Level 1 unlocked and ready to play!');
}

run().catch((err) => {
  console.error('Error restoring progress:', err);
  process.exit(1);
});
