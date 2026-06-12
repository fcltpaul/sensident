import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import type { PlanCode } from '@/lib/stripe';

interface Props {
  feature: 'analytics' | 'engagement' | 'templates' | 'maxPatients' | 'newslettersPerMonth' | 'support';
  currentPlan: PlanCode;
  requiredPlan: PlanCode;
  title: string;
  description: string;
}

const PLAN_LABEL: Record<PlanCode, string> = {
  free: 'Free',
  pro: 'Pro',
  cabinet: 'Cabinet',
};

/**
 * Bandeau d'upgrade affiche en haut d'une page reservee a un tier superieur.
 * Server component, pas d'etat.
 */
export function UpgradeBanner({ feature, currentPlan, requiredPlan, title, description }: Props) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-accent/40 bg-accent/5 p-4">
      <Sparkles className="h-5 w-5 flex-shrink-0 text-accent" />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-semibold text-accent-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground">
          Plan actuel : <span className="font-mono uppercase">{PLAN_LABEL[currentPlan]}</span>
          {' · '}
          Requis : <span className="font-mono uppercase">{PLAN_LABEL[requiredPlan]}</span>
        </p>
      </div>
      <Link
        href="/dashboard/account?feature_locked=1"
        className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/90"
      >
        Voir les plans
      </Link>
    </div>
  );
}
