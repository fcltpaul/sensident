'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Mail,
  BarChart3,
  Users,
  BookOpen,
} from 'lucide-react';
import { Logo } from '@/components/logo';

type NavGroup = {
  title?: string;
  items: { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: '/dashboard', label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: 'Envoyer',
    items: [
      { href: '/dashboard/library', label: 'Bibliothèque', icon: BookOpen },
      { href: '/dashboard/newsletter', label: 'Composer une newsletter', icon: Mail },
    ],
  },
  {
    title: 'Mesurer',
    items: [
      { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
];

const PRO_ONLY_ITEMS = [
  { href: '/dashboard/engagement', label: 'Engagement', icon: Users },
];

export function Sidebar({ cabinetId, isPro }: { cabinetId: string; isPro: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-muted/30 md:flex md:flex-col">
      <div className="border-b border-border p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size="sm" showText={true} />
        </Link>
        <p className="mt-1.5 text-xs text-muted-foreground">Espace praticien</p>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className="space-y-1">
            {group.title && (
              <p className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}

        {isPro && (
          <div className="space-y-1">
            <p className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Mesurer
            </p>
            {PRO_ONLY_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}
