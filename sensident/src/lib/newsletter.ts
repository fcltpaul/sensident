/**
 * Sensident — Newsletter : logique partagée entre API route et cron
 */
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
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

// Types utilitaires pour la branche Neon (pattern ::text)
type CabinetRow = { id: string; name: string; slug: string };
type PractitionerRow = { id: string; email: string; name: string | null };
type ArticleRow = { slug: string; title: string; excerpt: string | null; body_md: string; slides_json: string | null; status: string };
type TemplateRow = { id: string; code: string; name: string };
type RecipientRow = { id: string; email_hash: string; email_encrypted: string | null };

async function loadCabinetPg(cabinetId: string): Promise<CabinetRow | null> {
  const rows = await rawSqlClient<CabinetRow[]>`
    SELECT id::text AS id, name, slug FROM cabinets
    WHERE id::text = ${cabinetId}::text LIMIT 1
  `;
  return rows[0] ?? null;
}
async function loadPractitionerPg(practitionerId: string): Promise<PractitionerRow | null> {
  const rows = await rawSqlClient<PractitionerRow[]>`
    SELECT id::text AS id, email, name FROM practitioners
    WHERE id::text = ${practitionerId}::text LIMIT 1
  `;
  return rows[0] ?? null;
}
async function loadArticlePg(articleSlug: string): Promise<ArticleRow | null> {
  const rows = await rawSqlClient<ArticleRow[]>`
    SELECT slug, title, excerpt, body_md, slides_json, status
    FROM articles WHERE slug = ${articleSlug} LIMIT 1
  `;
  return rows[0] ?? null;
}
async function loadTemplatePg(templateId: string): Promise<TemplateRow | null> {
  const rows = await rawSqlClient<TemplateRow[]>`
    SELECT id::text AS id, code, name FROM newsletter_templates
    WHERE id::text = ${templateId}::text LIMIT 1
  `;
  return rows[0] ?? null;
}
async function loadRecipientsPg(cabinetId: string): Promise<RecipientRow[]> {
  return await rawSqlClient<RecipientRow[]>`
    SELECT id::text AS id, email_hash, email_encrypted FROM patient_consents
    WHERE cabinet_id::text = ${cabinetId}::text
      AND newsletter_optin = true
      AND confirmed_at IS NOT NULL
      AND unsubscribed_at IS NULL
  `;
}

/**
 * Execute l'envoi d'une newsletter pour un send donné.
 * Appelé par l'API route (envoi immédiat) ou par le cron (envoi différé).
 *
 * Audit 2026-07-07 03h (fix P0) :
 *  - Refacto complet de la branche PG en raw SQL Neon (helpers loadXxxPg).
 *    Avant : la branche Drizzle faisait eq(cabinets.id) + eq(patientConsents.cabinetId)
 *    sur PK uuid/text Neon => crash 500 silencieux.
 *  - Les recipients finalisent aussi en raw SQL Neon (UPDATE set status='sent').
 *  - Audit finalise en raw SQL Neon (jsonb + cast ::text).
 *  - Branche SQLite dev inchangee (Drizzle marche en local).
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
  let cab: CabinetRow | null;
  let prac: PractitionerRow | null;
  let article: ArticleRow | null;
  let template: TemplateRow | null;
  let recipients: RecipientRow[];

  if (DB_DIALECT === 'postgresql') {
    cab = await loadCabinetPg(params.cabinetId);
    if (!cab) return { success: false, message: 'Cabinet introuvable.' };
    prac = await loadPractitionerPg(params.practitionerId);
    if (!prac) return { success: false, message: 'Praticien introuvable.' };
    article = await loadArticlePg(params.articleSlug);
    if (!article || article.status !== 'validated') {
      return { success: false, message: 'Article introuvable ou non valide.' };
    }
    template = await loadTemplatePg(params.templateId);
    if (!template) return { success: false, message: 'Template introuvable.' };
    recipients = await loadRecipientsPg(cab.id);
  } else {
    // SQLite (dev)
    cab = (await db.select().from(cabinets).where(eq(cabinets.id, params.cabinetId)).limit(1))[0] ?? null;
    if (!cab) return { success: false, message: 'Cabinet introuvable.' };
    prac = (await db.select().from(practitioners).where(eq(practitioners.id, params.practitionerId)).limit(1))[0] ?? null;
    if (!prac) return { success: false, message: 'Praticien introuvable.' };
    article = (await db.select().from(articles).where(eq(articles.slug, params.articleSlug)).limit(1))[0] ?? null;
    if (!article || article.status !== 'validated') {
      return { success: false, message: 'Article introuvable ou non valide.' };
    }
    template = (await db.select().from(newsletterTemplates).where(eq(newsletterTemplates.id, params.templateId)).limit(1))[0] ?? null;
    if (!template) return { success: false, message: 'Template introuvable.' };
    recipients = (await db.select().from(patientConsents).where(
      and(
        eq(patientConsents.cabinetId, cab.id),
        eq(patientConsents.newsletterOptin, true),
        sql`${patientConsents.confirmedAt} IS NOT NULL`,
        sql`${patientConsents.unsubscribedAt} IS NULL`,
      ),
    )) as any;
  }

  if (recipients.length === 0) {
    return { success: false, message: 'Aucun patient opt-in actif.' };
  }

  // Envoi
  let successCount = 0;
  for (const r of recipients) {
    // Decoder l'email (emailEncrypted = base64 d'un email en clair)
    const patientEmail = r.email_encrypted
      ? Buffer.from(r.email_encrypted, 'base64').toString('utf-8').trim()
      : null;
    if (!patientEmail || !patientEmail.includes('@')) continue;

    // Token desabonnement
    const unsubToken = crypto
      .createHmac('sha256', process.env.AUTH_SECRET || 'dev-secret')
      .update(r.email_hash + cab.id)
      .digest('base64url')
      .slice(0, 32);

    // Token tracking pixel d'ouverture (format payload.sig)
    const trackingPayload = Buffer.from(
      JSON.stringify({ h: r.email_hash, c: cab.id, s: sendId })
    ).toString('base64url');
    const trackingSig = crypto
      .createHmac('sha256', process.env.AUTH_SECRET || 'dev-secret')
      .update(trackingPayload)
      .digest('base64url');
    const trackingToken = `${trackingPayload}.${trackingSig}`;
    const trackingPixelUrl = `${APP_URL}/api/track/email-open?t=${trackingToken}`;

    // Rendu HTML
    const html = renderTemplate({
      templateCode: template.code,
      article: {
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt ?? '',
        bodyMd: article.body_md,
        slidesJson: article.slides_json ? JSON.parse(article.slides_json) : null,
      },
      cabinet: { name: cab.name, slug: cab.slug },
      practitioner: { displayName: (prac.name && prac.name.trim()) || prac.email.split('@')[0] },
      customMessage: params.customMessage,
      unsubscribeUrl: `${APP_URL}/api/patient/unsubscribe?t=${unsubToken}&c=${cab.id}`,
      articleUrl: `${APP_URL}/articles/${article.slug}?from=newsletter&sid=${sendId}&c=${cab.slug}`,
      libraryUrl: `${APP_URL}/c/${cab.slug}/bibliotheque`,
      trackingPixelUrl,
    });

    // Envoyer
    const result = await sendEmail({
      to: patientEmail,
      subject: params.subject,
      html,
    });

    if (result.success) {
      successCount++;
      // Mettre a jour le recipient (PG: raw SQL, SQLite: Drizzle)
      // Note : brevo_message_id n'existe PAS dans la table newsletter_recipients
      // en Neon prod (cf. scripts/_test-neon-all-schemas.mjs). On omet le champ en PG.
      // Le messageId du provider est deja logge dans email_logs.
      if (DB_DIALECT === 'postgresql') {
        await rawSqlClient`
          UPDATE newsletter_recipients
          SET status = 'sent', sent_at = NOW()
          WHERE send_id::text = ${sendId}::text
            AND patient_email_hash = ${r.email_hash}
        `;
      } else {
        await db
          .update(newsletterRecipients)
          .set({ status: 'sent', sentAt: new Date(), brevoMessageId: result.messageId })
          .where(
            and(
              eq(newsletterRecipients.sendId, sendId),
              eq(newsletterRecipients.patientEmailHash, r.email_hash)
            )
          );
      }
    }
  }

  // Finaliser le send (PG: raw SQL, SQLite: Drizzle)
  if (DB_DIALECT === 'postgresql') {
    await rawSqlClient`
      UPDATE newsletter_sends
      SET status = 'sent', sent_at = NOW(), total_recipients = ${recipients.length}
      WHERE id::text = ${sendId}::text
    `;
  } else {
    await db
      .update(newsletterSends)
      .set({ status: 'sent', sentAt: new Date(), totalRecipients: recipients.length })
      .where(eq(newsletterSends.id, sendId));
  }

  // Audit : raw SQL Neon (jsonb + cast ::text)
  try {
    if (DB_DIALECT === 'postgresql') {
      await rawSqlClient`
        INSERT INTO audit_logs (id, ts, actor_type, cabinet_id, action, target_type, target_id, metadata)
        VALUES (
          ${crypto.randomUUID()}::text,
          NOW(),
          'system',
          ${cab.id}::text,
          'newsletter_sent',
          'newsletter_send',
          ${sendId}::text,
          ${JSON.stringify({
            articleSlug: article.slug,
            templateCode: template.code,
            recipientCount: recipients.length,
            successCount,
          })}::jsonb
        )
      `;
    } else {
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
    }
  } catch (e) {
    console.error('[audit] newsletter_sent insert failed:', e);
  }

  return {
    success: true,
    message: `${successCount}/${recipients.length} envois reussis.`,
  };
}