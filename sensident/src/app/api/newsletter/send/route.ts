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
import { and, asc, eq, sql } from 'drizzle-orm';
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

  // Garde-fou 2026-07-08 : log tout crash serveur pour diagnostiquer
  // les "Erreur réseau" cote client. Renvoie un message explicite.
  try {
    return await _sendInner(session, parsed.data, req);
  } catch (e: any) {
    console.error('[newsletter/send] crash serveur:', e?.message ?? e, e?.stack);
    return NextResponse.json(
      { error: `Erreur serveur : ${e?.message ?? 'inconnue'}.` },
      { status: 500 }
    );
  }
}

async function _sendInner(
  session: { practitionerId: string; cabinetId: string; mfaVerified: boolean },
  parsed: z.infer<typeof SendSchema>,
  req: NextRequest,
) {
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
    article = await loadArticlePg(parsed.articleSlug);
    if (!article || article.status !== 'validated') {
      return NextResponse.json({ error: 'Article introuvable ou non validé.' }, { status: 404 });
    }
    template = await loadTemplatePg(parsed.templateId);
    if (!template) return NextResponse.json({ error: 'Template introuvable.' }, { status: 404 });
    recipients = await loadRecipientsPg(cab.id);
  } else {
    // SQLite (dev) - chemin Drizzle inchange
    cab = (await db.select().from(cabinets).where(eq(cabinets.id, session.cabinetId)).limit(1))[0] ?? null;
    if (!cab) return NextResponse.json({ error: 'Cabinet introuvable.' }, { status: 404 });
    prac = (await db.select().from(practitioners).where(eq(practitioners.id, session.practitionerId)).limit(1))[0] ?? null;
    if (!prac) return NextResponse.json({ error: 'Praticien introuvable.' }, { status: 404 });
    article = (await db.select().from(articles).where(eq(articles.slug, parsed.articleSlug)).limit(1))[0] ?? null;
    if (!article || article.status !== 'validated') {
      return NextResponse.json({ error: 'Article introuvable ou non validé.' }, { status: 404 });
    }
    template = (await db.select().from(newsletterTemplates).where(eq(newsletterTemplates.id, parsed.templateId)).limit(1))[0] ?? null;
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
  const isScheduled = parsed.scheduledAt && new Date(parsed.scheduledAt) > new Date();
  const sendStatus = isScheduled ? 'scheduled' : 'sending';
  const practitionerDisplayName = (prac.name && prac.name.trim()) || prac.email.split('@')[0];

  // --- Decalage automatique des newsletters deja programmees (collision) ---
  // Regle (2026-07-07 Tartrinator) : si on programme un nouvel envoi a T et qu'une
  // autre newsletter du meme cabinet est deja programmee dans l'intervalle [T-5min, T+15min],
  // on la decale a T + 15min (en cascade si d'autres collisions apparaissent apres ce decalage).
  //
  // Le but : eviter que les patients recoivent 2 newsletters a 1 minute d'intervalle.
  // On ne tient PAS compte ici de la cadence configuree par le praticien (elle n'est
  // pertinente que pour le calcul des "prochaines occurrences" cote UI ; cote envoi on
  // respecte toujours le scheduledAt explicite).
  let scheduledAt: Date | null = isScheduled ? new Date(parsed.scheduledAt!) : null;
  if (scheduledAt) {
    scheduledAt = await shiftConflictingSends(cab.id, scheduledAt, sendId);
  }

  if (DB_DIALECT === 'postgresql') {
    await rawSqlClient`
      INSERT INTO newsletter_sends
        (id, cabinet_id, template_id, article_slug, subject, scheduled_at, sent_at, status, total_recipients, created_by, practitioner_name, cabinet_name, custom_message)
      VALUES (
        ${sendId}::text,
        ${cab.id}::text,
        ${template.id}::text,
        ${article.slug},
        ${parsed.subject},
        ${scheduledAt}::timestamptz,
        ${isScheduled ? null : new Date()}::timestamptz,
        ${sendStatus},
        ${recipients.length},
        ${prac.id}::text,
        ${practitionerDisplayName},
        ${cab.name},
        ${parsed.customMessage ?? ''}
      )
    `;
  } else {
    await db.insert(newsletterSends).values({
      id: sendId,
      cabinetId: cab.id,
      templateId: template.id,
      articleSlug: article.slug,
      subject: parsed.subject,
      scheduledAt,
      sentAt: isScheduled ? null : new Date(),
      status: sendStatus,
      totalRecipients: recipients.length,
      createdBy: prac.id,
      practitionerName: practitionerDisplayName,
      cabinetName: cab.name,
      customMessage: parsed.customMessage,
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
      message: `Newsletter planifiée pour le ${scheduledAt!.toLocaleString('fr-FR')}. ${recipients.length} destinataires.`,
    });
  }

  // Envoi immediat via la fonction partagée (refactoree cote Neon egalement)
  const result = await executeNewsletterSend(sendId, {
    cabinetId: cab.id,
    practitionerId: prac.id,
    articleSlug: article.slug,
    templateId: template.id,
    subject: parsed.subject,
    customMessage: parsed.customMessage,
  });

  return NextResponse.json({
    success: result.success,
    message: result.message,
  });
}

/**
 * Decale toute newsletter deja programmee du cabinet qui chevauche la date
 * demandee, pour eviter que les patients recoivent 2 emails en quelques minutes.
 *
 * Strategie :
 *   - On cherche tous les conflictuels (envoyes scheduled du cabinet dans
 *     [requested - 5min, requested + 15min]) tries ASC.
 *   - On les decale un par un, en chaine, de maniere a ce que chaque envoye
 *     garde un ecart minimum de 15min avec le precedent.
 *   - On reitere tant qu'un nouveau conflictuel apparait dans la fenetre
 *     [requested - 5min, requested + 15min] (cascade chain).
 *   - La fenetre de collision reste FIXEE par rapport a `requested` : c'est
 *     la fenetre de collision avec le NOUVEL envoi qu'on insere. Les envois
 *     decales au-dela de `requested + 15min` ne sont plus en conflit.
 *
 * IMPORTANT : on ne touche pas au send qu'on est en train de creer (excludeSendId).
 */
async function shiftConflictingSends(
  cabinetId: string,
  requested: Date,
  excludeSendId: string,
): Promise<Date> {
  const CONFLICT_BEFORE_MS = 5 * 60 * 1000;
  const SHIFT_MS = 15 * 60 * 1000;
  const WINDOW_AFTER_MS = 15 * 60 * 1000;
  const MAX_PASSES = 10;

  // Pour ne pas deranger les envois < requested (qui sont deja passes au cron),
  // on calcule la position finale de notre nouvel envoi une seule fois et on
  // ne touche qu'aux envois >= requested. (En pratique on regarde toute la
  // fenetre, le filtre < ne s'applique qu'en phase finale de tri.)
  const windowLower = new Date(requested.getTime() - CONFLICT_BEFORE_MS);
  const windowUpper = new Date(requested.getTime() + WINDOW_AFTER_MS);

  // Charge une fois la liste initiale des envois du cabinet proches de requested.
  // On elargit le champ de recherche a +12h pour eviter trop d'allers-retours SQL.
  const farFutureCutoff = new Date(requested.getTime() + 12 * 60 * 60 * 1000);

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    // Liste tous les scheduled du cabinet dans une fenetre [windowLower, farFuture]
    // tries ASC. On ne touche pas au send qu'on cree.
    const candidates = await fetchSendsInWindow(cabinetId, windowLower, farFutureCutoff, excludeSendId);

    // Ne garder que ceux qui sont dans la fenetre de collision [windowLower, windowUpper]
    // ET ceux qui sont bloques a l'insertion suivante (espace < SHIFT_MS depuis le predecesseur).
    const toShift: Array<{ id: string; scheduled_at: Date }> = [];
    let prevSlot: Date | null = null;
    for (const c of candidates) {
      const schedAt = new Date(c.scheduled_at);
      if (schedAt.getTime() <= requested.getTime()) {
        // Devant : on s'aligne pour eviter de le coller au derriere (mais on ne le bouge pas).
        prevSlot = schedAt;
        continue;
      }
      // Si dans la fenetre de collision avec requested, OU si trop proche du precedent,
      // on doit le decaler.
      const isInConflictWindow = schedAt.getTime() >= windowLower.getTime() && schedAt.getTime() <= windowUpper.getTime();
      const tooCloseFromPrev = prevSlot !== null && (schedAt.getTime() - prevSlot.getTime()) < SHIFT_MS;
      if (isInConflictWindow || tooCloseFromPrev) {
        toShift.push({ id: c.id, scheduled_at: schedAt });
      }
      prevSlot = schedAt;
    }

    if (toShift.length === 0) break;

    // Decale chaque candidat en respectant l'ecart 15min (en cascade).
    let lastSlot = requested; // le nouveau send qu'on insere (virtual)
    for (const t of toShift) {
      const oldAt = t.scheduled_at;
      // Si t est avant requested, on decale apres lastSlot+15. Sinon on decale apres t+15
      // ou apres lastSlot+15, le max des deux.
      const naiveShift = new Date(oldAt.getTime() + SHIFT_MS);
      const chainShift = new Date(lastSlot.getTime() + SHIFT_MS);
      const newAt = naiveShift.getTime() > chainShift.getTime() ? naiveShift : chainShift;
      if (newAt.getTime() === oldAt.getTime()) {
        // Securite anti-boucle
        lastSlot = oldAt;
        continue;
      }
      await updateScheduledAt(t.id, newAt);
      lastSlot = newAt;
    }
  }
  return requested;
}

async function fetchSendsInWindow(
  cabinetId: string,
  from: Date,
  to: Date,
  excludeSendId: string,
): Promise<Array<{ id: string; scheduled_at: string }>> {
  if (DB_DIALECT === 'postgresql') {
    return await rawSqlClient<Array<{ id: string; scheduled_at: string }>>`
      SELECT id::text AS id, scheduled_at::text AS scheduled_at
      FROM newsletter_sends
      WHERE cabinet_id::text = ${cabinetId}::text
        AND status = 'scheduled'
        AND id::text <> ${excludeSendId}::text
        AND scheduled_at IS NOT NULL
        AND scheduled_at >= ${from.toISOString()}::timestamptz
        AND scheduled_at <= ${to.toISOString()}::timestamptz
      ORDER BY scheduled_at ASC
      LIMIT 200
    `;
  }
  const rows = await db
    .select({
      id: newsletterSends.id,
      scheduledAt: newsletterSends.scheduledAt,
    })
    .from(newsletterSends)
    .where(
      and(
        eq(newsletterSends.cabinetId, cabinetId),
        eq(newsletterSends.status, 'scheduled'),
        sql`${newsletterSends.id} <> ${excludeSendId}`,
        sql`${newsletterSends.scheduledAt} IS NOT NULL`,
        sql`${newsletterSends.scheduledAt} >= ${from}`,
        sql`${newsletterSends.scheduledAt} <= ${to}`,
      ),
    )
    .orderBy(asc(newsletterSends.scheduledAt))
    .limit(200);
  return rows
    .filter((r) => r.scheduledAt)
    .map((r) => ({ id: r.id, scheduled_at: r.scheduledAt!.toISOString() }));
}

async function updateScheduledAt(id: string, newAt: Date): Promise<void> {
  if (DB_DIALECT === 'postgresql') {
    await rawSqlClient`
      UPDATE newsletter_sends
      SET scheduled_at = ${newAt.toISOString()}::timestamptz
      WHERE id::text = ${id}::text
    `;
  } else {
    await db
      .update(newsletterSends)
      .set({ scheduledAt: newAt })
      .where(eq(newsletterSends.id, id));
  }
}