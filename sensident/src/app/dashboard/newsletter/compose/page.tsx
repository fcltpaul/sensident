import { redirect } from 'next/navigation';
import { eq, desc, inArray } from 'drizzle-orm';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import {
  articles,
  articleCategories,
  categories,
  patientConsents,
  cabinets,
  practitioners,
  newsletterTemplates,
} from '@/db/schema';
import { getSessionFromCookie } from '@/lib/auth';
import { NewsletterComposer } from '../composer';
import { SingleRecipientComposer } from './single-recipient-composer';

/**
 * /dashboard/newsletter/compose
 *
 * Dispatcher entre 2 modes selon les query params :
 * - ?patientHash=X   -> mode "envoi cible a un patient" (SingleRecipientComposer).
 *   Use case : depuis /dashboard/engagement, le praticien clique "Newsletter"
 *   sur un patient donne. Le patient recoit un magic link d'opt-in direct.
 * - sinon (?article=X ou rien) -> mode "composer standard" (NewsletterComposer).
 *   Use case : depuis la bibliotheque, clic "Composer" sur un article. Le
 *   wizard 4 etapes envoie a tous les patients opt-in.
 *
 * Pourquoi 2 modes dans la meme route : unifier le point d'entree "composer"
 * (meme URL, comportements distincts) et eviter la proliferation de routes.
 *
 * 2026-07-07 12h54 (Tartrinator) : ajout du mode standard suite a la
 * separation Historique / Composer (la page /dashboard/newsletter ne
 * contient plus le composer integre).
 */
export const dynamic = 'force-dynamic';

interface PatientRow {
  email_hash: string;
  email_encrypted: string | null;
  confirmed_at: Date | string | null;
}

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ patientHash?: string; article?: string; draftId?: string }>;
}) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  const params = await searchParams;
  const patientHash = params.patientHash?.trim() ?? null;

  // === Mode single-recipient (engagement) ===
  if (patientHash) {
    let patientEmail: string | null = null;
    let patientFound = false;
    if (DB_DIALECT === 'postgresql') {
      const rows = await rawSqlClient<PatientRow[]>`
        SELECT email_hash, email_encrypted, confirmed_at
        FROM patient_consents
        WHERE cabinet_id::text = ${session.cabinetId}::text
          AND email_hash = ${patientHash}
        LIMIT 1
      `;
      const row = rows[0] ?? null;
      if (row) {
        patientFound = true;
        if (row.email_encrypted) {
          try {
            patientEmail = Buffer.from(row.email_encrypted, 'base64').toString('utf-8').trim();
          } catch {
            patientEmail = null;
          }
        }
      }
    } else {
      const r = await db
        .select({
          emailHash: patientConsents.emailHash,
          emailEncrypted: patientConsents.emailEncrypted,
          confirmedAt: patientConsents.confirmedAt,
        })
        .from(patientConsents)
        .where(eq(patientConsents.emailHash, patientHash))
        .limit(1);
      const row = r[0];
      if (row) {
        patientFound = true;
        if (row.emailEncrypted) {
          try {
            patientEmail = Buffer.from(row.emailEncrypted, 'base64').toString('utf-8').trim();
          } catch {
            patientEmail = null;
          }
        }
      }
    }

    const validArticles = await db
      .select()
      .from(articles)
      .where(eq(articles.status, 'validated'))
      .orderBy(desc(articles.validatedAt));

    let cabinetName = '';
    if (DB_DIALECT === 'postgresql') {
      const rows = await rawSqlClient<Array<{ name: string }>>`
        SELECT name FROM cabinets WHERE id::text = ${session.cabinetId}::text LIMIT 1
      `;
      cabinetName = rows[0]?.name ?? '';
    } else {
      const cab = (await db.select().from(cabinets).where(eq(cabinets.id, session.cabinetId)).limit(1))[0];
      cabinetName = cab?.name ?? '';
    }

    return (
      <div className="space-y-6 p-6 md:p-8">
        <div>
          <h1 className="text-2xl font-bold">Envoi ciblé</h1>
          <p className="text-sm text-muted-foreground">
            Envoyez un article ou une recommandation à un patient en particulier.
            Le patient reçoit un lien d&apos;opt-in par email.
          </p>
        </div>

        <SingleRecipientComposer
          cabinetId={session.cabinetId}
          practitionerId={session.practitionerId}
          cabinetName={cabinetName}
          patientHash={patientHash}
          patientEmail={patientEmail}
          patientFound={patientFound}
          preselectedArticleSlug={params.article ?? null}
          articles={validArticles.map((a) => ({
            slug: a.slug,
            title: a.title,
            excerpt: a.excerpt,
          }))}
        />
      </div>
    );
  }

  // === Mode standard (bibliothèque / drafts) ===
  // Charge toutes les données nécessaires au wizard 4 étapes.
  const validArticles = await db
    .select()
    .from(articles)
    .where(eq(articles.status, 'validated'))
    .orderBy(desc(articles.validatedAt));

  const acs = validArticles.length > 0
    ? await db
        .select()
        .from(articleCategories)
        .where(inArray(articleCategories.articleSlug, validArticles.map((a) => a.slug)))
    : [];
  const articleToCategories = new Map<string, string[]>();
  for (const ac of acs) {
    const arr = articleToCategories.get(ac.articleSlug) ?? [];
    arr.push(ac.categoryId);
    articleToCategories.set(ac.articleSlug, arr);
  }

  const allCats = await db.select().from(categories);

  // 2026-07-07 14h : les templates sont GLOBAUX (table sans cabinet_id),
  // tous les praticiens voient la meme liste. Pas de filtrage par cabinet.
  const templates = await db
    .select()
    .from(newsletterTemplates)
    .where(eq(newsletterTemplates.isActive, true));

  // Cabinet + praticien
  let cabinetName = '';
  let practitionerName = '';
  if (DB_DIALECT === 'postgresql') {
    const cab = await rawSqlClient<Array<{ name: string }>>`
      SELECT name FROM cabinets WHERE id::text = ${session.cabinetId}::text LIMIT 1
    `;
    cabinetName = cab[0]?.name ?? '';
    const prac = await rawSqlClient<Array<{ email: string }>>`
      SELECT email FROM practitioners WHERE id::text = ${session.practitionerId}::text LIMIT 1
    `;
    practitionerName = prac[0]?.email?.split('@')[0] ?? '';
  } else {
    const cab = (await db.select().from(cabinets).where(eq(cabinets.id, session.cabinetId)).limit(1))[0];
    const prac = (await db.select().from(practitioners).where(eq(practitioners.id, session.practitionerId)).limit(1))[0];
    cabinetName = cab?.name ?? '';
    practitionerName = prac?.email?.split('@')[0] ?? '';
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Composer une newsletter</h1>
        <p className="text-sm text-muted-foreground">
          4 étapes : article → template → aperçu → envoi. Le brouillon est
          sauvegardé automatiquement.
        </p>
      </div>

      <NewsletterComposer
        cabinetId={session.cabinetId}
        practitionerId={session.practitionerId}
        preselectedArticleSlug={params.article ?? null}
        cabinetName={cabinetName}
        practitionerName={practitionerName}
        articles={validArticles.map((a) => ({
          slug: a.slug,
          title: a.title,
          excerpt: a.excerpt,
          category: a.category,
          categoryIds: articleToCategories.get(a.slug) ?? [],
        }))}
        categories={allCats.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          parentId: c.parentId,
          color: c.color,
        }))}
        templates={templates.map((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          description: t.description ?? '',
        }))}
      />
    </div>
  );
}