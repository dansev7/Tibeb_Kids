import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings, children } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const childId = 1;
    const currentChild = db.select().from(children).where(eq(children.id, childId)).get();
    const currentSettings = db.select().from(settings).where(eq(settings.childId, childId)).get();

    const enabledWorlds = currentSettings?.enabledWorldsJson
      ? JSON.parse(currentSettings.enabledWorldsJson)
      : ['abc-garden', 'number-farm', 'fidel-village'];

    return NextResponse.json({
      childName: currentChild?.name || 'Learner',
      sessionLimitMin: currentSettings?.sessionLimitMin ?? 15,
      volume: currentSettings?.volume ?? 0.8,
      voiceGender: currentSettings?.voiceGender || 'female',
      voiceSpeed: currentSettings?.voiceSpeed ?? 0.9,
      enabledWorlds,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const childId = 1;
    const body = await request.json();
    const { childName, sessionLimitMin, volume, enabledWorlds, voiceGender, voiceSpeed } = body;

    if (childName) {
      db.update(children)
        .set({ name: childName })
        .where(eq(children.id, childId))
        .run();
    }

    const enabledWorldsJson = JSON.stringify(
      enabledWorlds || ['abc-garden', 'number-farm', 'fidel-village']
    );

    const existingSettings = db.select().from(settings).where(eq(settings.childId, childId)).get();
    if (existingSettings) {
      db.update(settings)
        .set({
          sessionLimitMin: sessionLimitMin ?? 15,
          volume: volume ?? 0.8,
          enabledWorldsJson,
          voiceGender: voiceGender || 'female',
          voiceSpeed: voiceSpeed ?? 0.9,
        })
        .where(eq(settings.childId, childId))
        .run();
    } else {
      db.insert(settings)
        .values({
          childId,
          sessionLimitMin: sessionLimitMin ?? 15,
          volume: volume ?? 0.8,
          enabledWorldsJson,
          voiceGender: voiceGender || 'female',
          voiceSpeed: voiceSpeed ?? 0.9,
        })
        .run();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
