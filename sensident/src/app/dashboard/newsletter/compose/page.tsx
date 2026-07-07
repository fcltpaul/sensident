import { redirect } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { articles, patientConsents, cabinets } from '@/db/schema';
import { getSessionFromCookie } from '@/lib/auth';
import { SingleRecipientComposer } from './single-recipient-composer';

/**
 * /dashboard/newsletter/compose
 *
 * Variante light du composer newsletter : envoi d'un SEUL article
 * pre-selectionne a un SEUL patient (via ?patientHash=...).
 *
 * Use case : depuis /dashboard/engagement, le praticien clique "Newsletter"
 * sur un patient donne. On arrive ici avec ?patientHash=X. Le praticien
 * choisit l'article a envoyer, previsualise, et envoie un magic link
 * d'opt-in direct (le patient doit confirmer avant de lire l'article).
 *
 * Pourquoi cette route plutot qu'un mode dans /dashboard/newsletter :
 *  - Le composer standard envoie a TOUS les patients opt-in. Pas d'option
 *    "destinataire unique" dans le wizard (risque de regression).
 *  - Cette route est dediee a l'usage "engagement" et fait un envoi
 *    cible via sendConfirmationEmail (deja teste en Neon).
 *
 * Audit 2026-07-07 09h (P3) : creation de la route pour resoudre le 404
 * sur les liens depuis /dashboard/engagement.
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
  searchParams: Promise<{ patientHash?: string; article?: string }>;
}) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  const params = await searchParams;
  const patientHash = params.patientHash?.trim() ?? null;

  // 1. Charger le patient si hash fourni (sinon on laisse l'utilisateur le chercher)
  let patientEmail: string | null = null;
  let patientFound = false;
  if (patientHash) {
    let row: PatientRow | null = null;
    if (DB_DIALECT === 'postgresql') {
      const rows = await rawSqlClient<PatientRow[]>`
        SELECT email_hash, email_encrypted, confirmed_at
        FROM patient_consents
        WHERE cabinet_id::text = ${session.cabinetId}::text
          AND email_hash = ${patientHash}
        LIMIT 1
      `;
      row = rows[0] ?? null;
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
      row = r[0]
        ? {
            email_hash: r[0].emailHash,
            email_encrypted: r[0].emailEncrypted,
            confirmed_at: r[0].confirmedAt,
          }
        : null;
    }
    if (row) {
      patientFound = true;
      // Decode base64 email (PGP chiffré en prod)
      if (row.email_encrypted) {
        try {
          patientEmail = Buffer.from(row.email_encrypted, 'base64').toString('utf-8').trim();
        } catch {
          patientEmail = null;
        }
      }
    }
  }

  // 2. Charger les articles du catalogue
  const validArticles = await db
    .select()
    .from(articles)
    .where(eq(articles.status, 'validated'))
    .orderBy(desc(articles.validatedAt));

  // 3. Charger le cabinet
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