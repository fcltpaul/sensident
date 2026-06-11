/**
 * Cron : envoi des newsletters planifiées
 *
 * Appelé par Vercel Cron (configuré dans vercel.json) ou par keep-alive.
 * Nécessite CRON_SECRET en header Authorization Bearer.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { newsletterSends } from '@/db/schema';
import { and, eq, lte, isNull } from 'drizzle-orm';
import { executeNewsletterSend } from '@/lib/newsletter';

const CRON_SECRET = process.env.CRON_SECRET || 'dev-cron-secret';

export async function GET(req: NextRequest) {
  // Auth
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }

  const now = new Date();

  // Trouver les sends planifiés et dus
  const due = await db
    .select()
    .from(newsletterSends)
    .where(
      and(
        eq(newsletterSends.status, 'scheduled'),
        lte(newsletterSends.scheduledAt, now),
      )
    );

  if (due.length === 0) {
    return NextResponse.json({ success: true, sent: 0, message: 'Aucun send du.' });
  }

  const results: Array<{ id: string; status: string; message: string }> = [];

  for (const send of due) {
    try {
      // Recuperer le cabinet et practitioner depuis le send
      // Le send stocke cabinetId et createdBy (practitionerId)
      const practitionerId = send.createdBy ?? '';
      if (!practitionerId) {
        results.push({ id: send.id, status: 'error', message: 'Pas de createdBy' });
        continue;
      }

      // Chercher l'article slug depuis les recipients (1er qui matche)
      // ou utiliser send.articleSlug directement
      const articleSlug = send.articleSlug ?? '';
      if (!articleSlug) {
        results.push({ id: send.id, status: 'error', message: 'Pas d\'article' });
        continue;
      }

      // Chercher le template
      const templateId = send.templateId ?? '';
      if (!templateId) {
        results.push({ id: send.id, status: 'error', message: 'Pas de template' });
        continue;
      }

      const result = await executeNewsletterSend(send.id, {
        cabinetId: send.cabinetId,
        practitionerId,
        articleSlug,
        templateId,
        subject: send.subject,
        customMessage: send.customMessage ?? '',
      });

      results.push({ id: send.id, status: result.success ? 'sent' : 'error', message: result.message });
    } catch (err) {
      results.push({ id: send.id, status: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }

  const successCount = results.filter((r) => r.status === 'sent').length;

  return NextResponse.json({
    success: true,
    sent: successCount,
    total: due.length,
    results,
  });
}
