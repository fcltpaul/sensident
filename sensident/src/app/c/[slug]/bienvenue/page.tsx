import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { cabinets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { PatientDashboard } from './patient-dashboard';

export default async function BienvenuePage({ params }: { params: { slug: string } }) {
  const cab = (await db.select().from(cabinets).where(eq(cabinets.slug, params.slug)).limit(1))[0];
  if (!cab) notFound();

  // Note : on NE liste PAS les articles ici. La page /c/[slug]/bienvenue est la
  // landing post-optin : on propose au patient de magic-link pour acceder a son
  // espace, et de choisir ses preferences. Les articles sont sur /c/[slug]/bibliotheque
  // (route qui exige un cookie session patient).

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <header className="space-y-2">
          <p className="text-xs text-muted-foreground">Service de prevention offert par</p>
          <h1 className="text-2xl font-bold">{cab.name}</h1>
        </header>

        <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900 dark:bg-green-950/30">
          <p className="font-semibold">Inscription confirmee</p>
          <p className="mt-1 text-xs">
            Vous recevrez bientot votre premiere newsletter. Vous pouvez vous desabonner a tout moment depuis n'importe quel email.
          </p>
        </div>

        <PatientDashboard
          cabinet={{
            name: cab.name,
            slug: cab.slug,
            contactEmail: cab.contactEmail,
          }}
        />
      </div>
    </main>
  );
}
