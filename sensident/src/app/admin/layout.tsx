import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-auth';
import { AdminSidebar } from './sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect('/admin-auth/login');
  if (!session.mfaVerified) redirect('/admin-auth/login/mfa');

  return (
    <div className="flex min-h-screen">
      <AdminSidebar role={session.role} />
      <main className="flex-1 bg-muted/30">{children}</main>
    </div>
  );
}
