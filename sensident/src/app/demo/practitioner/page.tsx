import Link from 'next/link';
import { db } from '@/db/client';
import { cabinets, articles, patientConsents, newsletterSends, newsletterRecipients } from '@/db/schema';
import { eq, and, sql, isNull, inArray, asc } from 'drizzle-orm';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  BookOpen,
  Link2,
  Settings,
  ArrowRight,
  CalendarClock,
} from 'lucide-react';
import {
  UpcomingNewslettersTable,
  type UpcomingNewsletterRow,
} from '@/components/upcoming-newsletters-table';

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

  // Next newsletters = scheduled OR sending, not yet sent
  const upcomingSends = await db
    .select({
      id: newsletterSends.id,
      subject: newsletterSends.subject,
      articleSlug: newsletterSends.articleSlug,
      scheduledAt: newsletterSends.scheduledAt,
      sentAt: newsletterSends.sentAt,
      status: newsletterSends.status,
      createdAt: newsletterSends.createdAt,
    })
    .from(newsletterSends)
    .where(
      and(
        eq(newsletterSends.cabinetId, cab.id),
        isNull(newsletterSends.sentAt),
        inArray(newsletterSends.status, ['scheduled', 'sending'])
      )
    )
    .orderBy(asc(newsletterSends.scheduledAt))
    .limit(10);

  // Recipient counts grouped by send_id (1 round-trip, no scalar subquery)
  const sendIds = upcomingSends.map((s) => s.id);
  const recipientCounts =
    sendIds.length > 0
      ? await db
          .select({
            sendId: newsletterRecipients.sendId,
            count: sql<number>`count(*)`,
          })
          .from(newsletterRecipients)
          .where(inArray(newsletterRecipients.sendId, sendIds))
          .groupBy(newsletterRecipients.sendId)
      : [];
  const recipientMap = new Map<string, number>(
    recipientCounts.map((r) => [r.sendId, Number(r.count ?? 0)])
  );

  // Article titles for the upcoming sends (1 round-trip)
  const articleSlugs = Array.from(new Set(upcomingSends.map((s) => s.articleSlug)));
  const articleRows =
    articleSlugs.length > 0
      ? await db
          .select({ slug: articles.slug, title: articles.title })
          .from(articles)
          .where(inArray(articles.slug, articleSlugs as string[]))
      : [];
  const articleMap = new Map<string, string>(articleRows.map((a) => [a.slug, a.title]));

  return {
    cabinet: { name: cab.name, slug: cab.slug },
    kpis: {
      patients: Number(patients?.c ?? 0),
      newsletters: Number(newsletters?.c ?? 0),
      articles: Number(articlesCount?.c ?? 0),
    },
    upcomingNewsletters: upcomingSends.map((s) => ({
      id: s.id,
      subject: s.subject,
      articleSlug: s.articleSlug,
      articleTitle: articleMap.get(s.articleSlug) ?? s.articleSlug,
      scheduledAt: s.scheduledAt,
      status: s.status as UpcomingNewsletterRow['status'],
      recipientCount: recipientMap.get(s.id) ?? 0,
    })),
  };
}

export const metadata = {
  title: 'Démo praticien — Sensident',
  description: 'Démo interactive espace praticien Sensident',
};

const SECTIONS = [
  {
    title: 'Tableau de bord',
    items: [
      {
        href: '/dashboard',
        icon: LayoutDashboard,
        label: "Vue d'ensemble",
        description: 'KPIs du mois et activité récente',
      },
    ],
  },
  {
    title: 'Envoyer',
    items: [
      {
        href: '/dashboard/library',
        icon: BookOpen,
        label: 'Bibliothèque',
        description: "Articles du catalogue validés",
      },
      {
        href: '/dashboard/invitation',
        icon: Link2,
        label: 'Inviter un patient',
        description: 'Générer un lien ou QR code',
      },
    ],
  },
  {
    title: 'Mesurer',
    items: [
      {
        href: '/dashboard/analytics',
        icon: BarChart3,
        label: 'Analytics',
        description: 'Entonnoir, durées, top articles',
      },
      {
        href: '/dashboard/engagement',
        icon: Users,
        label: 'Engagement',
        description: 'Rétention et segmentation',
      },
    ],
  },
  {
    title: 'Mon cabinet',
    items: [
      {
        href: '/dashboard/account',
        icon: Settings,
        label: 'Mon compte',
        description: 'MFA, infos, abonnement',
      },
    ],
  },
];

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
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link href="/demo" className="text-sm text-muted-foreground hover:text-foreground">
            ← Hub démo
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-medium">
            🦷 Praticien
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-10 md:py-12">
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

        {/* Navigation directe — grille par groupe */}
        <div className="mt-8 space-y-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Explorer le cabinet démo
          </h2>
          {SECTIONS.map((section) => (
            <div key={section.title} className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{section.title}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition hover:border-blue-300 hover:bg-blue-50/40"
                    >
                      <Icon className="h-5 w-5 shrink-0 text-blue-700" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-blue-700" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Mes prochaines newsletters */}
        <section className="mt-10 rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-blue-700" />
            <h2 className="text-base font-semibold">Mes prochaines newsletters</h2>
          </div>

          {data.upcomingNewsletters.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune newsletter programmée. Allez dans la Bibliothèque, choisissez un article
              et cliquez l’icône <span className="inline-block align-text-bottom">✉</span> pour en composer une.
            </p>
          ) : (
            <UpcomingNewslettersTable rows={data.upcomingNewsletters as UpcomingNewsletterRow[]} />
          )}
        </section>

        <div className="mt-10 text-center text-sm">
          <Link href="/demo/patient" className="text-muted-foreground hover:text-foreground">
            → Voir la démo côté patient
          </Link>
        </div>
      </section>
    </main>
  );
}