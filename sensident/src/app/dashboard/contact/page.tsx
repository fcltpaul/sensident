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
    // Neon prod : 2026-07-07 migration ALTER TABLE a ajoute rpps,
    // contact_address, contact_phone, contact_rdv_url, contact_opening_hours,
    // contact_facade_photo_url, contact_oncd_mention, contact_map_url,
    // updated_at. Avant cette migration, on ne lisait que name +
    // contact_email et on mettait tout le reste a null.
    const rows = await rawSqlClient<Array<{
      id: string;
      name: string;
      slug: string;
      contact_email: string | null;
      rpps: string | null;
      contact_address: string | null;
      contact_phone: string | null;
      contact_rdv_url: string | null;
      contact_opening_hours: unknown;
      contact_facade_photo_url: string | null;
      contact_oncd_mention: boolean;
      contact_map_url: string | null;
    }>>`
      SELECT
        id::text AS id,
        name,
        slug,
        contact_email,
        rpps,
        contact_address,
        contact_phone,
        contact_rdv_url,
        contact_opening_hours,
        contact_facade_photo_url,
        contact_oncd_mention,
        contact_map_url
      FROM cabinets WHERE id::text = ${cabinetId}::text LIMIT 1
    `;
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      rpps: r.rpps,
      contactAddress: r.contact_address,
      contactPhone: r.contact_phone,
      contactEmail: r.contact_email,
      contactRdvUrl: r.contact_rdv_url,
      contactOpeningHours: (r.contact_opening_hours as Record<string, string> | null) ?? null,
      contactFacadePhotoUrl: r.contact_facade_photo_url,
      contactOncdMention: r.contact_oncd_mention,
      contactMapUrl: r.contact_map_url,
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