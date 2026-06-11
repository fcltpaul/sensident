import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { readingSessions, articleHeartbeats, cabinets } from '@/db/schema';
import { eq } from 'drizzle-orm';

const HeartbeatSchema = z.object({
  sessionId: z.string().min(1).max(64),
  articleSlug: z.string().min(1).max(80),
  source: z.enum(['newsletter', 'site', 'direct']),
  cabinetId: z.string().nullable().optional(),
  scrollPct: z.number().int().min(0).max(100),
  tabVisible: z.boolean(),
  slideIndex: z.number().int().min(1).max(5).nullable(),
  duration: z.number().int().min(0),
});

/**
 * T1 — Recoit les heartbeat JS du lecteur article
 *
 * Le cabinet_id est transmis depuis la page article (resolu depuis
 * le slug cabinet dans l'URL). Si non disponible (lecture directe
 * sans contexte cabinet), on log anonymement.
 */
export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  const parsed = HeartbeatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Donnees invalides.' }, { status: 400 });
  }

  const data = parsed.data;
  const cabinetId = data.cabinetId;

  // Sans contexte cabinet : anonymous
  if (!cabinetId) {
    return NextResponse.json({ success: true, anonymous: true });
  }

  // Verifier que le cabinet existe
  const cab = await db.select({ id: cabinets.id }).from(cabinets).where(eq(cabinets.id, cabinetId)).limit(1);
  if (cab.length === 0) {
    return NextResponse.json({ success: true, anonymous: true });
  }
  const resolvedCabinet = cab[0].id;

  // Verifier si la session existe deja
  const existing = await db
    .select({ id: readingSessions.id })
    .from(readingSessions)
    .where(eq(readingSessions.id, data.sessionId))
    .limit(1);

  if (existing.length === 0) {
    // Creer la session
    await db.insert(readingSessions).values({
      id: data.sessionId,
      cabinetId: resolvedCabinet,
      patientEmailHash: 'anonymous',
      articleSlug: data.articleSlug,
      source: data.source,
      clientUserAgent: req.headers.get('user-agent') || undefined,
    });
  }

  // Update session
  await db
    .update(readingSessions)
    .set({
      maxScrollPct: data.scrollPct,
      maxSlideReached: data.slideIndex ?? undefined,
      durationSeconds: data.duration,
    })
    .where(eq(readingSessions.id, data.sessionId));

  // Inserer heartbeat
  await db.insert(articleHeartbeats).values({
    readingSessionId: data.sessionId,
    cabinetId: resolvedCabinet,
    scrollPct: data.scrollPct,
    tabVisible: data.tabVisible,
    slideIndex: data.slideIndex ?? undefined,
  });

  return NextResponse.json({ success: true });
}
