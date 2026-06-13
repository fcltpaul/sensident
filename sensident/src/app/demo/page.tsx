import Link from 'next/link';
import { db } from '@/db/client';
import { cabinets, articles, patientConsents, newsletterSends, newsletterRecipients } from '@/db/schema';
import { eq, sql, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const DEMO_CABINET_SLUG = 'demo-francois-thibault';

async function getDemoStatus() {
  const enabled = process.env.SENSIDENT_DEMO_MODE === '1';
  if (!enabled) {
    return {
      enabled: false,
      cabinetSeeded: false,
      articleCount: 0,
      patientCount: 0,
      newsletterCount: 0,
    };
  }

  const [cab] = await db
    .select()
    .from(cabinets)
    .where(eq(cabinets.slug, DEMO_CABINET_SLUG))
    .limit(1);

  if (!cab) {
    return {
      enabled: true,
      cabinetSeeded: false,
      articleCount: 0,
      patientCount: 0,
      newsletterCount: 0,
    };
  }

  const articleCount = await db
    .select({ c: sql<number>`count(*)` })
    .from(articles)
    .where(eq(articles.status, 'validated'));

  const patientCount = await db
    .select({ c: sql<number>`count(*)` })
    .from(patientConsents)
    .where(eq(patientConsents.cabinetId, cab.id));

  const newsletterCount = await db
    .select({ c: sql<number>`count(*)` })
    .from(newsletterSends)
    .where(eq(newsletterSends.cabinetId, cab.id));

  return {
    enabled: true,
    cabinetSeeded: true,
    cabinet: cab,
    articleCount: Number(articleCount[0]?.c ?? 0),
    patientCount: Number(patientCount[0]?.c ?? 0),
    newsletterCount: Number(newsletterCount[0]?.c ?? 0),
  };
}

export const metadata = {
  title: 'Démo Sensident — 3 espaces à explorer',
  description: 'Présentation interactive des 3 espaces de la plateforme Sensident.',
};

export default async function DemoHub() {
  const status = await getDemoStatus();

  if (!status.enabled) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Démo non activée</h1>
          <p className="text-muted-foreground">
            Cette page est réservée à la démo interne.
            Active <code className="bg-muted px-1.5 py-0.5 rounded text-sm">SENSIDENT_DEMO_MODE=1</code> dans
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm"> .env</code> pour y accéder.
          </p>
        </div>
      </main>
    );
  }

  if (!status.cabinetSeeded) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Démo non seedée</h1>
          <p className="text-muted-foreground">
            Lance d'abord la commande suivante :
          </p>
          <pre className="bg-muted p-3 rounded text-left text-sm">
            node scripts/seed-demo-francois-neon.mjs
          </pre>
          <p className="text-sm text-muted-foreground">
            Puis recharge cette page.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-accent/5 to-background">
      {/* HERO */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-10 md:py-14">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/" className="hover:text-foreground">← Retour à l'accueil</Link>
            <span className="text-muted-foreground/40">|</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-medium">
              🎬 Démo Sensident
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Explorez les 3 espaces de Sensident
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Choisissez un point de vue pour découvrir la plateforme. Aucun mot de passe,
            aucun email à valider — tout est en accès direct pour la démo.
          </p>

          {/* Stats rapides */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox label="Articles" value={status.articleCount} />
            <StatBox label="Patients" value={status.patientCount} />
            <StatBox label="Newsletters" value={status.newsletterCount} />
            <StatBox label="Cabinet" value="Démo François" />
          </div>
        </div>
      </section>

      {/* 3 ESPACES */}
      <section className="mx-auto max-w-5xl px-6 py-10 md:py-12">
        <div className="grid gap-6 md:grid-cols-3">
          <SpaceCard
            href="/demo/practitioner"
            icon="🦷"
            title="Espace praticien"
            subtitle="Cabinet du Dr François Thibault"
            description="Dashboard, bibliothèque cabinet, composer newsletter, analytics, engagement, mon cabinet. Plan Pro ambassadeur."
            accent="bg-blue-50 border-blue-200 hover:border-blue-400"
            tag="Recommandé pour Dr Thibault"
          />
          <SpaceCard
            href="/demo/patient"
            icon="📚"
            title="Espace patient"
            subtitle="Marie Martin (exemple)"
            description="Bibliothèque d'articles, lecture avec tracking, réactions, espace personnel. Vue de ce que vos patients voient."
            accent="bg-emerald-50 border-emerald-200 hover:border-emerald-400"
          />
          <SpaceCard
            href="/demo/admin"
            icon="🛠️"
            title="Admin Sensident"
            subtitle="Équipe éditoriale"
            description="Catalogue articles, catégories, audit logs, stats plateforme. Côté back-office de l'équipe Sensident."
            accent="bg-violet-50 border-violet-200 hover:border-violet-400"
          />
        </div>
      </section>

      {/* PAGES PUBLIQUES */}
      <section className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-5xl px-6 py-8 md:py-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Pages publiques (consultables aussi avant inscription)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href={`/c/${status.cabinet?.slug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-border bg-card p-4 hover:border-accent/50 transition"
            >
              <p className="font-medium text-sm">Landing patient du cabinet</p>
              <p className="text-xs text-muted-foreground mt-1">/c/{status.cabinet?.slug}</p>
            </a>
            <a
              href="/articles"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-border bg-card p-4 hover:border-accent/50 transition"
            >
              <p className="font-medium text-sm">Catalogue public des articles</p>
              <p className="text-xs text-muted-foreground mt-1">/articles</p>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function SpaceCard({
  href, icon, title, subtitle, description, accent, tag,
}: {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  tag?: string;
}) {
  return (
    <Link
      href={href}
      className={`group block rounded-xl border-2 ${accent} bg-card p-6 transition hover:shadow-md`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-4xl">{icon}</span>
        {tag && (
          <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            {tag}
          </span>
        )}
      </div>
      <h3 className="font-bold text-lg text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{description}</p>
      <p className="text-sm font-medium text-accent mt-4 group-hover:translate-x-1 transition">
        Entrer dans cet espace →
      </p>
    </Link>
  );
}
