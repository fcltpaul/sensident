'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ComponentType } from 'react';
import {
  LayoutDashboard,
  Mail,
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
};

const TABS: TabDef[] = [
  { href: '/dashboard', label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  { href: '/dashboard/newsletter', label: 'Newsletter', icon: Mail },
  { href: '/dashboard/scheduled', label: 'Prochaines newsletters', icon: CalendarClock, badgeKey: 'scheduledNewsletters' },
  { href: '/dashboard/invitation', label: 'Invitations', icon: Link2 },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/engagement', label: 'Engagement', icon: Users },
  { href: '/dashboard/library', label: 'Bibliothèque', icon: BookOpen },
  { href: '/dashboard/account', label: 'Mon compte', icon: Settings },
];

interface DashboardBadges {
  scheduledNewsletters?: number;
}

export function Sidebar({ cabinetId: _ }: { cabinetId: string }) {
  const pathname = usePathname();
  const [badges, setBadges] = useState<DashboardBadges>({});

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
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
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
