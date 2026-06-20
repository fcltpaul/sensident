import { redirect } from 'next/navigation';
import { getSessionFromCookie } from '@/lib/auth';
import { Sidebar } from './sidebar';
import { DashboardHeader } from './dashboard-header';
import { db } from '@/db/client';
import { practitioners, cabinets, cabinetSubscriptions } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { hasFeature } from '@/lib/features';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookie();

  if (!session) {
    redirect('/login');
  }
  if (!session.mfaVerified) {
    redirect('/login/mfa');
  }

  // Use raw SQL with ::text cast on UUID columns to bypass postgres-js UUID/text mismatch
  // (same pattern as the 14/06 fix for cabinet_id::text comparisons)
  let practitionerEmail = '';
  let cabinetSlug = '';
  let isPro = false;

  try {
    const pracRows: any = await db.execute(sql`
      SELECT email FROM practitioners WHERE id::text = ${session.practitionerId} LIMIT 1
    `);
    practitionerEmail = pracRows?.rows?.[0]?.email ?? pracRows?.[0]?.email ?? '';
  } catch (e) {
    console.error('[dashboard/layout] practitioners fetch failed', e);
  }

  try {
    const cabRows: any = await db.execute(sql`
      SELECT slug FROM cabinets WHERE id::text = ${session.cabinetId} LIMIT 1
    `);
    cabinetSlug = cabRows?.rows?.[0]?.slug ?? cabRows?.[0]?.slug ?? '';
  } catch (e) {
    console.error('[dashboard/layout] cabinets fetch failed', e);
  }

  try {
    const subRows: any = await db.execute(sql`
      SELECT plan FROM cabinet_subscriptions WHERE cabinet_id::text = ${session.cabinetId} LIMIT 1
    `);
    const plan = (subRows?.rows?.[0]?.plan ?? subRows?.[0]?.plan ?? 'free') as 'free' | 'pro' | 'cabinet';
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
