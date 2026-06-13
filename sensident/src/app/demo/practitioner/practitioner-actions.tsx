'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LayoutDashboard, BookOpen, Send, BarChart3, Users, Stethoscope, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface EntryPoint {
  icon: any;
  title: string;
  desc: string;
  href: string;
  color: string;
}

const ENTRY_POINTS: EntryPoint[] = [
  {
    icon: LayoutDashboard,
    title: "Vue d'ensemble",
    desc: '4 KPIs du mois, activité récente, accès rapides aux 6 onglets.',
    href: '/dashboard',
    color: 'border-blue-200 hover:border-blue-400',
  },
  {
    icon: BookOpen,
    title: 'Bibliothèque cabinet',
    desc: 'Articles validés, 3 épinglés. Personnalisation de la bibliothèque.',
    href: '/dashboard/library',
    color: 'border-emerald-200 hover:border-emerald-400',
  },
  {
    icon: Send,
    title: 'Newsletter',
    desc: 'Composer, planifier, historique des envois.',
    href: '/dashboard/newsletter',
    color: 'border-violet-200 hover:border-violet-400',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    desc: "Taux de lecture, articles les plus vus, entonnoir d'engagement.",
    href: '/dashboard/analytics',
    color: 'border-amber-200 hover:border-amber-400',
  },
  {
    icon: Users,
    title: 'Engagement',
    desc: 'Rétention M0 / M+1 / M+2, segmentation patients.',
    href: '/dashboard/engagement',
    color: 'border-rose-200 hover:border-rose-400',
  },
  {
    icon: Stethoscope,
    title: 'Mon cabinet',
    desc: 'Infos, branding newsletters, abonnement Stripe, MFA.',
    href: '/dashboard/account',
    color: 'border-slate-200 hover:border-slate-400',
  },
];

export function PractitionerActions() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enter(target: string) {
    setLoading(target);
    setError(null);
    try {
      const res = await fetch('/api/demo/enter', { method: 'POST' });
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
          Connexion au cabinet démo…
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ENTRY_POINTS.map((entry) => {
          const Icon = entry.icon;
          const isLoading = loading === entry.href;
          return (
            <button
              key={entry.href}
              onClick={() => enter(entry.href)}
              disabled={loading !== null}
              className={`group text-left rounded-xl border-2 ${entry.color} bg-card p-5 transition hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className="h-6 w-6 text-muted-foreground" />
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-accent" />}
              </div>
              <p className="font-semibold text-sm">{entry.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{entry.desc}</p>
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
