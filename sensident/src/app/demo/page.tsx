import Link from 'next/link';
import { db } from '@/db/client';
import { cabinets, articles, patientConsents, newsletterSends, newsletterRecipients } from '@/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { DemoEntry } from './demo-entry';

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
      recentNewsletters: [],
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
      recentNewsletters: [],
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

  // 3 dernières newsletters avec compteurs
  const recent = await db
    .select({
      id: newsletterSends.id,
      subject: newsletterSends.subject,
      sentAt: newsletterSends.sentAt,
      articleSlug: newsletterSends.articleSlug,
    })
    .from(newsletterSends)
    .where(eq(newsletterSends.cabinetId, cab.id))
    .orderBy(desc(newsletterSends.sentAt))
    .limit(3);

  // Pour chaque newsletter : open / click / total
  const recentNewsletters = await Promise.all(
    recent.map(async (n) => {
      const recipients = await db
        .select({
          status: newsletterRecipients.status,
        })
        .from(newsletterRecipients)
        .where(eq(newsletterRecipients.sendId, n.id));
      const total = recipients.length;
      const opened = recipients.filter((r) => r.status === 'opened' || r.status === 'clicked').length;
      const clicked = recipients.filter((r) => r.status === 'clicked').length;
      return { ...n, total, opened, clicked };
    })
  );

  return {
    enabled: true,
    cabinetSeeded: true,
    cabinet: cab,
    articleCount: Number(articleCount[0]?.c ?? 0),
    patientCount: Number(patientCount[0]?.c ?? 0),
    newsletterCount: Number(newsletterCount[0]?.c ?? 0),
    recentNewsletters,
  };
}

export const metadata = {
  title: 'Démo François — Sensident',
  description: 'Présentation interactive de la plateforme Sensident pour Dr François Thibault.',
};

export default async function DemoPage() {
  const status = await getDemoStatus();

  if (!status.enabled) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Démo non activée</h1>
          <p className="text-muted-foreground">
            Cette page est réservée à la démo interne pour Dr François Thibault.
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
            node scripts/seed-demo-francois-sqlite.mjs
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
              🎬 Démo François
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Démo interactive — {status.cabinet?.name}
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Bienvenue Dr Thibault. Cette page vous donne accès à toutes les vues
            de la plateforme, avec un cabinet de démonstration pré-rempli.
            Aucun mot de passe, aucun email à valider — tout est en accès direct.
          </p>

          {/* Stats rapides */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox label="Articles" value={status.articleCount} />
            <StatBox label="Patients" value={status.patientCount} />
            <StatBox label="Newsletters" value={status.newsletterCount} />
            <StatBox label="Plan" value="Pro" />
          </div>
        </div>
      </section>

      {/* BOUTONS D'ENTRÉE */}
      <section className="mx-auto max-w-5xl px-6 py-10 md:py-12">
        <DemoEntry cabinetSlug={status.cabinet?.slug ?? ''} />

        {/* 3 dernières newsletters envoyées */}
        {status.recentNewsletters.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold mb-4">3 dernières newsletters envoyées</h2>
            <div className="grid gap-3">
              {status.recentNewsletters.map((n) => (
                <div key={n.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{n.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {n.articleSlug} · envoyée {n.sentAt ? new Date(n.sentAt).toLocaleDateString('fr-FR') : '?'}
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
          </div>
        )}
      </section>

      {/* PARCOURS PATIENT */}
      <section className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-5xl px-6 py-10 md:py-12">
          <h2 className="text-lg font-semibold mb-2">Côté patient</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Le patient reçoit un lien de votre part (QR code au fauteuil ou email
            manuel). Pour la démo, on contourne le magic link.
          </p>
          <Link
            href={`/c/${status.cabinet?.slug}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-3 text-sm font-medium hover:border-foreground transition"
            target="_blank"
          >
            Voir la landing patient (cabinet de démo)
            <span className="text-muted-foreground">↗</span>
          </Link>
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
