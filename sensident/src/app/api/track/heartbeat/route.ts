import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { readingSessions, articleHeartbeats, cabinets, patientConsents } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

const HeartbeatSchema = z.object({
  sessionId: z.string().min(1).max(64),
  articleSlug: z.string().min(1).max(80),
  source: z.enum(['newsletter', 'site', 'direct']),
  cabinetId: z.string().nullable().optional(),
  scrollPct: z.number().int().min(0).max(100),
  tabVisible: z.boolean(),
  slideIndex: z.number().int().min(1).max(5).nullable(),
  duration: z.number().int().min(0),
  // RGPD : si le patient est identifié via magic-link, on a son hash email
  // → on peut vérifier consentAnalytics. Si absent, log anonyme sans
  // granularité (comptage global du cabinet uniquement).
  patientEmailHash: z.string().optional(),
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

  // RGPD article 7 : si le patient est identifie (magic-link cookie), verifier
  // son consentement analytics avant de loguer des donnees granularisees.
  // Si pas identifie → on logue en anonyme ("anonymous") sans heartbeats detailles.
  // Si identifie mais pas de consentement → on renvoie success:true sans log
  // granular (la session anonyme par defaut est creee uniquement pour compter
  // les lectures au niveau cabinet).
  let hasAnalyticsConsent = false;
  let resolvedPatientHash: string | null = null;
  if (data.patientEmailHash) {
    const consentRow = (
      await db
        .select({ consentAnalytics: patientConsents.consentAnalytics })
        .from(patientConsents)
        .where(
          and(
            eq(patientConsents.cabinetId, resolvedCabinet),
            eq(patientConsents.emailHash, data.patientEmailHash),
          ),
        )
        .limit(1)
    )[0];
    if (consentRow?.consentAnalytics) {
      hasAnalyticsConsent = true;
      resolvedPatientHash = data.patientEmailHash;
    }
  }

  // Verifier si la session existe deja
  const existing = await db
    .select({ id: readingSessions.id })
    .from(readingSessions)
    .where(eq(readingSessions.id, data.sessionId))
    .limit(1);

  if (existing.length === 0) {
    // Creer la session. patientEmailHash = 'anonymous' par defaut ; on met
    // le vrai hash uniquement si consentement analytics OK (sinon fuyant).
    await db.insert(readingSessions).values({
      id: data.sessionId,
      cabinetId: resolvedCabinet,
      patientEmailHash: resolvedPatientHash ?? 'anonymous',
      articleSlug: data.articleSlug,
      source: data.source,
      clientUserAgent: req.headers.get('user-agent') || undefined,
    });
  }

  // Update session uniquement si consentement OK (sinon on laisse la session
  // creer avec ses valeurs par defaut, sans granularite RGPD).
  if (hasAnalyticsConsent) {
    await db
      .update(readingSessions)
      .set({
        maxScrollPct: data.scrollPct,
        maxSlideReached: data.slideIndex ?? undefined,
        durationSeconds: data.duration,
      })
      .where(eq(readingSessions.id, data.sessionId));

    // Inserer heartbeat (donnees granularisees = donnees de sante par
    // deduction, RGPD + HDS obligent le consentement explicite).
    await db.insert(articleHeartbeats).values({
      readingSessionId: data.sessionId,
      cabinetId: resolvedCabinet,
      scrollPct: data.scrollPct,
      tabVisible: data.tabVisible,
      slideIndex: data.slideIndex ?? undefined,
    });
  }

  return NextResponse.json({
    success: true,
    analyticsLogged: hasAnalyticsConsent,
  });
}
