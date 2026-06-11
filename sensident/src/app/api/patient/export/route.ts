/**
 * Sensident — Endpoint RGPD "droit a la portabilite" (art. 20)
 *
 * Un patient peut demander un export de ses donnees au format JSON.
 * Necessite une verification d'identite (magic link).
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { db } from '@/db/client';
import { patientConsents, patientMagicLinks, newsletterRecipients, readingSessions, cabinets } from '@/db/schema';
import { and, eq, isNotNull, desc } from 'drizzle-orm';

const ExportSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  cabinetSlug: z.string(),
  magicToken: z.string().min(1),
});

const CABINET_HASH_SALT = process.env.CABINET_HASH_SALT || 'dev-only-salt-replace-in-prod';

export async function POST(req: NextRequest) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }); }
  const parsed = ExportSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Donnees invalides.' }, { status: 400 });

  const { email, cabinetSlug, magicToken } = parsed.data;

  // Verifier le magic token
  const tokenHash = crypto.createHash('sha256').update(magicToken).digest('hex');
  const magic = (await db
    .select()
    .from(patientMagicLinks)
    .where(
      and(
        eq(patientMagicLinks.tokenHash, tokenHash),
        isNotNull(patientMagicLinks.usedAt)  // doit avoir ete utilise (= login reussi)
      )
    )
    .limit(1))[0];

  if (!magic) {
    return NextResponse.json({ error: 'Lien magique invalide ou expire.' }, { status: 401 });
  }

  // Trouver le cabinet
  const cab = (await db.select().from(cabinets).where(eq(cabinets.slug, cabinetSlug)).limit(1))[0];
  if (!cab) return NextResponse.json({ error: 'Cabinet introuvable.' }, { status: 404 });

  // Verifier que l'email correspond
  const emailHash = crypto.createHash('sha256').update(email + cab.id + CABINET_HASH_SALT).digest('hex');
  if (emailHash !== magic.emailHash) {
    return NextResponse.json({ error: 'Email ne correspond pas au token.' }, { status: 403 });
  }

  // Collecter toutes les donnees
  const consents = await db.select().from(patientConsents).where(
    and(eq(patientConsents.cabinetId, cab.id), eq(patientConsents.emailHash, emailHash))
  );

  const recipients = await db.select().from(newsletterRecipients).where(
    and(eq(newsletterRecipients.cabinetId, cab.id), eq(newsletterRecipients.patientEmailHash, emailHash))
  );

  const sessions = await db.select().from(readingSessions).where(
    and(eq(readingSessions.cabinetId, cab.id), eq(readingSessions.patientEmailHash, emailHash))
  ).orderBy(desc(readingSessions.startedAt));

  return NextResponse.json({
    export_date: new Date().toISOString(),
    cabinet: { name: cab.name, slug: cab.slug },
    consents: consents.map((c) => ({
      confirmed_at: c.confirmedAt,
      unsubscribed_at: c.unsubscribedAt,
      cgu_accepted: c.cguAccepted,
      newsletter_optin: c.newsletterOptin,
    })),
    newsletter_recipients: recipients.map((r) => ({
      send_id: r.sendId,
      status: r.status,
      sent_at: r.sentAt,
      opened_at: r.openedAt,
    })),
    reading_sessions: sessions.map((s) => ({
      article_slug: s.articleSlug,
      started_at: s.startedAt,
      duration_seconds: s.durationSeconds,
      max_scroll_pct: s.maxScrollPct,
      completed: s.completed,
    })),
  }, {
    headers: {
      'Content-Disposition': `attachment; filename="sensident-export-${cab.slug}-${Date.now()}.json"`,
    },
  });
}
