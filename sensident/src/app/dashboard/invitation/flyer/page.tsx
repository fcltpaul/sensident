import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { cabinets, practitioners } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { FlyerWrapper as Flyer } from './flyer-wrapper';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Le composant Flyer (avec QRCode) ne peut pas etre rendu cote serveur :
// un Server Component ne supporte pas next/dynamic({ ssr: false }) et la
// lib qrcode cause des crashs sporadiques selon le build Next.js.
// On utilise FlyerWrapper, un Client Component qui fait le dynamic+ssr:false.
// Le SSR sert un placeholder, le Flyer reel est monte cote client.

export const dynamic = 'force-dynamic';

interface CabinetInfo {
  name: string;
  slug: string;
  practitionerName: string;
}

async function loadCabinetInfo(cabinetId: string, practitionerId: string): Promise<CabinetInfo | null> {
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<Array<{ name: string; slug: string }>>`
      SELECT name, slug FROM cabinets WHERE id::text = ${cabinetId}::text LIMIT 1
    `;
    const cab = rows[0];
    if (!cab) return null;
    // Fix 2026-07-07 02h : la colonne s'appelle `name` (pas `display_name`)
    // dans le schema practitioners. La requete precedente utilisait un alias
    // inexistant => 500 PG 'column "display_name" does not exist' sur le
    // flyer. On utilise `name` et fallback email.
    const pRows = await rawSqlClient<Array<{ email: string; name: string }>>`
      SELECT email, name FROM practitioners WHERE id::text = ${practitionerId}::text LIMIT 1
    `;
    const p = pRows[0];
    const practitionerName =
      (p?.name && p.name.trim()) ||
      p?.email?.split('@')[0] ||
      'Votre praticien';
    return {
      name: cab.name,
      slug: cab.slug,
      practitionerName,
    };
  }
  const cab = (await db.select().from(cabinets).where(eq(cabinets.id, cabinetId)).limit(1))[0];
  if (!cab) return null;
  const p = (await db.select().from(practitioners).where(eq(practitioners.id, practitionerId)).limit(1))[0];
  return {
    name: cab.name,
    slug: cab.slug,
    practitionerName: p?.email?.split('@')[0] ?? 'Votre praticien',
  };
}

export default async function FlyerPage() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  const info = await loadCabinetInfo(session.cabinetId, session.practitionerId);
  if (!info) redirect('/login');

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://sensidentv0.vercel.app'}/c/${info.slug}/rejoindre`;

  return (
    <div className="min-h-screen bg-muted/30 p-6 md:p-8 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between print:hidden">
        <Link
          href="/dashboard/invitation"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux liens d&apos;invitation
        </Link>
        <PrintButton />
      </div>

      <Flyer
        cabinetName={info.name}
        practitionerName={info.practitionerName}
        cabinetSlug={info.slug}
        publicUrl={publicUrl}
      />
    </div>
  );
}

function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== 'undefined') window.print();
      }}
      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95"
    >
      Imprimer / Enregistrer en PDF
    </button>
  );
}