'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, ChevronRight, X } from 'lucide-react';

/**
 * Bannière "Action recommandée" affichée sur /dashboard.
 * - Si onboarding pas fait : CTA "Terminer la configuration (2 min)" → /dashboard/onboarding
 * - Si > 7 jours ET 0 patient : CTA "Invitez vos premiers patients pour activer les statistiques →"
 * - Dismissable (sauvegarde en localStorage, 30 jours).
 */
export function OnboardingBanner() {
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check localStorage dismiss
    if (typeof window !== 'undefined') {
      const until = window.localStorage.getItem('onboarding_banner_dismissed_until');
      if (until && Number(until) > Date.now()) {
        setDismissed(true);
        setLoading(false);
        return;
      }
    }
    let cancelled = false;
    fetch('/api/practitioner/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setOnboardingCompleted(Boolean(data.onboardingCompleted));
      })
      .catch(() => {
        /* silencieux */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || dismissed || onboardingCompleted !== false) {
    return null;
  }

  return (
    <div className="relative flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">Terminer la configuration de votre cabinet</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            2 minutes suffisent pour personnaliser vos newsletters et inviter vos premiers patients.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/onboarding"
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-95"
        >
          Terminer (2 min)
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
        <button
          type="button"
          onClick={() => {
            const until = Date.now() + 30 * 24 * 60 * 60 * 1000;
            window.localStorage.setItem('onboarding_banner_dismissed_until', String(until));
            setDismissed(true);
          }}
          className="rounded-md p-1 text-muted-foreground hover:bg-background"
          aria-label="Masquer la bannière 30 jours"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}