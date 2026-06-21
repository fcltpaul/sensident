'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Mail,
  BarChart3,
  Users,
  Contact,
  Settings,
  LogOut,
  Link2,
  BookOpen,
  CalendarClock,
} from 'lucide-react';
import { Logo } from '@/components/logo';

const TABS = [
  { href: '/dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/newsletter', label: 'Newsletter', icon: Mail },
  { href: '/dashboard/scheduled', label: 'Prochaines newsletters', icon: CalendarClock },
  { href: '/dashboard/invitation', label: 'Invitations', icon: Link2 },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/engagement', label: 'Engagement', icon: Users },
  { href: '/dashboard/library', label: 'Bibliotheque', icon: BookOpen },
  { href: '/dashboard/contact', label: 'Contact', icon: Contact },
  { href: '/dashboard/account', label: 'Mon compte', icon: Settings },
];

export function Sidebar({ cabinetId: _ }: { cabinetId: string }) {
  const pathname = usePathname();

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
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <form action="/api/practitioner/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Deconnexion
          </button>
        </form>
      </div>
    </aside>
  );
}
