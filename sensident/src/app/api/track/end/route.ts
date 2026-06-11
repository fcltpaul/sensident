import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { readingSessions } from '@/db/schema';
import { eq } from 'drizzle-orm';

const EndSchema = z.object({
  sessionId: z.string(),
  articleSlug: z.string(),
  source: z.enum(['newsletter', 'site', 'direct']),
  cabinetId: z.string().nullable().optional(),
  duration: z.number().int().min(0),
  maxScroll: z.number().int().min(0).max(100),
  maxSlide: z.number().int().min(0).max(5),
  completed: z.boolean(),
});

export async function POST(req: NextRequest) {
  let raw;
  try {
    raw = await req.text();
    const data = JSON.parse(raw);
    const parsed = EndSchema.safeParse(data);
    if (!parsed.success) {
      return new NextResponse(null, { status: 400 });
    }

    await db
      .update(readingSessions)
      .set({
        endedAt: new Date(),
        durationSeconds: parsed.data.duration,
        maxScrollPct: parsed.data.maxScroll,
        maxSlideReached: parsed.data.maxSlide,
        completed: parsed.data.completed,
      })
      .where(eq(readingSessions.id, parsed.data.sessionId));
  } catch {
    // Silencieux : le navigator.sendBeacon n'attend pas de reponse
  }
  return new NextResponse(null, { status: 204 });
}
