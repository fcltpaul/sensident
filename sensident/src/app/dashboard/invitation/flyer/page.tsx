import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { cabinets, practitioners } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Flyer } from './flyer';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

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
    const pRows = await rawSqlClient<Array<{ email: string; display_name: string | null }>>`
      SELECT email, display_name FROM practitioners WHERE id::text = ${practitionerId}::text LIMIT 1
    `;
    const p = pRows[0];
    return {
      name: cab.name,
      slug: cab.slug,
      practitionerName: p?.display_name || p?.email?.split('@')[0] || 'Votre praticien',
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