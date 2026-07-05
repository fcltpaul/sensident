import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import {
  articles,
  newsletterTemplates,
  newsletterSends,
  cabinets,
  practitioners,
  auditLogs,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';

/**
 * POST /api/newsletter/draft
 * Sauvegarde (crée ou met à jour) un brouillon de newsletter pour le praticien courant.
 * Appelé automatiquement par le composer à chaque étape visitée.
 *
 * Le brouillon persiste en DB (newsletter_sends status='draft') même si l'utilisateur
 * ferme l'onglet / se déconnecte. Il peut reprendre depuis /dashboard/newsletter/drafts.
 *
 * Idempotent par (cabinet_id, draft_id) : on merge par draftId si fourni.
 */

const DraftSchema = z.object({
  draftId: z.string().nullable().optional(),
  articleSlug: z.string().nullable().optional(),
  templateId: z.string().nullable().optional(),
  subject: z.string().max(200).optional().default(''),
  customMessage: z.string().max(2000).optional().default(''),
});

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }); }

  const parsed = DraftSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Donnees invalides.' }, { status: 400 });

  const data = parsed.data;
  const draftId = data.draftId || crypto.randomUUID();

  if (DB_DIALECT === 'postgresql') {
    // PG : cast ::text pour cause uuid/text drift schema
    let articleExists: { ok: boolean } | null = null;
    if (data.articleSlug) {
      try {
        await rawSqlClient`SELECT 1 FROM articles WHERE slug = ${data.articleSlug}::text LIMIT 1`;
        articleExists = { ok: true };
      } catch { articleExists = { ok: false }; }
    }
    if (articleExists === null) {
      // pas d'article, on accepte quand meme (brouillon en cours)
    }

    // Si draftId fourni et qu'il existe deja, UPDATE ; sinon INSERT.
    const existing = await rawSqlClient<Array<{ id: string }>>`
      SELECT id::text AS id FROM newsletter_sends
      WHERE id::text = ${draftId}::text AND cabinet_id::text = ${session.cabinetId}::text AND status = 'draft'
      LIMIT 1
    `;
    const subject = data.subject || (data.articleSlug ? 'Prevention dentaire' : '');
    const totalRecipients = 0;

    if (existing.length > 0) {
      await rawSqlClient`
        UPDATE newsletter_sends
        SET article_slug = ${data.articleSlug ?? null}::text,
            template_id = ${data.templateId ?? null}::text,
            subject = ${subject},
            custom_message = ${data.customMessage ?? ''}
        WHERE id::text = ${draftId}::text
      `;
    } else {
      await rawSqlClient`
        INSERT INTO newsletter_sends (id, cabinet_id, template_id, article_slug, subject, status, total_recipients, custom_message, created_by)
        VALUES (
          ${draftId}::text,
          ${session.cabinetId}::text,
          ${data.templateId ?? null}::text,
          ${data.articleSlug ?? null}::text,
          ${subject},
          'draft',
          ${totalRecipients},
          ${data.customMessage ?? ''},
          ${session.practitionerId}::text
        )
      `;
    }

    return NextResponse.json({ draftId, savedAt: new Date().toISOString() });
  }

  // SQLite (dev) — chemin Drizzle inchange
  const existing = await db
    .select({ id: newsletterSends.id })
    .from(newsletterSends)
    .where(
      and(
        eq(newsletterSends.id, draftId),
        eq(newsletterSends.cabinetId, session.cabinetId),
        eq(newsletterSends.status, 'draft')
      )
    )
    .limit(1);

  const subject = data.subject || (data.articleSlug ? 'Prevention dentaire' : '');

  if (existing.length > 0) {
    await db
      .update(newsletterSends)
      .set({
        articleSlug: data.articleSlug ?? null,
        templateId: data.templateId ?? null,
        subject,
        customMessage: data.customMessage ?? '',
      })
      .where(eq(newsletterSends.id, draftId));
  } else {
    await db.insert(newsletterSends).values({
      id: draftId,
      cabinetId: session.cabinetId,
      templateId: data.templateId ?? null,
      articleSlug: data.articleSlug ?? null,
      subject,
      status: 'draft',
      totalRecipients: 0,
      customMessage: data.customMessage ?? '',
      createdBy: session.practitionerId,
    });
  }

  return NextResponse.json({ draftId, savedAt: new Date().toISOString() });
}

/**
 * GET /api/newsletter/draft?draftId=...
 * Recupere un brouillon precis.
 */
export async function GET(req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }

  const url = new URL(req.url);
  const draftId = url.searchParams.get('draftId');
  if (!draftId) return NextResponse.json({ error: 'draftId manquant.' }, { status: 400 });

  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<Array<{
      id: string;
      article_slug: string | null;
      template_id: string | null;
      subject: string;
      custom_message: string | null;
    }>>`
      SELECT id::text AS id, article_slug, template_id, subject, custom_message
      FROM newsletter_sends
      WHERE id::text = ${draftId}::text
        AND cabinet_id::text = ${session.cabinetId}::text
        AND status = 'draft'
      LIMIT 1
    `;
    if (rows.length === 0) return NextResponse.json({ error: 'Brouillon introuvable.' }, { status: 404 });
    const r = rows[0];
    return NextResponse.json({
      draftId: r.id,
      articleSlug: r.article_slug,
      templateId: r.template_id,
      subject: r.subject,
      customMessage: r.custom_message ?? '',
    });
  }

  // SQLite
  const rows = await db
    .select({
      id: newsletterSends.id,
      articleSlug: newsletterSends.articleSlug,
      templateId: newsletterSends.templateId,
      subject: newsletterSends.subject,
      customMessage: newsletterSends.customMessage,
    })
    .from(newsletterSends)
    .where(
      and(
        eq(newsletterSends.id, draftId),
        eq(newsletterSends.cabinetId, session.cabinetId),
        eq(newsletterSends.status, 'draft')
      )
    )
    .limit(1);

  if (rows.length === 0) return NextResponse.json({ error: 'Brouillon introuvable.' }, { status: 404 });
  return NextResponse.json({
    draftId: rows[0].id,
    articleSlug: rows[0].articleSlug,
    templateId: rows[0].templateId,
    subject: rows[0].subject,
    customMessage: rows[0].customMessage ?? '',
  });
}