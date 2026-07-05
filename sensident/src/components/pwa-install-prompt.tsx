'use client';

import { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';

/**
 * Petit bandeau qui apparait 2s apres arrivee sur /c/[slug]/rejoindre
 * et propose "Ajouter a l'ecran d'accueil" sur iOS Safari / Android Chrome.
 *
 * iOS Safari : ne supporte pas beforeinstallprompt, on montre un mini-bulletin
 * avec les 3 etapes manuelles (partager > ajouter a l'ecran d'accueil).
 *
 * Stocke la dismissal 7 jours en localStorage pour ne pas spammer.
 */
export function PwaInstallPrompt({ cabinetSlug }: { cabinetSlug: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissUntil = window.localStorage.getItem('pwa_prompt_dismissed_until');
    if (dismissUntil && Number(dismissUntil) > Date.now()) return;
    const dismissedFor = window.localStorage.getItem('pwa_prompt_dismissed_for');
    if (dismissedFor === cabinetSlug) return;

    // Detecte Safari mobile (heuristique simple : iOS + standalone absent + Webkit)
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error - non standard
      window.navigator.standalone === true;
    if (isStandalone) return;

    if (isIos) {
      setTimeout(() => setOpen(true), 3000);
    } else if ('beforeInstallPrompt' in window) {
      // Pas dispo en local dev sans evenement emis ; on ne montre rien
      // (a voir post-MVP avec un vrai prompt)
    }
  }, [cabinetSlug]);

  const dismiss = () => {
    if (typeof window === 'undefined') return;
    const until = Date.now() + 7 * 24 * 60 * 60 * 1000;
    window.localStorage.setItem('pwa_prompt_dismissed_until', String(until));
    window.localStorage.setItem('pwa_prompt_dismissed_for', cabinetSlug);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Installer l'application"
      className="fixed inset-x-3 bottom-3 z-50 rounded-xl border border-border bg-background p-4 shadow-xl md:hidden"
    >
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden={true} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Installer l&apos;espace patient</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Sur iPhone : touchez{' '}
            <span className="font-mono text-[11px]">Partager</span>, puis{' '}
            <strong>Ajouter à l&apos;écran d&apos;accueil</strong>. L&apos;app fonctionne hors-ligne.
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="mt-2 text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}