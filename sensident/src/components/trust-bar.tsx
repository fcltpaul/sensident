import { Shield, Lock, BadgeCheck, Ban } from 'lucide-react';

/**
 * Bandeau de réassurance (signaux de confiance).
 * Réutilisable : page d'accueil publique, landing patient d'inscription, footer dashboard.
 * Composant server (pas d'interactivité), conforme SSR.
 */
export function TrustBar({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
        <Item icon={Shield} label="HDS" />
        <Item icon={Lock} label="RGPD" />
        <Item icon={Ban} label="Sans pub" />
        <Item icon={BadgeCheck} label="Sans revente" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <Item icon={Shield} label="Hébergé HDS (données de santé)" />
        <Item icon={Lock} label="RGPD conforme" />
        <Item icon={Ban} label="Aucune publicité" />
        <Item icon={BadgeCheck} label="Aucune revente de données" />
      </div>
    </div>
  );
}

function Item({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-foreground/70" aria-hidden={true} />
      <span>{label}</span>
    </span>
  );
}