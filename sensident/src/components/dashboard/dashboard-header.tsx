'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, Link2, BarChart3, ChevronDown, LogOut } from 'lucide-react';
import { useInviteModal } from './invite-modal-context';
import { DashboardMobileNav } from './dashboard-mobile-nav';

interface MeResponse {
  practitionerName: string;
  practitionerEmail: string;
  cabinetName: string;
  cabinetSlug: string;
  initials: string;
}

export function DashboardHeader() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const invite = useInviteModal();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/practitioner/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setMe(data);
      })
      .catch(() => {
        /* silencieux : l'avatar affiche '?' si l'API échoue */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Ferme le menu avatar si clic ailleurs
  useEffect(() => {
    if (!avatarOpen) return;
    const close = () => setAvatarOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [avatarOpen]);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
      <div className="flex items-center gap-3">
        <DashboardMobileNav />
        <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
          {me?.cabinetName ?? 'Espace praticien'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* CTA primaire : Composer newsletter. Visible mobile (icone) + desktop (icone + texte) */}
        <Link
          href="/dashboard/newsletter"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-95 sm:px-3"
          aria-label="Composer une newsletter"
          title="Composer une newsletter"
        >
          <Mail className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Composer</span>
        </Link>

        {/* CTA secondaire : Inviter (ouvre modale globale). Mobile = icone, desktop = icone + texte */}
        <button
          type="button"
          onClick={() => invite.open()}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted sm:px-3"
          aria-label="Inviter un patient"
          title="Inviter un patient"
        >
          <Link2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Inviter</span>
        </button>

        {/* CTA tertiaire : Stats (scroll vers KPIs si on est sur /dashboard). Desktop uniquement (4 actions = trop en mobile) */}
        <Link
          href={pathname === '/dashboard' ? '#kpis' : '/dashboard'}
          className="hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
          aria-label="Acceder aux statistiques"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Stats
        </Link>

        {/* Avatar menu */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setAvatarOpen((v) => !v);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
            aria-label="Menu compte"
            aria-expanded={avatarOpen}
          >
            {me?.initials ?? '?'}
            <ChevronDown className="ml-1 h-3 w-3" aria-hidden="true" />
          </button>

          {avatarOpen && (
            <div
              className="absolute right-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-md border border-border bg-background shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-border p-3 text-xs">
                <p className="font-medium text-foreground">
                  {me?.practitionerName || 'Praticien'}
                </p>
                <p className="mt-0.5 truncate text-muted-foreground">
                  {me?.practitionerEmail}
                </p>
              </div>
              <Link
                href="/dashboard/account"
                onClick={() => setAvatarOpen(false)}
                className="block px-3 py-2 text-xs hover:bg-muted"
              >
                Mon compte
              </Link>
              <Link
                href="/dashboard/scheduled"
                onClick={() => setAvatarOpen(false)}
                className="block px-3 py-2 text-xs hover:bg-muted"
              >
                Prochaines newsletters
              </Link>
              <form action="/api/practitioner/logout" method="POST">
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-3 w-3" />
                  Déconnexion
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
