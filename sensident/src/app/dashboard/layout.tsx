import { redirect } from 'next/navigation';
import { getSessionFromCookie } from '@/lib/auth';
import { Sidebar } from './sidebar';
import { DashboardHeader } from './dashboard-header';
import { db } from '@/db/client';
import { practitioners, cabinets, cabinetSubscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hasFeature } from '@/lib/features';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookie();

  if (!session) {
    redirect('/login');
  }
  if (!session.mfaVerified) {
    redirect('/login/mfa');
  }

  // Defensive fetch — never crash the layout for missing optional data
  let practitionerEmail = '';
  let cabinetSlug = '';
  let isPro = false;

  try {
    const [prac] = await db
      .select({ email: practitioners.email })
      .from(practitioners)
      .where(eq(practitioners.id, session.practitionerId))
      .limit(1);
    practitionerEmail = prac?.email ?? '';
  } catch (e) {
    console.error('[dashboard/layout] practitioners fetch failed', e);
  }

  try {
    const [cab] = await db
      .select({ slug: cabinets.slug })
      .from(cabinets)
      .where(eq(cabinets.id, session.cabinetId))
      .limit(1);
    cabinetSlug = cab?.slug ?? '';
  } catch (e) {
    console.error('[dashboard/layout] cabinets fetch failed', e);
  }

  try {
    const [sub] = await db
      .select({ plan: cabinetSubscriptions.plan })
      .from(cabinetSubscriptions)
      .where(eq(cabinetSubscriptions.cabinetId, session.cabinetId))
      .limit(1);
    const plan = (sub?.plan as 'free' | 'pro' | 'cabinet') || 'free';
    isPro = hasFeature(plan, 'engagement') || hasFeature(plan, 'analytics');
  } catch (e) {
    console.error('[dashboard/layout] subscriptions fetch failed', e);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar cabinetId={session.cabinetId} isPro={isPro} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          practitionerEmail={practitionerEmail}
          cabinetSlug={cabinetSlug}
        />
        <main className="flex-1 bg-background">{children}</main>
      </div>
    </div>
  );
}
