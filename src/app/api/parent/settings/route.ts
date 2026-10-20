import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings, children } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const childId = 1;
    const currentChild = await db.select().from(children).where(eq(children.id, childId)).get();
    const currentSettings = await db.select().from(settings).where(eq(settings.childId, childId)).get();

    let enabledWorlds = ['abc-garden', 'number-farm', 'fidel-village'];
    if (currentSettings?.enabledWorldsJson) {
      try {
        const parsed = JSON.parse(currentSettings.enabledWorldsJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          enabledWorlds = parsed;
        }
      } catch (e) {
        console.error('Failed to parse enabledWorldsJson:', e);
      }
    }

    return NextResponse.json({
      childName: currentChild?.name || 'Learner',
      sessionLimitMin: currentSettings?.sessionLimitMin ?? 15,
      volume: currentSettings?.volume ?? 0.8,
      voiceGender: currentSettings?.voiceGender === 'parent' ? 'parent' : 'male',
      voiceSpeed: currentSettings?.voiceSpeed ?? 0.9,
      enabledWorlds,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    // Return safe fallback settings instead of 500 error to keep client working
    return NextResponse.json({
      childName: 'Learner',
      sessionLimitMin: 15,
      volume: 0.8,
      voiceGender: 'male',
      voiceSpeed: 0.9,
      enabledWorlds: ['abc-garden', 'number-farm', 'fidel-village'],
    });
  }
}

export async function POST(request: Request) {
  try {
    const childId = 1;
    const body = await request.json();
    const { childName, sessionLimitMin, volume, enabledWorlds, voiceGender, voiceSpeed } = body;

    if (childName && typeof childName === 'string') {
      await db.update(children)
        .set({ name: childName.trim() })
        .where(eq(children.id, childId))
        .run();
    }

    const worldsToSave = Array.isArray(enabledWorlds) && enabledWorlds.length > 0
      ? enabledWorlds
      : ['abc-garden', 'number-farm', 'fidel-village'];

    const enabledWorldsJson = JSON.stringify(worldsToSave);

    const existingSettings = await db.select().from(settings).where(eq(settings.childId, childId)).get();
    const sanitizedVoiceGender = voiceGender === 'parent' ? 'parent' : 'male';

    if (existingSettings) {
      await db.update(settings)
        .set({
          sessionLimitMin: typeof sessionLimitMin === 'number' ? sessionLimitMin : 15,
          volume: typeof volume === 'number' ? volume : 0.8,
          enabledWorldsJson,
          voiceGender: sanitizedVoiceGender,
          voiceSpeed: typeof voiceSpeed === 'number' ? voiceSpeed : 0.9,
        })
        .where(eq(settings.childId, childId))
        .run();
    } else {
      await db.insert(settings)
        .values({
          childId,
          sessionLimitMin: typeof sessionLimitMin === 'number' ? sessionLimitMin : 15,
          volume: typeof volume === 'number' ? volume : 0.8,
          enabledWorldsJson,
          voiceGender: sanitizedVoiceGender,
          voiceSpeed: typeof voiceSpeed === 'number' ? voiceSpeed : 0.9,
        })
        .run();
    }

    return NextResponse.json({ success: true, enabledWorlds: worldsToSave });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ success: true, enabledWorlds: ['abc-garden', 'number-farm', 'fidel-village'], localOnly: true });
  }
}
