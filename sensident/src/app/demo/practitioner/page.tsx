import Link from 'next/link';
import { db } from '@/db/client';
import { cabinets, articles, patientConsents, newsletterSends, newsletterRecipients } from '@/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { EnterDemoButton } from './enter-demo-button';

export const dynamic = 'force-dynamic';

const DEMO_CABINET_SLUG = 'demo-francois-thibault';

async function getPractitionerDemoData() {
  if (process.env.SENSIDENT_DEMO_MODE !== '1') return null;

  const [cab] = await db
    .select()
    .from(cabinets)
    .where(eq(cabinets.slug, DEMO_CABINET_SLUG))
    .limit(1);
  if (!cab) return null;

  const [patients] = await db
    .select({ c: sql<number>`count(*)` })
    .from(patientConsents)
    .where(eq(patientConsents.cabinetId, cab.id));

  const [newsletters] = await db
    .select({ c: sql<number>`count(*)` })
    .from(newsletterSends)
    .where(eq(newsletterSends.cabinetId, cab.id));

  const [articlesCount] = await db
    .select({ c: sql<number>`count(*)` })
    .from(articles)
    .where(eq(articles.status, 'validated'));

  return {
    cabinet: { name: cab.name, slug: cab.slug },
    kpis: {
      patients: Number(patients?.c ?? 0),
      newsletters: Number(newsletters?.c ?? 0),
      articles: Number(articlesCount?.c ?? 0),
    },
  };
}

export const metadata = {
  title: 'Démo praticien — Sensident',
  description: 'Démo interactive espace praticien Sensident',
};

export default async function PractitionerDemoPage() {
  const data = await getPractitionerDemoData();

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-bold">Démo non activée</h1>
          <p className="text-sm text-muted-foreground">
            Active <code className="bg-muted px-1.5 py-0.5 rounded">SENSIDENT_DEMO_MODE=1</code> et seed le cabinet.
          </p>
          <Link href="/demo" className="inline-block text-sm text-accent hover:underline">
            ← Hub démo
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50/30 to-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-2xl px-6 py-4 flex items-center justify-between">
          <Link href="/demo" className="text-sm text-muted-foreground hover:text-foreground">
            ← Hub démo
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-medium">
            🦷 Praticien
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-6 py-10 md:py-14">
        <p className="text-xs text-muted-foreground text-center mb-1">Cabinet démo</p>
        <h1 className="text-2xl md:text-3xl font-bold text-center">{data.cabinet.name}</h1>

        {/* KPIs compacts */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold">{data.kpis.patients}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Patients</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold">{data.kpis.newsletters}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Newsletters</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold">{data.kpis.articles}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Articles</p>
          </div>
        </div>

        {/* Bouton unique d'entrée */}
        <div className="mt-8 rounded-2xl border-2 border-blue-200 bg-blue-50/40 p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Un clic. Pas de mot de passe. Vous entrez dans le cabinet démo.
          </p>
          <EnterDemoButton />
          <p className="mt-3 text-xs text-muted-foreground">
            Vous restez connecté·e tant que vous ne fermez pas l&apos;onglet.
          </p>
        </div>

        {/* Liens directs, pour debug / raccourci */}
        <details className="mt-6 rounded-lg border border-border bg-card">
          <summary className="px-4 py-3 text-sm font-medium cursor-pointer hover:bg-muted/30">
            Liens directs vers les pages du cabinet
          </summary>
          <div className="px-4 pb-4 space-y-1.5 text-sm">
            <p className="text-xs text-muted-foreground pt-2">
              Utile si vous voulez aller directement à un onglet sans passer par l&apos;entrée démo. Vous serez redirigé vers /login si la session n&apos;est pas active.
            </p>
            <ul className="space-y-1">
              <li><Link className="text-accent hover:underline" href="/dashboard">/dashboard — Vue d&apos;ensemble</Link></li>
              <li><Link className="text-accent hover:underline" href="/dashboard/library">/dashboard/library — Bibliothèque cabinet</Link></li>
              <li><Link className="text-accent hover:underline" href="/dashboard/newsletter">/dashboard/newsletter — Composer newsletter</Link></li>
              <li><Link className="text-accent hover:underline" href="/dashboard/analytics">/dashboard/analytics — Analytics</Link></li>
              <li><Link className="text-accent hover:underline" href="/dashboard/engagement">/dashboard/engagement — Engagement</Link></li>
              <li><Link className="text-accent hover:underline" href="/dashboard/account">/dashboard/account — Mon cabinet</Link></li>
              <li><Link className="text-accent hover:underline" href="/dashboard/invitation">/dashboard/invitation — QR code d&apos;invitation</Link></li>
            </ul>
          </div>
        </details>

        <div className="mt-6 text-center text-sm">
          <Link href="/demo/patient" className="text-muted-foreground hover:text-foreground">
            → Voir la démo côté patient
          </Link>
        </div>
      </section>
    </main>
  );
}
