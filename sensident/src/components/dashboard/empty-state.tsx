import Link from 'next/link';
import { type LucideIcon } from 'lucide-react';

interface CtaAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  primary?: CtaAction;
  secondary?: CtaAction;
  hint?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primary,
  secondary,
  hint,
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>

      {(primary || secondary) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {primary && (
            <PrimaryCta {...primary} />
          )}
          {secondary && (
            <SecondaryCta {...secondary} />
          )}
        </div>
      )}

      {hint && (
        <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function PrimaryCta({ label, href, onClick }: CtaAction) {
  const className =
    'inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-95';
  if (href) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {label}
    </button>
  );
}

function SecondaryCta({ label, href, onClick }: CtaAction) {
  const className =
    'inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted';
  if (href) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {label}
    </button>
  );
}