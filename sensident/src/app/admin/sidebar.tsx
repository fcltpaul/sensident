'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/logo';
import { FileText, Shield, Users, BarChart3, Settings, LogOut, Layers, TrendingUp } from 'lucide-react';

const TABS = [
  { href: '/admin', label: 'Tableau de bord', icon: BarChart3, exact: true },
  { href: '/admin/stats', label: 'Statistiques', icon: TrendingUp },
  { href: '/admin/articles', label: 'Articles', icon: FileText },
  { href: '/admin/categories', label: 'Catégories', icon: Layers },
  { href: '/admin/cabinets', label: 'Cabinets', icon: Users },
  { href: '/admin/audit', label: 'Audit logs', icon: Shield },
  { href: '/admin/settings', label: 'Paramètres', icon: Settings },
];

export function AdminSidebar({ role }: { role: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 border-r border-border bg-background md:flex md:flex-col">
      <div className="border-b border-border p-4">
        <Link href="/admin" className="flex items-center gap-2">
          <Logo size="sm" showText={true} />
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">Admin · {role}</p>
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
                active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <form action="/api/admin/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </form>
      </div>
    </aside>
  );
}
