import { db } from '@/lib/db';
import { settings, worlds } from '@/lib/schema';
import { eq } from 'drizzle-orm';

/**
 * Slugs the parent has enabled for a child. Falls back to every world when
 * the setting is unset or corrupt, so kids are never locked out entirely.
 */
export async function getEnabledWorlds(childId: number): Promise<string[]> {
  const row = await db.select().from(settings).where(eq(settings.childId, childId)).get();
  try {
    const parsed = row?.enabledWorldsJson ? JSON.parse(row.enabledWorldsJson) : null;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(String);
  } catch (e) {
    console.error('Failed to parse enabledWorldsJson:', e);
  }
  const allWorlds = await db.select({ slug: worlds.slug }).from(worlds).all();
  return allWorlds.map(w => w.slug);
}
