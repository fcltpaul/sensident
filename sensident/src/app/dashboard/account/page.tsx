import { db } from '@/db/client';
import { practitioners, cabinets, cabinetSubscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AccountForm } from './account-form';

export default async function AccountPage() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  const prac = (await db.select().from(practitioners).where(eq(practitioners.id, session.practitionerId)).limit(1))[0];
  const cab = (await db.select().from(cabinets).where(eq(cabinets.id, session.cabinetId)).limit(1))[0];
  const sub = (await db.select().from(cabinetSubscriptions).where(eq(cabinetSubscriptions.cabinetId, session.cabinetId)).limit(1))[0];

  if (!prac || !cab) redirect('/login');

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Mon compte</h1>
        <p className="text-sm text-muted-foreground">Sécurité, informations cabinet, abonnement</p>
      </div>

      <AccountForm
        practitioner={{
          id: prac.id,
          email: prac.email,
          mfaEnabled: prac.totpEnabled,
          createdAt: prac.createdAt,
        }}
        cabinet={{
          id: cab.id,
          name: cab.name,
          slug: cab.slug,
        }}
        subscription={
          sub
            ? {
                plan: sub.plan,
                status: sub.status,
                isAmbassador: sub.isAmbassador,
                currentPeriodEnd: sub.currentPeriodEnd,
                hasStripeCustomer: !!sub.stripeCustomerId,
              }
            : null
        }
      />
    </div>
  );
}
