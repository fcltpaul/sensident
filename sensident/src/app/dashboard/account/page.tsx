import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { practitioners, cabinets, cabinetSubscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AccountForm } from './account-form';

export default async function AccountPage() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  // Fix 2026-07-07 02h : la table cabinet_subscriptions en Neon n'a PAS
  // de colonne `is_ambassador` (cf. scripts/_test-neon-schemas.mjs).
  // La query precedente crashait silencieusement cote PG et remontait
  // un 500 SSR sur /dashboard/account. On retire la colonne, on force
  // isAmbassador=false (les ambassadeurs sont identifies via le coupon
  // Stripe cote webhook, pas via une colonne dédiée a MVP).
  let prac: { id: string; email: string; totpEnabled: boolean; createdAt: Date } | null = null;
  let cab: { id: string; name: string; slug: string } | null = null;
  let sub: { plan: string; status: string; isAmbassador: boolean; currentPeriodEnd: Date | null; stripeCustomerId: string | null } | null = null;

  if (DB_DIALECT === 'postgresql') {
    const pRows = await rawSqlClient<Array<{ id: string; email: string; totp_enabled: boolean; created_at: string }>>`
      SELECT id::text AS id, email, totp_enabled, created_at
      FROM practitioners WHERE id::text = ${session.practitionerId}::text LIMIT 1
    `;
    prac = pRows[0]
      ? {
          id: pRows[0].id,
          email: pRows[0].email,
          totpEnabled: pRows[0].totp_enabled,
          createdAt: new Date(pRows[0].created_at),
        }
      : null;

    const cRows = await rawSqlClient<Array<{ id: string; name: string; slug: string }>>`
      SELECT id::text AS id, name, slug FROM cabinets WHERE id::text = ${session.cabinetId}::text LIMIT 1
    `;
    cab = cRows[0]
      ? { id: cRows[0].id, name: cRows[0].name, slug: cRows[0].slug }
      : null;

    const sRows = await rawSqlClient<Array<{ plan: string; status: string; current_period_end: string | null; stripe_customer_id: string | null }>>`
      SELECT plan, status, current_period_end, stripe_customer_id
      FROM cabinet_subscriptions
      WHERE cabinet_id::text = ${session.cabinetId}::text
      LIMIT 1
    `;
    sub = sRows[0]
      ? {
          plan: sRows[0].plan,
          status: sRows[0].status,
          isAmbassador: false, // colonne inexistante en Neon, hardcodé false
          currentPeriodEnd: sRows[0].current_period_end ? new Date(sRows[0].current_period_end) : null,
          stripeCustomerId: sRows[0].stripe_customer_id,
        }
      : null;
  } else {
    prac = (await db.select().from(practitioners).where(eq(practitioners.id, session.practitionerId)).limit(1))[0];
    cab = (await db.select().from(cabinets).where(eq(cabinets.id, session.cabinetId)).limit(1))[0];
    sub = (await db.select().from(cabinetSubscriptions).where(eq(cabinetSubscriptions.cabinetId, session.cabinetId)).limit(1))[0];
  }

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
