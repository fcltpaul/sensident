import Link from 'next/link';
import { db } from '@/db/client';
import { articles, categories, cabinets, auditLogs } from '@/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { AdminActions } from './admin-actions';

export const dynamic = 'force-dynamic';

async function getAdminDemoData() {
  if (process.env.SENSIDENT_DEMO_MODE !== '1') return null;

  const articleCount = await db
    .select({ c: sql<number>`count(*)` })
    .from(articles);
  const validatedCount = await db
    .select({ c: sql<number>`count(*)` })
    .from(articles)
    .where(eq(articles.status, 'validated'));
  const cabinetCount = await db
    .select({ c: sql<number>`count(*)` })
    .from(cabinets);
  const categoryCount = await db
    .select({ c: sql<number>`count(*)` })
    .from(categories);

  // 5 derniers audit logs
  const recentLogs = await db
    .select({
      id: auditLogs.id,
      ts: auditLogs.ts,
      actorType: auditLogs.actorType,
      action: auditLogs.action,
      ip: auditLogs.ip,
    })
    .from(auditLogs)
    .orderBy(desc(auditLogs.ts))
    .limit(5);

  return {
    counts: {
      articles: Number(articleCount[0]?.c ?? 0),
      articlesValidated: Number(validatedCount[0]?.c ?? 0),
      cabinets: Number(cabinetCount[0]?.c ?? 0),
      categories: Number(categoryCount[0]?.c ?? 0),
    },
    recentLogs,
  };
}

export const metadata = {
  title: 'Démo Admin — Sensident',
  description: 'Espace admin Sensident — back-office éditorial',
};

const ADMIN_PAGES = [
  {
    icon: '📝',
    title: 'Articles',
    desc: 'CRUD articles, validation éditoriale, comité scientifique.',
    href: '/admin/articles',
  },
  {
    icon: '🗂️',
    title: 'Catégories',
    desc: 'Taxonomie : hygiène, alimentation, enfants, carie, etc.',
    href: '/admin/categories',
  },
  {
    icon: '🏥',
    title: 'Cabinets',
    desc: 'Liste des cabinets praticiens, abonnements, ambassadeurs.',
    href: '/admin/cabinets',
  },
  {
    icon: '📊',
    title: 'Statistiques',
    desc: 'KPIs plateforme, volumes, engagement, anomalies.',
    href: '/admin/stats',
  },
  {
    icon: '🛡️',
    title: 'Audit logs',
    desc: 'Traces immuables : connexions, exports, opt-ins, suppressions.',
    href: '/admin/audit',
  },
  {
    icon: '⚙️',
    title: 'Paramètres',
    desc: 'Système, identifiants équipe, modèles d\'email.',
    href: '/admin/settings',
  },
];

export default async function AdminDemoPage() {
  const data = await getAdminDemoData();
  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Démo admin indisponible</h1>
          <p className="text-muted-foreground">
            Active <code className="bg-muted px-1.5 py-0.5 rounded text-sm">SENSIDENT_DEMO_MODE=1</code>.
          </p>
          <Link href="/demo" className="inline-block text-sm text-accent hover:underline">
            ← Retour au hub démo
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-violet-50/30 to-background">
      {/* HEADER */}
      <section className="border-b border-border bg-card/50">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Link href="/demo" className="hover:text-foreground">← Hub démo</Link>
            <span className="text-muted-foreground/40">|</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 text-violet-800 px-2.5 py-0.5 text-xs font-medium">
              🛠️ Admin Sensident
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Back-office éditorial
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Côté équipe Sensident : catalogue d'articles, audit, statistiques plateforme.
          </p>
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto max-w-6xl px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiBox label="Articles" value={`${data.counts.articlesValidated}/${data.counts.articles}`} hint="validés/total" />
          <KpiBox label="Catégories" value={data.counts.categories} />
          <KpiBox label="Cabinets" value={data.counts.cabinets} />
          <KpiBox label="Rôle" value="Superadmin" />
        </div>
      </section>

      {/* ACTIONS ADMIN */}
      <section className="mx-auto max-w-6xl px-6 py-4">
        <AdminActions />
      </section>

      {/* 6 SECTIONS ADMIN */}
      <section className="mx-auto max-w-6xl px-6 py-6">
        <h2 className="text-lg font-semibold mb-1">Les 6 sections du back-office</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Cliquez pour entrer dans l'admin (bypass password + MFA).
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ADMIN_PAGES.map((p) => (
            <button
              key={p.href}
              data-admin-target={p.href}
              className="group text-left rounded-xl border-2 border-violet-200 hover:border-violet-400 bg-card p-5 transition hover:shadow-md"
            >
              <div className="text-2xl mb-2">{p.icon}</div>
              <p className="font-semibold text-sm">{p.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{p.desc}</p>
              <p className="text-xs font-medium text-accent mt-3 group-hover:translate-x-1 transition">
                Ouvrir →
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* AUDIT LOGS */}
      {data.recentLogs.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-6">
          <h2 className="text-lg font-semibold mb-3">5 dernières actions auditées</h2>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Quand</th>
                  <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Acteur</th>
                  <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Action</th>
                  <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">IP</th>
                </tr>
              </thead>
              <tbody>
                {data.recentLogs.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {l.ts ? new Date(l.ts).toLocaleString('fr-FR') : '?'}
                    </td>
                    <td className="px-3 py-2 text-xs">{l.actorType}</td>
                    <td className="px-3 py-2 text-xs font-mono">{l.action}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{l.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

function KpiBox({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}{hint ? ` · ${hint}` : ''}</p>
    </div>
  );
}
