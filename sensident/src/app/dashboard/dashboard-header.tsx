'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Plus, UserPlus, Settings, FileText, LogOut, ChevronDown } from 'lucide-react';

interface DashboardHeaderProps {
  practitionerEmail: string;
  cabinetSlug: string;
}

export function DashboardHeader({ practitionerEmail, cabinetSlug }: DashboardHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Close menu on nav
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const initial = (practitionerEmail || '?').charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
      {/* Mobile logo (sidebar is hidden on mobile) */}
      <div className="md:hidden">
        <Link href="/dashboard" className="text-sm font-bold">
          Sensident
        </Link>
      </div>

      {/* Quick actions (desktop) */}
      <div className="hidden items-center gap-2 md:flex">
        <Link
          href="/dashboard/newsletter"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nouvelle newsletter
        </Link>
        <Link
          href={`/c/${cabinetSlug}/rejoindre`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          <UserPlus className="h-4 w-4" />
          Inviter un patient
        </Link>
      </div>

      {/* Mobile quick actions (compact) */}
      <div className="flex items-center gap-2 md:hidden">
        <Link
          href="/dashboard/newsletter"
          aria-label="Nouvelle newsletter"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
        </Link>
      </div>

      {/* Avatar menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-2 text-sm font-medium transition hover:bg-muted"
          aria-label="Menu compte"
          aria-expanded={menuOpen}
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {initial}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-11 z-30 w-56 overflow-hidden rounded-lg border border-border bg-background shadow-lg">
            <div className="border-b border-border px-3 py-2.5">
              <p className="truncate text-xs text-muted-foreground">{practitionerEmail}</p>
            </div>
            <div className="py-1">
              <Link
                href="/dashboard/account"
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                Mon compte
              </Link>
              <Link
                href="/dashboard/account/contrat"
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                Mon contrat
              </Link>
            </div>
            <div className="border-t border-border py-1">
              <form action="/api/practitioner/logout" method="POST">
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
