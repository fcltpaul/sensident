'use client';

import { useEffect, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  History,
  BarChart3,
  Users,
  Settings,
  Link2,
  BookOpen,
  CalendarClock,
  Menu,
  X,
} from 'lucide-react';
import { Logo } from '@/components/logo';

type TabDef = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
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
    // /dashboard/newsletter/compose?article=X.
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
    // 2026-07-07 12h54 : Historique ne s'active que sur
    // /dashboard/newsletter (pas /compose, pas /drafts).
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

export function DashboardMobileNav() {
  const pathname = usePathname();
  // Lecture directe de window.location.search (cf. sidebar desktop).
  const [search, setSearch] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.location.search;
  });
  const [open, setOpen] = useState(false);
  const [badges, setBadges] = useState<{ scheduledNewsletters?: number }>({});

  useEffect(() => {
    setSearch(window.location.search);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/practitioner/dashboard-stats', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setBadges(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Ferme le drawer sur changement de route
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Verrouillage du scroll quand le drawer est ouvert
  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [open]);

  // Fermeture sur ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const params = new URLSearchParams(search);

  return (
    <>
      {/* Bouton hamburger — visible <md uniquement */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted md:hidden"
        aria-label="Ouvrir la navigation"
        title="Ouvrir la navigation"
      >
        <Menu className="h-4 w-4" aria-hidden={true} />
      </button>

      {/* Overlay + drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden={true}
          />
          <aside
            className="fixed inset-y-0 left-0 z-40 flex h-screen w-72 max-w-[85%] flex-col border-r border-border bg-background shadow-xl md:hidden"
            aria-label="Navigation praticien"
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setOpen(false)}>
                <Logo size="sm" showText={true} />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Fermer la navigation"
              >
                <X className="h-4 w-4" aria-hidden={true} />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
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
                          active
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {badgeValue! > 99 ? '99+' : badgeValue}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-border p-3 text-[10px] text-muted-foreground">
              Sensident v2 · Pré-MVP
            </div>
          </aside>
        </>
      )}
    </>
  );
}