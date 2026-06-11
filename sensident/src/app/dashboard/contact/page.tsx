import { db } from '@/db/client';
import { cabinets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ContactForm } from './contact-form';

export default async function ContactPage() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  const cab = (await db.select().from(cabinets).where(eq(cabinets.id, session.cabinetId)).limit(1))[0];
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
