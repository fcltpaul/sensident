/**
 * Sensident — Newsletter : logique partagée entre API route et cron
 */
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
import { and, eq, sql, count } from 'drizzle-orm';
import { renderTemplate } from './email-templates';
import { sendEmail } from './email';

const CABINET_HASH_SALT = process.env.CABINET_HASH_SALT || 'dev-only-salt-replace-in-prod';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export interface SendParams {
  cabinetId: string;
  templateId: string;
  articleSlug: string;
  subject: string;
  customMessage: string;
  scheduledAt?: string | null;
  practitionerId: string;
  isCron?: boolean;
}

/**
 * Execute l'envoi d'une newsletter pour un send donné.
 * Appelé par l'API route (envoi immédiat) ou par le cron (envoi différé).
 */
export async function executeNewsletterSend(sendId: string, params: {
  cabinetId: string;
  practitionerId: string;
  articleSlug: string;
  templateId: string;
  subject: string;
  customMessage: string;
}): Promise<{ success: boolean; message: string }> {
  // Charger les dépendances
  const cab = (await db.select().from(cabinets).where(eq(cabinets.id, params.cabinetId)).limit(1))[0];
  if (!cab) return { success: false, message: 'Cabinet introuvable.' };

  const prac = (await db.select().from(practitioners).where(eq(practitioners.id, params.practitionerId)).limit(1))[0];
  if (!prac) return { success: false, message: 'Praticien introuvable.' };

  const article = (await db.select().from(articles).where(eq(articles.slug, params.articleSlug)).limit(1))[0];
  if (!article || article.status !== 'validated') {
    return { success: false, message: 'Article introuvable ou non valide.' };
  }

  const template = (await db.select().from(newsletterTemplates).where(eq(newsletterTemplates.id, params.templateId)).limit(1))[0];
  if (!template) return { success: false, message: 'Template introuvable.' };

  // Destinataires
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
    return { success: false, message: 'Aucun patient opt-in actif.' };
  }

  // Envoi
  let successCount = 0;
  for (const r of recipients) {
    // Decoder l'email
    const patientEmail = r.emailEncrypted
      ? Buffer.from(r.emailEncrypted, 'base64').toString('utf-8')
      : null;
    if (!patientEmail) continue;

    // Token desabonnement
    const unsubToken = crypto
      .createHmac('sha256', process.env.AUTH_SECRET || 'dev-secret')
      .update(r.emailHash + cab.id)
      .digest('base64url')
      .slice(0, 32);

    // Rendu HTML
    const html = renderTemplate({
      templateCode: template.code,
      article: {
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        bodyMd: article.bodyMd,
        slidesJson: article.slidesJson as any,
      },
      cabinet: { name: cab.name, slug: cab.slug },
      practitioner: { displayName: prac.email.split('@')[0] },
      customMessage: params.customMessage,
      unsubscribeUrl: `${APP_URL}/api/patient/unsubscribe?t=${unsubToken}&c=${cab.id}`,
      articleUrl: `${APP_URL}/articles/${article.slug}?from=newsletter&sid=${sendId}&c=${cab.slug}`,
    });

    // Envoyer
    const result = await sendEmail({
      to: patientEmail,
      subject: params.subject,
      html,
    });

    if (result.success) {
      successCount++;
      await db
        .update(newsletterRecipients)
        .set({ status: 'sent', sentAt: new Date(), brevoMessageId: result.messageId })
        .where(
          and(
            eq(newsletterRecipients.sendId, sendId),
            eq(newsletterRecipients.patientEmailHash, r.emailHash)
          )
        );
    }
  }

  // Finaliser le send
  await db
    .update(newsletterSends)
    .set({ status: 'sent', sentAt: new Date(), totalRecipients: recipients.length })
    .where(eq(newsletterSends.id, sendId));

  // Audit
  await db.insert(auditLogs).values({
    actorType: 'system',
    cabinetId: cab.id,
    action: 'newsletter_sent',
    targetType: 'newsletter_send',
    targetId: sendId,
    metadata: {
      articleSlug: article.slug,
      templateCode: template.code,
      recipientCount: recipients.length,
      successCount,
    },
  });

  return {
    success: true,
    message: `${successCount}/${recipients.length} envois reussis.`,
  };
}
