'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FileText, FolderTree, Building2, BarChart3, Shield, Settings, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface AdminPage {
  icon: any;
  title: string;
  desc: string;
  href: string;
}

const ADMIN_PAGES: AdminPage[] = [
  { icon: FileText, title: 'Articles', desc: 'CRUD articles, validation éditoriale, comité scientifique.', href: '/admin/articles' },
  { icon: FolderTree, title: 'Catégories', desc: 'Taxonomie : hygiène, alimentation, enfants, carie, etc.', href: '/admin/categories' },
  { icon: Building2, title: 'Cabinets', desc: 'Liste des cabinets praticiens, abonnements, ambassadeurs.', href: '/admin/cabinets' },
  { icon: BarChart3, title: 'Statistiques', desc: 'KPIs plateforme, volumes, engagement, anomalies.', href: '/admin/stats' },
  { icon: Shield, title: 'Audit logs', desc: 'Traces immuables : connexions, exports, opt-ins, suppressions.', href: '/admin/audit' },
  { icon: Settings, title: 'Paramètres', desc: "Système, identifiants équipe, modèles d'email.", href: '/admin/settings' },
];

export function AdminActions() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enterAdmin(target: string) {
    setLoading(target);
    setError(null);
    try {
      const res = await fetch('/api/demo/admin', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur démo');
      router.push(target);
    } catch (e: any) {
      setError(e.message);
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {loading && (
        <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 text-sm text-accent flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Connexion admin démo…
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_PAGES.map((p) => {
          const Icon = p.icon;
          const isLoading = loading === p.href;
          return (
            <button
              key={p.href}
              onClick={() => enterAdmin(p.href)}
              disabled={loading !== null}
              className="group text-left rounded-xl border-2 border-violet-200 hover:border-violet-400 bg-card p-5 transition hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className="h-6 w-6 text-muted-foreground" />
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-accent" />}
              </div>
              <p className="font-semibold text-sm">{p.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{p.desc}</p>
              <p className="text-xs font-medium text-accent mt-3 group-hover:translate-x-1 transition inline-flex items-center gap-1">
                {isLoading ? 'Connexion…' : 'Ouvrir'}
                {!isLoading && <ArrowRight className="h-3 w-3" />}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
