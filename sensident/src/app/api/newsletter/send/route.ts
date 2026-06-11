import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { db } from '@/db/client';
import {
  articles,
  newsletterTemplates,
  newsletterSends,
  newsletterRecipients,
  patientConsents,
  cabinets,
  practitioners,
  auditLogs,
} from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { executeNewsletterSend } from '@/lib/newsletter';

const SendSchema = z.object({
  cabinetId: z.string(),
  practitionerId: z.string(),
  articleSlug: z.string(),
  templateId: z.string(),
  subject: z.string().min(1).max(200),
  customMessage: z.string().max(200).optional().default(''),
  scheduledAt: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }); }

  const parsed = SendSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });

  // Verifier cabinet
  const cab = (await db.select().from(cabinets).where(eq(cabinets.id, session.cabinetId)).limit(1))[0];
  if (!cab) return NextResponse.json({ error: 'Cabinet introuvable.' }, { status: 404 });

  const prac = (await db.select().from(practitioners).where(eq(practitioners.id, session.practitionerId)).limit(1))[0];
  if (!prac) return NextResponse.json({ error: 'Praticien introuvable.' }, { status: 404 });

  // Verifier article
  const article = (await db.select().from(articles).where(eq(articles.slug, parsed.data.articleSlug)).limit(1))[0];
  if (!article || article.status !== 'validated') {
    return NextResponse.json({ error: 'Article introuvable ou non validé.' }, { status: 404 });
  }

  // Verifier template
  const template = (await db.select().from(newsletterTemplates).where(eq(newsletterTemplates.id, parsed.data.templateId)).limit(1))[0];
  if (!template) return NextResponse.json({ error: 'Template introuvable.' }, { status: 404 });

  // Compter les destinataires
  const recipients = await db
    .select()
    .from(patientConsents)
    .where(
      and(
        eq(patientConsents.cabinetId, cab.id),
        eq(patientConsents.newsletterOptin, true),
        sql`${patientConsents.confirmedAt} IS NOT NULL`,
        sql`${patientConsents.unsubscribedAt} IS NULL`
      )
    );

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'Aucun patient opt-in actif.' }, { status: 400 });
  }

  // Creer le send
  const sendId = crypto.randomUUID();
  const isScheduled = parsed.data.scheduledAt && new Date(parsed.data.scheduledAt) > new Date();
  const sendStatus = isScheduled ? 'scheduled' : 'sending';

  await db.insert(newsletterSends).values({
    id: sendId,
    cabinetId: cab.id,
    templateId: template.id,
    articleSlug: article.slug,
    subject: parsed.data.subject,
    scheduledAt: isScheduled ? new Date(parsed.data.scheduledAt!) : null,
    sentAt: isScheduled ? null : new Date(),
    status: sendStatus,
    totalRecipients: recipients.length,
    createdBy: prac.id,
    practitionerName: prac.email.split('@')[0],
    cabinetName: cab.name,
    customMessage: parsed.data.customMessage,
  });

  // Creer les recipients en base
  for (const r of recipients) {
    await db.insert(newsletterRecipients).values({
      id: crypto.randomUUID(),
      sendId,
      cabinetId: cab.id,
      patientEmailHash: r.emailHash,
      status: 'pending',
    });
  }

  // Audit
  await db.insert(auditLogs).values({
    actorType: 'practitioner',
    actorId: prac.id,
    cabinetId: cab.id,
    action: isScheduled ? 'newsletter_scheduled' : 'newsletter_scheduled_immediate',
    targetType: 'newsletter_send',
    targetId: sendId,
    userAgent: req.headers.get('user-agent'),
    metadata: {
      articleSlug: article.slug,
      templateCode: template.code,
      recipientCount: recipients.length,
      isScheduled,
    },
  });

  if (isScheduled) {
    // Planifié : le cron s'en chargera
    return NextResponse.json({
      success: true,
      message: `Newsletter planifiée pour le ${new Date(parsed.data.scheduledAt!).toLocaleString('fr-FR')}. ${recipients.length} destinataires.`,
    });
  }

  // Envoi immediat via la fonction partagée
  const result = await executeNewsletterSend(sendId, {
    cabinetId: cab.id,
    practitionerId: prac.id,
    articleSlug: article.slug,
    templateId: template.id,
    subject: parsed.data.subject,
    customMessage: parsed.data.customMessage,
  });

  return NextResponse.json({
    success: result.success,
    message: result.message,
  });
}
