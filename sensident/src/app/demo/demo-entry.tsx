'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, FileText, Send, BarChart3, Users,
  Stethoscope, BookOpen, ArrowRight, Loader2, ExternalLink,
} from 'lucide-react';

interface DemoEntryProps {
  cabinetSlug: string;
}

const ENTRY_POINTS_PRACTITIONER = [
  {
    icon: LayoutDashboard,
    title: 'Vue d\'ensemble',
    desc: 'KPIs du mois, activité récente.',
    href: '/dashboard',
    color: 'bg-blue-50 text-blue-700',
  },
  {
    icon: FileText,
    title: 'Bibliothèque cabinet',
    desc: 'Articles validés, 3 épinglés pour vous.',
    href: '/dashboard/library',
    color: 'bg-emerald-50 text-emerald-700',
  },
  {
    icon: Send,
    title: 'Newsletter',
    desc: 'Composer, planifier, historique.',
    href: '/dashboard/newsletter',
    color: 'bg-violet-50 text-violet-700',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    desc: 'Taux de lecture, articles les plus vus.',
    href: '/dashboard/analytics',
    color: 'bg-amber-50 text-amber-700',
  },
  {
    icon: Users,
    title: 'Engagement',
    desc: 'Rétention M0 / M+1 / M+2.',
    href: '/dashboard/engagement',
    color: 'bg-rose-50 text-rose-700',
  },
  {
    icon: Stethoscope,
    title: 'Mon cabinet',
    desc: 'Infos, branding, abonnement.',
    href: '/dashboard/account',
    color: 'bg-slate-100 text-slate-700',
  },
];

const ENTRY_POINTS_PATIENT = [
  {
    icon: BookOpen,
    title: 'Bibliothèque patient',
    desc: 'Articles accessibles après inscription.',
    href: `/c/${''}/bibliotheque`,
    external: true,
  },
];

export function DemoEntry({ cabinetSlug }: DemoEntryProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enterAsPractitioner(target: string) {
    setLoading('practitioner');
    setError(null);
    try {
      const res = await fetch('/api/demo/enter', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur démo');
      }
      router.push(target);
    } catch (e: any) {
      setError(e.message);
      setLoading(null);
    }
  }

  async function enterAsPatient() {
    setLoading('patient');
    setError(null);
    try {
      const res = await fetch('/api/demo/patient', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur démo');
      }
      window.open(data.redirect, '_blank');
      setLoading(null);
    } catch (e: any) {
      setError(e.message);
      setLoading(null);
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* PRATICIEN */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Stethoscope className="h-4 w-4 text-accent" />
          <h2 className="text-lg font-semibold">Côté praticien</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Un clic suffit : vous entrez directement dans le dashboard, sans login ni MFA.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ENTRY_POINTS_PRACTITIONER.map((entry) => {
            const Icon = entry.icon;
            return (
              <button
                key={entry.href}
                onClick={() => enterAsPractitioner(entry.href)}
                disabled={loading !== null}
                className="group text-left rounded-xl border border-border bg-card p-5 transition hover:border-accent/50 hover:shadow-sm disabled:opacity-50"
              >
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${entry.color} mb-3`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="font-semibold text-sm flex items-center gap-1.5">
                  {entry.title}
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 transition group-hover:opacity-100 group-hover:translate-x-0" />
                </p>
                <p className="text-xs text-muted-foreground mt-1">{entry.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* PATIENT */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4 text-accent" />
          <h2 className="text-lg font-semibold">Côté patient</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Le patient s'inscrit via un lien privé (ici on simule un magic link actif).
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={enterAsPatient}
            disabled={loading !== null}
            className="group text-left rounded-xl border border-border bg-card p-5 transition hover:border-accent/50 hover:shadow-sm disabled:opacity-50"
          >
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700 mb-3">
              <BookOpen className="h-5 w-5" />
            </div>
            <p className="font-semibold text-sm flex items-center gap-1.5">
              {loading === 'patient' ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Connexion…</>
              ) : (
                <>Espace patient (démo)
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 transition group-hover:opacity-100 group-hover:translate-x-0" />
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Ouvre l'espace patient pré-authentifié (s'ouvre dans un nouvel onglet).
            </p>
          </button>

          <a
            href={`/c/${cabinetSlug}`}
            target="_blank"
            rel="noreferrer"
            className="group text-left rounded-xl border border-border bg-card p-5 transition hover:border-accent/50 hover:shadow-sm"
          >
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-700 mb-3">
              <ExternalLink className="h-5 w-5" />
            </div>
            <p className="font-semibold text-sm flex items-center gap-1.5">
              Landing publique cabinet
              <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 transition group-hover:opacity-100 group-hover:translate-x-0" />
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Page d'accueil patient (avant inscription).
            </p>
          </a>

          <a
            href="/articles"
            target="_blank"
            rel="noreferrer"
            className="group text-left rounded-xl border border-border bg-card p-5 transition hover:border-accent/50 hover:shadow-sm"
          >
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700 mb-3">
              <ExternalLink className="h-5 w-5" />
            </div>
            <p className="font-semibold text-sm flex items-center gap-1.5">
              Catalogue articles
              <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 transition group-hover:opacity-100 group-hover:translate-x-0" />
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Vue publique du catalogue (avant inscription).
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
