import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { cabinets, patientMagicLinks, patientConsents } from '@/db/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { DonneesPersonnellesClient } from './donnees-client';

interface ConsentState {
  newsletter: boolean;
  analytics: boolean;
  reactions: boolean;
  version: string | null;
  timestamp: string | null;
}

export default async function DonneesPersonnellesPage({
  params,
}: {
  params: { slug: string };
}) {
  const cab = (
    await db.select().from(cabinets).where(eq(cabinets.slug, params.slug)).limit(1)
  )[0];
  if (!cab) notFound();

  // Tenter de lire la session patient
  let consentState: ConsentState | null = null;
  let sessionError: string | null = null;

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('sensident_patient_session')?.value;

  if (sessionToken) {
    try {
      const sessionHash = crypto
        .createHash('sha256')
        .update(sessionToken)
        .digest('hex');

      const session = await (async () => {
        if (DB_DIALECT === 'postgresql') {
          // Fix 2026-07-08 : postgres-js v3+ ne serialise pas les Date en bind.
          const rows = await rawSqlClient<Array<{
            id: string; cabinet_id: string; email_hash: string;
          }>>`
            SELECT id::text AS id, cabinet_id::text AS cabinet_id, email_hash
            FROM patient_magic_links
            WHERE token_hash = ${sessionHash}
              AND expires_at > ${new Date().toISOString()}::timestamptz
              AND used_at IS NULL
              AND cabinet_id::text = ${cab.id}::text
            LIMIT 1
          `;
          return rows[0] ? { id: rows[0].id, cabinetId: rows[0].cabinet_id, emailHash: rows[0].email_hash } : undefined;
        }
        return (await db
          .select()
          .from(patientMagicLinks)
          .where(
            and(
              eq(patientMagicLinks.tokenHash, sessionHash),
              gt(patientMagicLinks.expiresAt, new Date()),
              isNull(patientMagicLinks.usedAt), // ligne de session, pas le magic link original
              eq(patientMagicLinks.cabinetId, cab.id),
            )
          )
          .limit(1))[0];
      })();

      if (session) {
        const consent = (
          await db
            .select({
              consentNewsletter: patientConsents.consentNewsletter,
              consentAnalytics: patientConsents.consentAnalytics,
              consentReactions: patientConsents.consentReactions,
              consentVersion: patientConsents.consentVersion,
              consentTimestamp: patientConsents.consentTimestamp,
            })
            .from(patientConsents)
            .where(
              and(
                eq(patientConsents.cabinetId, cab.id),
                eq(patientConsents.emailHash, session.emailHash),
              )
            )
            .limit(1)
        )[0];

        if (consent) {
          consentState = {
            newsletter: consent.consentNewsletter ?? false,
            analytics: consent.consentAnalytics ?? false,
            reactions: consent.consentReactions ?? false,
            version: consent.consentVersion ?? null,
            timestamp: consent.consentTimestamp
              ? consent.consentTimestamp.toISOString()
              : null,
          };
        }
      } else {
        // Session invalide ou expirée
        sessionError = 'session_expired';
      }
    } catch (err) {
      console.error('[donnees-personnelles] session lookup error', err);
      sessionError = 'session_error';
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <header className="space-y-2">
          <p className="text-xs text-muted-foreground">Espace patient · {cab.name}</p>
          <h1 className="text-2xl font-bold">Mes donnees personnelles</h1>
          <p className="text-sm text-muted-foreground">
            Conformement au RGPD, vous pouvez consulter, modifier, exporter ou effacer vos
            donnees personnelles.
          </p>
        </header>

        <DonneesPersonnellesClient
          cabinet={{
            name: cab.name,
            slug: cab.slug,
          }}
          consentState={consentState}
          sessionError={sessionError}
        />

        {/* Footer minimal */}
        <footer className="pt-4 text-center text-xs text-muted-foreground">
          <p>
            <a href={`/c/${cab.slug}/bienvenue`} className="underline">
              Retour a l&apos;accueil
            </a>
            {' · '}
            <a href="/politique-de-confidentialite" className="underline">
              Politique de confidentialite
            </a>
            {' · '}
            Service offert par {cab.name} · Heberge en France
          </p>
        </footer>
      </div>
    </main>
  );
}
