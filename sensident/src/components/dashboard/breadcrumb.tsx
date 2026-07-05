'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Tableau de bord',
  newsletter: 'Newsletter',
  scheduled: 'Prochaines newsletters',
  compose: 'Composer',
  invitation: 'Invitations',
  analytics: 'Analytics',
  engagement: 'Engagement',
  library: 'Bibliothèque',
  contact: 'Contact',
  account: 'Mon compte',
  'mon-compte': 'Mon compte',
  onboarding: 'Configuration',
};

function humanize(segment: string) {
  if (ROUTE_LABELS[segment]) return ROUTE_LABELS[segment]!;
  // Décode segments URL-friendly
  return segment.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter((s) => s.length > 0);

  // Crumbs sous /dashboard/*
  const isDashboard = segments[0] === 'dashboard';
  if (!isDashboard) return null;

  const crumbs = segments.slice(1).map((seg, idx) => ({
    label: humanize(seg),
    href: '/' + ['dashboard', ...segments.slice(1, idx + 1)].join('/'),
    isLast: idx === segments.length - 2,
  }));

  return (
    <nav
      aria-label="Fil d'ariane"
      className="flex items-center gap-1.5 border-b border-border bg-muted/20 px-4 py-2 text-xs text-muted-foreground md:px-6"
    >
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-foreground"
        aria-label="Tableau de bord"
      >
        <Home className="h-3 w-3" />
        Tableau de bord
      </Link>
      {crumbs.length > 0 && <ChevronRight className="h-3 w-3 opacity-50" aria-hidden="true" />}
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3 w-3 opacity-50" aria-hidden="true" />}
          {c.isLast ? (
            <span className="font-medium text-foreground">{c.label}</span>
          ) : (
            <Link href={c.href} className="hover:text-foreground">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
