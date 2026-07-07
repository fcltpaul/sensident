import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { cabinets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ContactForm } from './contact-form';

export const dynamic = 'force-dynamic';

/**
 * Lit le cabinet avec un fallback safe :
 *  - Neon prod : raw SQL avec cast ::text (pattern debt cabinet_id)
 *  - SQLite dev : Drizzle eq direct (colonnes uuid OK en local)
 *
 * Audit 2026-07-07 03h : avant cette session, la page faisait eq(cabinets.id,
 * session.cabinetId) sur Neon. Le format du session.cabinetId (text) matche
 * le format uuid de la PK et le cast est implicite, donc ca passait par
 * chance. On reste explicite pour eviter un futur regression.
 */
async function loadCabinet(cabinetId: string) {
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<Array<{
      id: string;
      name: string;
      slug: string;
      contact_email: string | null;
    }>>`
      SELECT id::text AS id, name, slug, contact_email
      FROM cabinets WHERE id::text = ${cabinetId}::text LIMIT 1
    `;
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      // Colonnes contact_* n'existent pas en Neon prod (cf. fix contact route).
      // On met des valeurs vides plutot que null pour eviter les crashes UI.
      rpps: null,
      contactAddress: null,
      contactPhone: null,
      contactEmail: r.contact_email,
      contactRdvUrl: null,
      contactOpeningHours: null,
      contactFacadePhotoUrl: null,
      contactOncdMention: false,
      contactMapUrl: null,
    };
  }
  const cab = (await db.select().from(cabinets).where(eq(cabinets.id, cabinetId)).limit(1))[0];
  return cab ?? null;
}

export default async function ContactPage() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  const cab = await loadCabinet(session.cabinetId);
  if (!cab) redirect('/login');

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Bloc contact</h1>
        <p className="text-sm text-muted-foreground">
          Visible par vos patients sur leur espace. Renseignez uniquement ce que vous voulez afficher.
          Pas de promotions, pas de mention "nouveau patient", pas d'avis Google.
        </p>
      </div>

      <ContactForm
        cabinet={{
          id: cab.id,
          name: cab.name,
          slug: cab.slug,
          rpps: cab.rpps,
          contactAddress: cab.contactAddress,
          contactPhone: cab.contactPhone,
          contactEmail: cab.contactEmail,
          contactRdvUrl: cab.contactRdvUrl,
          contactOpeningHours: cab.contactOpeningHours,
          contactFacadePhotoUrl: cab.contactFacadePhotoUrl,
          contactOncdMention: cab.contactOncdMention,
          contactMapUrl: cab.contactMapUrl,
        }}
      />
    </div>
  );
}