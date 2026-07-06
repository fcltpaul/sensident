import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { readingSessions, patientConsents } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

const EndSchema = z.object({
  sessionId: z.string(),
  articleSlug: z.string(),
  source: z.enum(['newsletter', 'site', 'direct']),
  cabinetId: z.string().nullable().optional(),
  duration: z.number().int().min(0),
  maxScroll: z.number().int().min(0).max(100),
  maxSlide: z.number().int().min(0).max(5),
  completed: z.boolean(),
  // RGPD : hash email optionnel (depuis magic-link cookie) → check consentAnalytics
  patientEmailHash: z.string().optional(),
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

    // RGPD article 7 : si patient identifie et SANS consentement analytics,
    // on efface les donnees granularisees (maxScroll, maxSlide, duration,
    // completed). La session existe mais reste minimale : on garde juste
    // la trace qu'une lecture a eu lieu pour les compteurs du cabinet.
    if (parsed.data.patientEmailHash && parsed.data.cabinetId) {
      const consent = await db
        .select({ consentAnalytics: patientConsents.consentAnalytics })
        .from(patientConsents)
        .where(
          and(
            eq(patientConsents.cabinetId, parsed.data.cabinetId),
            eq(patientConsents.emailHash, parsed.data.patientEmailHash),
          ),
        )
        .limit(1);
      if (consent[0]?.consentAnalytics !== true) {
        await db
          .update(readingSessions)
          .set({
            maxScrollPct: 0,
            maxSlideReached: 0,
            durationSeconds: 0,
            completed: false,
            patientEmailHash: 'anonymous',
          })
          .where(eq(readingSessions.id, parsed.data.sessionId));
      }
    }
  } catch {
    // Silencieux : le navigator.sendBeacon n'attend pas de reponse
  }
  return new NextResponse(null, { status: 204 });
}
