import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
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
} from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { executeNewsletterSend } from '@/lib/newsletter';
import { enforceNewslettersQuota, enforceTemplateAccess, FeatureDeniedError } from '@/lib/features';

const SendSchema = z.object({
  cabinetId: z.string(),
  practitionerId: z.string(),
  articleSlug: z.string(),
  templateId: z.string(),
  subject: z.string().min(1).max(200),
  customMessage: z.string().max(200).optional().default(''),
  scheduledAt: z.string().nullable().optional(),
});

// Helpers raw SQL Neon (pattern ::text pour la dette cabinet_id uuid/text).
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

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }); }

  const parsed = SendSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });

  // Charger cabinet + praticien + article + template (branche PG ou SQLite).
  let cab: CabinetRow | null;
  let prac: PractitionerRow | null;
  let article: ArticleRow | null;
  let template: TemplateRow | null;
  let recipients: RecipientRow[];

  if (DB_DIALECT === 'postgresql') {
    cab = await loadCabinetPg(session.cabinetId);
    if (!cab) return NextResponse.json({ error: 'Cabinet introuvable.' }, { status: 404 });
    prac = await loadPractitionerPg(session.practitionerId);
    if (!prac) return NextResponse.json({ error: 'Praticien introuvable.' }, { status: 404 });
    article = await loadArticlePg(parsed.data.articleSlug);
    if (!article || article.status !== 'validated') {
      return NextResponse.json({ error: 'Article introuvable ou non validé.' }, { status: 404 });
    }
    template = await loadTemplatePg(parsed.data.templateId);
    if (!template) return NextResponse.json({ error: 'Template introuvable.' }, { status: 404 });
    recipients = await loadRecipientsPg(cab.id);
  } else {
    // SQLite (dev) - chemin Drizzle inchange
    cab = (await db.select().from(cabinets).where(eq(cabinets.id, session.cabinetId)).limit(1))[0] ?? null;
    if (!cab) return NextResponse.json({ error: 'Cabinet introuvable.' }, { status: 404 });
    prac = (await db.select().from(practitioners).where(eq(practitioners.id, session.practitionerId)).limit(1))[0] ?? null;
    if (!prac) return NextResponse.json({ error: 'Praticien introuvable.' }, { status: 404 });
    article = (await db.select().from(articles).where(eq(articles.slug, parsed.data.articleSlug)).limit(1))[0] ?? null;
    if (!article || article.status !== 'validated') {
      return NextResponse.json({ error: 'Article introuvable ou non validé.' }, { status: 404 });
    }
    template = (await db.select().from(newsletterTemplates).where(eq(newsletterTemplates.id, parsed.data.templateId)).limit(1))[0] ?? null;
    if (!template) return NextResponse.json({ error: 'Template introuvable.' }, { status: 404 });
    recipients = (await db.select().from(patientConsents).where(
      and(
        eq(patientConsents.cabinetId, cab.id),
        eq(patientConsents.newsletterOptin, true),
        sql`${patientConsents.confirmedAt} IS NOT NULL`,
        sql`${patientConsents.unsubscribedAt} IS NULL`,
      ),
    )) as any;
  }

  // Gate feature : templates (free n'a acces qu'au template 'moderne')
  try {
    await enforceTemplateAccess(cab.id, template.code);
  } catch (e) {
    if (e instanceof FeatureDeniedError) {
      return NextResponse.json(
        {
          error: `Le template '${template.name}' n'est pas inclus dans votre plan. Passez au plan Pro pour acceder a tous les templates.`,
          code: 'feature_locked',
          feature: e.feature,
          plan: e.currentPlan,
        },
        { status: 403 }
      );
    }
    throw e;
  }

  // Gate feature : quota newsletters ce mois (free:1, pro:4, cabinet:99)
  try {
    await enforceNewslettersQuota(cab.id);
  } catch (e) {
    if (e instanceof FeatureDeniedError) {
      return NextResponse.json(
        {
          error: `Vous avez atteint votre quota mensuel de newsletters. Passez au plan superieur pour envoyer plus.`,
          code: 'quota_exceeded',
          feature: e.feature,
          plan: e.currentPlan,
        },
        { status: 403 }
      );
    }
    throw e;
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'Aucun patient opt-in actif.' }, { status: 400 });
  }

  // Creer le send (branche PG : raw SQL pour eviter crash Drizzle cabinet_id)
  const sendId = crypto.randomUUID();
  const isScheduled = parsed.data.scheduledAt && new Date(parsed.data.scheduledAt) > new Date();
  const sendStatus = isScheduled ? 'scheduled' : 'sending';
  const practitionerDisplayName = (prac.name && prac.name.trim()) || prac.email.split('@')[0];

  if (DB_DIALECT === 'postgresql') {
    await rawSqlClient`
      INSERT INTO newsletter_sends
        (id, cabinet_id, template_id, article_slug, subject, scheduled_at, sent_at, status, total_recipients, created_by, practitioner_name, cabinet_name, custom_message)
      VALUES (
        ${sendId}::text,
        ${cab.id}::text,
        ${template.id}::text,
        ${article.slug},
        ${parsed.data.subject},
        ${isScheduled ? new Date(parsed.data.scheduledAt!) : null},
        ${isScheduled ? null : new Date()},
        ${sendStatus},
        ${recipients.length},
        ${prac.id}::text,
        ${practitionerDisplayName},
        ${cab.name},
        ${parsed.data.customMessage ?? ''}
      )
    `;
  } else {
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
      practitionerName: practitionerDisplayName,
      cabinetName: cab.name,
      customMessage: parsed.data.customMessage,
    });
  }

  // Creer les recipients en base (PG: raw SQL, SQLite: Drizzle)
  if (DB_DIALECT === 'postgresql') {
    for (const r of recipients) {
      await rawSqlClient`
        INSERT INTO newsletter_recipients
          (id, send_id, cabinet_id, patient_email_hash, status)
        VALUES (
          ${crypto.randomUUID()}::text,
          ${sendId}::text,
          ${cab.id}::text,
          ${r.email_hash},
          'pending'
        )
      `;
    }
  } else {
    for (const r of recipients) {
      await db.insert(newsletterRecipients).values({
        id: crypto.randomUUID(),
        sendId,
        cabinetId: cab.id,
        patientEmailHash: r.email_hash,
        status: 'pending',
      });
    }
  }

  // Audit : utilise raw SQL Neon (jsonb + cabinet_id cast).
  try {
    if (DB_DIALECT === 'postgresql') {
      await rawSqlClient`
        INSERT INTO audit_logs (id, ts, actor_type, actor_id, cabinet_id, action, target_type, target_id, user_agent, metadata)
        VALUES (
          ${crypto.randomUUID()}::text,
          NOW(),
          'practitioner',
          ${prac.id}::text,
          ${cab.id}::text,
          ${isScheduled ? 'newsletter_scheduled' : 'newsletter_scheduled_immediate'},
          'newsletter_send',
          ${sendId}::text,
          ${req.headers.get('user-agent') ?? null},
          ${JSON.stringify({
            articleSlug: article.slug,
            templateCode: template.code,
            recipientCount: recipients.length,
            isScheduled,
          })}::jsonb
        )
      `;
    } else {
      const { auditLogs } = await import('@/db/schema');
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
    }
  } catch (e) {
    console.error('[audit] newsletter send insert failed:', e);
    // Best-effort : ne pas bloquer l'envoi
  }

  if (isScheduled) {
    // Planifié : le cron s'en chargera
    return NextResponse.json({
      success: true,
      message: `Newsletter planifiée pour le ${new Date(parsed.data.scheduledAt!).toLocaleString('fr-FR')}. ${recipients.length} destinataires.`,
    });
  }

  // Envoi immediat via la fonction partagée (refactoree cote Neon egalement)
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