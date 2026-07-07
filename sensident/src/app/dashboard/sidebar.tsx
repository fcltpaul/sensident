'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ComponentType } from 'react';
import {
  LayoutDashboard,
  History,
  BarChart3,
  Users,
  Settings,
  Link2,
  BookOpen,
  CalendarClock,
} from 'lucide-react';
import { Logo } from '@/components/logo';

type TabDef = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
  /** clé dans l'objet badges ; si absent → pas de badge */
  badgeKey?: 'scheduledNewsletters';
  /**
   * Active l'onglet sur un sous-ensemble de paths : utile quand un onglet est
   * atteint via query params (ex: ?article=X -> on reste sur "Bibliothèque"
   * même si l'URL est /dashboard/newsletter).
   */
  match?: (pathname: string, params: URLSearchParams) => boolean;
};

const TABS: TabDef[] = [
  { href: '/dashboard', label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  {
    href: '/dashboard/library',
    label: 'Bibliothèque',
    icon: BookOpen,
    // 2026-07-07 12h54 : Bibliotheque reste active aussi sur
    // /dashboard/newsletter/compose?article=X (le composer lance depuis
    // la bibliotheque est conceptuellement dans la bibliotheque).
    match: (pathname, params) => {
      if (pathname === '/dashboard/library' || pathname.startsWith('/dashboard/library/')) return true;
      if (pathname === '/dashboard/newsletter/compose') {
        return params.has('article') || params.has('draftId');
      }
      return false;
    },
  },
  { href: '/dashboard/scheduled', label: 'Prochaines newsletters', icon: CalendarClock, badgeKey: 'scheduledNewsletters' },
  {
    href: '/dashboard/newsletter',
    label: 'Historique',
    icon: History,
    // 2026-07-07 12h54 : la page /dashboard/newsletter est desormais
    // l'historique uniquement. Le composer est sur
    // /dashboard/newsletter/compose (avec ou sans ?article=X/?draftId=Y).
    // On n'active "Historique" que sur /dashboard/newsletter sans
    // sous-route (i.e. pas /compose, pas /drafts).
    match: (pathname, params) => {
      if (pathname !== '/dashboard/newsletter') return false;
      return !params.has('article') && !params.has('draftId');
    },
  },
  { href: '/dashboard/invitation', label: 'Invitations', icon: Link2 },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/engagement', label: 'Engagement', icon: Users },
  { href: '/dashboard/account', label: 'Mon compte', icon: Settings },
];

interface DashboardBadges {
  scheduledNewsletters?: number;
}

export function Sidebar({ cabinetId: _ }: { cabinetId: string }) {
  const pathname = usePathname();
  // Lecture directe de window.location.search pour avoir les query params
  // dès le premier render client. useSearchParams() dans <Suspense> peut
  // retourner null pendant l'hydratation, ce qui fausse l'active state.
  // 2026-07-07 : correction bug "Historique actif en mode composer".
  const [search, setSearch] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.location.search;
  });

  useEffect(() => {
    // Synchronise avec l'URL si Next.js change les query params (router push).
    setSearch(window.location.search);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/practitioner/dashboard-stats', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setBadges(data);
      })
      .catch(() => {
        /* silencieux : badges vides, la sidebar reste fonctionnelle */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const params = new URLSearchParams(search);

  const [badges, setBadges] = useState<DashboardBadges>({});

  return (
    <aside className="hidden w-60 border-r border-border bg-muted/30 md:flex md:flex-col">
      <div className="border-b border-border p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size="sm" showText={true} />
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">Espace praticien</p>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.match
            ? tab.match(pathname, params)
            : tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          const badgeValue = tab.badgeKey ? badges[tab.badgeKey] : undefined;
          const showBadge = typeof badgeValue === 'number' && badgeValue > 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{tab.label}</span>
              {showBadge && (
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${
                    active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'
                  }`}
                  aria-label={`${badgeValue} en attente`}
                >
                  {badgeValue! > 99 ? '99+' : badgeValue}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <p className="px-3 text-[10px] text-muted-foreground">v2 · Pré-MVP</p>
      </div>
    </aside>
  );
}