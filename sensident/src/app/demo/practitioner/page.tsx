import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { cabinets, articles, patientConsents, newsletterSends, newsletterRecipients } from '@/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { PractitionerActions } from './practitioner-actions';

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

  // 4 KPIs du mois
  const patientCount = await db
    .select({ c: sql<number>`count(*)` })
    .from(patientConsents)
    .where(eq(patientConsents.cabinetId, cab.id));

  const newsletterCount = await db
    .select({ c: sql<number>`count(*)` })
    .from(newsletterSends)
    .where(eq(newsletterSends.cabinetId, cab.id));

  const articlesCount = await db
    .select({ c: sql<number>`count(*)` })
    .from(articles)
    .where(eq(articles.status, 'validated'));

  // 3 dernières newsletters avec stats
  const recentSends = await db
    .select({
      id: newsletterSends.id,
      subject: newsletterSends.subject,
      sentAt: newsletterSends.sentAt,
    })
    .from(newsletterSends)
    .where(eq(newsletterSends.cabinetId, cab.id))
    .orderBy(desc(newsletterSends.sentAt))
    .limit(3);

  const recent = await Promise.all(
    recentSends.map(async (s) => {
      const recipients = await db
        .select({ status: newsletterRecipients.status })
        .from(newsletterRecipients)
        .where(eq(newsletterRecipients.sendId, s.id));
      const total = recipients.length;
      const opened = recipients.filter((r) => r.status === 'opened' || r.status === 'clicked').length;
      const clicked = recipients.filter((r) => r.status === 'clicked').length;
      return { ...s, total, opened, clicked };
    })
  );

  return {
    cabinet: { name: cab.name, slug: cab.slug },
    kpis: {
      patients: Number(patientCount[0]?.c ?? 0),
      newsletters: Number(newsletterCount[0]?.c ?? 0),
      articles: Number(articlesCount[0]?.c ?? 0),
      opens: recent.reduce((acc, r) => acc + r.opened, 0),
    },
    recent,
  };
}

export const metadata = {
  title: 'Démo Praticien — Sensident',
  description: 'Espace praticien démo de Sensident',
};

const ENTRY_POINTS = [
  {
    icon: '📊',
    title: 'Vue d\'ensemble',
    desc: '4 KPIs du mois, activité récente, accès rapides aux 6 onglets.',
    href: '/dashboard',
    color: 'border-blue-200 hover:border-blue-400',
  },
  {
    icon: '📚',
    title: 'Bibliothèque cabinet',
    desc: 'Articles validés, 3 épinglés. Personnalisation de la bibliothèque.',
    href: '/dashboard/library',
    color: 'border-emerald-200 hover:border-emerald-400',
  },
  {
    icon: '✉️',
    title: 'Newsletter',
    desc: 'Composer, planifier, historique des envois.',
    href: '/dashboard/newsletter',
    color: 'border-violet-200 hover:border-violet-400',
  },
  {
    icon: '📈',
    title: 'Analytics',
    desc: 'Taux de lecture, articles les plus vus, entonnoir d\'engagement.',
    href: '/dashboard/analytics',
    color: 'border-amber-200 hover:border-amber-400',
  },
  {
    icon: '👥',
    title: 'Engagement',
    desc: 'Rétention M0 / M+1 / M+2, segmentation patients.',
    href: '/dashboard/engagement',
    color: 'border-rose-200 hover:border-rose-400',
  },
  {
    icon: '⚙️',
    title: 'Mon cabinet',
    desc: 'Infos, branding newsletters, abonnement Stripe, MFA.',
    href: '/dashboard/account',
    color: 'border-slate-200 hover:border-slate-400',
  },
];

export default async function PractitionerDemoPage() {
  const data = await getPractitionerDemoData();
  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Démo praticien indisponible</h1>
          <p className="text-muted-foreground">
            Active <code className="bg-muted px-1.5 py-0.5 rounded text-sm">SENSIDENT_DEMO_MODE=1</code> et seed le cabinet démo.
          </p>
          <Link href="/demo" className="inline-block text-sm text-accent hover:underline">
            ← Retour au hub démo
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50/30 to-background">
      {/* HEADER */}
      <section className="border-b border-border bg-card/50">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Link href="/demo" className="hover:text-foreground">← Hub démo</Link>
            <span className="text-muted-foreground/40">|</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-medium">
              🦷 Espace praticien
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {data.cabinet.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vue d'ensemble du cabinet démo — Plan Pro ambassadeur
          </p>
        </div>
      </section>

      {/* KPIs */}
      <section className="mx-auto max-w-6xl px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiBox label="Patients" value={data.kpis.patients} />
          <KpiBox label="Newsletters envoyées" value={data.kpis.newsletters} />
          <KpiBox label="Articles en bibliothèque" value={data.kpis.articles} />
          <KpiBox label="Ouvertures (3 dernières)" value={data.kpis.opens} />
        </div>
      </section>

      {/* ACTIONS PRATICIEN */}
      <section className="mx-auto max-w-6xl px-6 py-4">
        <PractitionerActions />
      </section>

      {/* 6 ONGLETS */}
      <section className="mx-auto max-w-6xl px-6 py-6">
        <h2 className="text-lg font-semibold mb-1">Les 6 onglets du dashboard</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Cliquez sur un onglet pour y entrer directement (1 clic, pas de mot de passe).
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ENTRY_POINTS.map((entry) => (
            <button
              key={entry.href}
              data-demo-target={entry.href}
              className={`group text-left rounded-xl border-2 ${entry.color} bg-card p-5 transition hover:shadow-md`}
            >
              <div className="text-2xl mb-2">{entry.icon}</div>
              <p className="font-semibold text-sm">{entry.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{entry.desc}</p>
              <p className="text-xs font-medium text-accent mt-3 group-hover:translate-x-1 transition">
                Ouvrir →
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* 3 DERNIÈRES NEWSLETTERS */}
      {data.recent.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-6">
          <h2 className="text-lg font-semibold mb-3">3 dernières newsletters envoyées</h2>
          <div className="grid gap-3">
            {data.recent.map((n) => (
              <div key={n.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{n.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Envoyée {n.sentAt ? new Date(n.sentAt).toLocaleDateString('fr-FR') : '?'}
                  </p>
                </div>
                <div className="flex gap-4 text-sm text-right">
                  <div>
                    <p className="font-semibold">{n.opened}/{n.total}</p>
                    <p className="text-xs text-muted-foreground">ouvertes</p>
                  </div>
                  <div>
                    <p className="font-semibold">{n.clicked}/{n.total}</p>
                    <p className="text-xs text-muted-foreground">cliquées</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function KpiBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
