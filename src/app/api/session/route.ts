import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// Session rows are written by the SessionTimer: one insert when play starts,
// one update when the session ends (time-up or tab close via keepalive).
export async function POST(request: Request) {
  try {
    const childId = 1;
    const body = await request.json().catch(() => ({}));
    const { sessionId, startedAt, endedAt, minutes } = body;

    if (typeof sessionId === 'number' && Number.isInteger(sessionId) && sessionId > 0) {
      const existing = db.select({ id: sessions.id }).from(sessions)
        .where(eq(sessions.id, sessionId)).get();
      if (!existing) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      db.update(sessions)
        .set({
          endedAt: typeof endedAt === 'string' ? endedAt : new Date().toISOString(),
          minutes: typeof minutes === 'number' && minutes >= 0 ? minutes : null,
        })
        .where(eq(sessions.id, sessionId))
        .run();
      return NextResponse.json({ success: true });
    }

    if (typeof startedAt === 'string' && !isNaN(Date.parse(startedAt))) {
      const row = db.insert(sessions)
        .values({ childId, startedAt })
        .returning({ id: sessions.id })
        .get();
      return NextResponse.json({ sessionId: row?.id ?? null });
    }

    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  } catch (error) {
    console.error('Error recording session:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
