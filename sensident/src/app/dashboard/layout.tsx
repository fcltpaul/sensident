import { redirect } from 'next/navigation';
import { getSessionFromCookie } from '@/lib/auth';
import { Sidebar } from './sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookie();

  if (!session) {
    redirect('/login');
  }
  if (!session.mfaVerified) {
    redirect('/login/mfa');
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar cabinetId={session.cabinetId} />
      <main className="flex-1 bg-background">{children}</main>
    </div>
  );
}
