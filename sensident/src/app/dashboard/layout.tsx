import { redirect } from 'next/navigation';
import { getSessionFromCookie } from '@/lib/auth';
import { Sidebar } from './sidebar';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Breadcrumb } from '@/components/dashboard/breadcrumb';
import { InviteModalProvider } from '@/components/dashboard/invite-modal-context';
import { InviteModal } from '@/components/dashboard/invite-modal';

/**
 * Layout praticien.
 *
 * ⚠️ Contrainte stricte : AUCUNE query DB ici.
 * Toutes les données header/badges viennent des API client (fetch au mount)
 * Cf. crash du 20/06 — requêtes DB dans le layout → 500 SSR.
 *
 * Tout ce qui dépend des données praticien/cabinet :
 *  - Header : fetch /api/practitioner/me (composant client)
 *  - Sidebar badges : fetch /api/practitioner/dashboard-stats (composant client)
 *  - Modale invitation : fetch /api/practitioner/me + /api/cabinet/invite-tokens (au mount, lazy)
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookie();

  if (!session) {
    redirect('/login');
  }
  if (!session.mfaVerified) {
    redirect('/login/mfa');
  }

  return (
    <InviteModalProvider>
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <div className="flex flex-1">
          <Sidebar cabinetId={session.cabinetId} />
          <main className="flex-1 bg-background">
            <Breadcrumb />
            {children}
          </main>
        </div>
        <InviteModal />
      </div>
    </InviteModalProvider>
  );
}
