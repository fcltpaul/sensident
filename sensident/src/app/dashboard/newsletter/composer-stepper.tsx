'use client';

import { BookOpen, Palette, Eye, Send } from 'lucide-react';
import type { WizardStep } from './composer-types';

const STEPS: Array<{ id: WizardStep; label: string; icon: typeof BookOpen }> = [
  { id: 'article', label: 'Article', icon: BookOpen },
  { id: 'template', label: 'Personnalisation', icon: Palette },
  { id: 'preview', label: 'Aperçu', icon: Eye },
  { id: 'send', label: 'Envoi', icon: Send },
];

interface Props {
  current: WizardStep;
  onJump?: (step: WizardStep) => void;
  /** Étapes déjà complétées par l'utilisateur (peut revenir en arrière). */
  visited: ReadonlyArray<WizardStep>;
}

/**
 * Indicateur de progression horizontale + verticale. Affiché en haut du composer
 * et dans la sidebar desktop. Le clic sur une étape visited est autorisé.
 */
export function ComposerStepper({ current, onJump, visited }: Props) {
  return (
    <nav aria-label="Progression du composer" className="space-y-2">
      {/* Barre horizontale (mobile + desktop) */}
      <ol className="flex items-center gap-2">
        {STEPS.map((s, idx) => {
          const active = current === s.id;
          const done = visited.includes(s.id) && !active;
          const reachable = visited.includes(s.id);
          const Icon = s.icon;
          return (
            <li key={s.id} className="flex flex-1 items-center gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  disabled={!reachable || !onJump}
                  onClick={() => onJump?.(s.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-foreground text-background shadow-sm'
                      : done
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40'
                      : reachable
                      ? 'border border-border bg-background hover:bg-muted text-foreground'
                      : 'border border-border bg-background text-muted-foreground'
                  } disabled:cursor-default disabled:hover:bg-background`}
                  aria-current={active ? 'step' : undefined}
                  aria-label={`Étape ${idx + 1}/${STEPS.length} : ${s.label}${active ? ' (en cours)' : done ? ' (terminée)' : ''}`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden={true} />
                  <span className="hidden sm:inline">
                    {idx + 1}. {s.label}
                  </span>
                </button>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="hidden h-px flex-1 bg-border md:block" aria-hidden={true} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}