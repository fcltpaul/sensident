'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  X,
  Mail,
  Link2,
  BarChart3,
  FileText,
  Sparkles,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

interface Props {
  /** URL origine apres onboarding wizard (defaut /dashboard). */
  triggerOn?: string;
}

const STEPS = [
  {
    icon: Mail,
    title: 'Composez votre premiere newsletter',
    desc: "Choisissez un article valide, personnalisez-le avec votre signature et envoyez-le. 3 minutes par mois suffisent.",
    href: '/dashboard/newsletter/compose',
    cta: 'Ouvrir le composer',
  },
  {
    icon: Link2,
    title: 'Invitez vos patients',
    desc: "Generez un QR code a imprimer au fauteuil ou un lien a partager par SMS. Vos patients scannent et rejoignent votre programme en 30 secondes.",
    href: null,
    cta: "S'affichera sur le bouton 'Inviter'",
  },
  {
    icon: BarChart3,
    title: 'Suivez l\'impact en temps reel',
    desc: "Taux d'ouverture par article, duree de lecture, top 5 des sujets preferes de vos patients. Tout anonymise a partir de 5 patients.",
    href: '/dashboard/analytics',
    cta: 'Voir les analytics',
  },
  {
    icon: FileText,
    title: 'Les brouillons sont sauvegardes',
    desc: "Si vous etes interrompu, vos brouillons persistent. Vous pouvez reprendre depuis 'Mes brouillons' a tout moment.",
    href: '/dashboard/newsletter/drafts',
    cta: 'Voir mes brouillons',
  },
];

/**
 * Modal de bienvenue 1 fois : apparait apres l'onboarding wizard.
 * Dismissable, progression 4 etapes (precedent/suivant).
 * Stocke la vue en localStorage pour ne pas re-afficher.
 */
export function WelcomeTour({ triggerOn = '/dashboard' }: Props) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname !== triggerOn) return;
    const seen = window.localStorage.getItem('welcome_tour_seen');
    if (seen === '1') return;
    // Verifie que l'onboarding wizard est termine
    fetch('/api/practitioner/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.onboardingCompleted) {
          setOpen(true);
        }
      })
      .catch(() => {});
  }, [triggerOn]);

  const close = (dismiss = true) => {
    if (dismiss && typeof window !== 'undefined') {
      window.localStorage.setItem('welcome_tour_seen', '1');
    }
    setOpen(false);
  };

  const next = () => {
    if (idx < STEPS.length - 1) setIdx(idx + 1);
    else close();
  };
  const prev = () => {
    if (idx > 0) setIdx(idx - 1);
  };

  if (!open) return null;

  const step = STEPS[idx];
  const Icon = step.icon;
  const last = idx === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-tour-title"
    >
      <div className="relative w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl">
        <button
          type="button"
          onClick={() => close()}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Fermer la visite guidee"
        >
          <X className="h-4 w-4" aria-hidden={true} />
        </button>

        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden={true} />
          </div>
          <div className="min-w-0">
            {idx === 0 && (
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                <Sparkles className="mr-1 inline h-3 w-3" /> Bienvenue
              </p>
            )}
            <h2 id="welcome-tour-title" className="text-base font-bold leading-tight">
              {step.title}
            </h2>
          </div>
        </div>

        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{step.desc}</p>

        {/* Progress */}
        <div className="mt-4 flex items-center gap-1.5" aria-hidden={true}>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= idx ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Etape {idx + 1} sur {STEPS.length}
        </p>

        <div className="mt-5 flex items-center justify-between gap-2">
          {idx > 0 ? (
            <button
              type="button"
              onClick={prev}
              className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden={true} />
              Precedent
            </button>
          ) : (
            <button
              type="button"
              onClick={() => close(false)}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Plus tard
            </button>
          )}

          {step.href ? (
            <Link
              href={step.href}
              onClick={() => close()}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-95"
            >
              {step.cta}
              <ChevronRight className="h-4 w-4" aria-hidden={true} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-95"
            >
              {last ? 'Terminer' : 'Suivant'}
              <ChevronRight className="h-4 w-4" aria-hidden={true} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}