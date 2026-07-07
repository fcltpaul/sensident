import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { practitioners, cabinets, cabinetSubscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AccountForm } from './account-form';
import type { NewsletterCadence } from '@/db/schema';
import type { NewsletterBranding } from '@/lib/newsletter-branding-types';

export const dynamic = 'force-dynamic';

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
  let cab: {
    id: string;
    name: string;
    slug: string;
    rpps: string | null;
    contactAddress: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    contactRdvUrl: string | null;
    contactOpeningHours: Record<string, string> | null;
    contactFacadePhotoUrl: string | null;
    contactOncdMention: boolean;
    contactMapUrl: string | null;
    newsletterBranding: NewsletterBranding;
    newsletterCadence: NewsletterCadence | null;
  } | null = null;
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

    // Cabinet complet : nom + slug + bloc contact + branding + cadence.
    // 2026-07-07 : le bloc contact a ete deplace depuis /dashboard/contact
    // (route supprimee de la sidebar) vers /dashboard/account, on charge
    // donc tout d'un coup ici.
    const cRows = await rawSqlClient<Array<{
      id: string;
      name: string;
      slug: string;
      rpps: string | null;
      contact_address: string | null;
      contact_phone: string | null;
      contact_email: string | null;
      contact_rdv_url: string | null;
      contact_opening_hours: unknown;
      contact_facade_photo_url: string | null;
      contact_oncd_mention: boolean;
      contact_map_url: string | null;
      newsletter_branding: unknown;
      newsletter_cadence: unknown;
    }>>`
      SELECT
        id::text AS id,
        name,
        slug,
        rpps,
        contact_address,
        contact_phone,
        contact_email,
        contact_rdv_url,
        contact_opening_hours,
        contact_facade_photo_url,
        contact_oncd_mention,
        contact_map_url,
        newsletter_branding,
        newsletter_cadence
      FROM cabinets WHERE id::text = ${session.cabinetId}::text LIMIT 1
    `;
    const r = cRows[0];
    cab = r
      ? {
          id: r.id,
          name: r.name,
          slug: r.slug,
          rpps: r.rpps,
          contactAddress: r.contact_address,
          contactPhone: r.contact_phone,
          contactEmail: r.contact_email,
          contactRdvUrl: r.contact_rdv_url,
          contactOpeningHours: (r.contact_opening_hours as Record<string, string> | null) ?? null,
          contactFacadePhotoUrl: r.contact_facade_photo_url,
          contactOncdMention: r.contact_oncd_mention,
          contactMapUrl: r.contact_map_url,
          newsletterBranding: (r.newsletter_branding as NewsletterBranding) ?? { showLogo: false },
          newsletterCadence: (r.newsletter_cadence as NewsletterCadence | null) ?? null,
        }
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
    const rawCab = (await db.select().from(cabinets).where(eq(cabinets.id, session.cabinetId)).limit(1))[0];
    cab = rawCab
      ? {
          id: rawCab.id,
          name: rawCab.name,
          slug: rawCab.slug,
          rpps: rawCab.rpps ?? null,
          contactAddress: rawCab.contactAddress ?? null,
          contactPhone: rawCab.contactPhone ?? null,
          contactEmail: rawCab.contactEmail ?? null,
          contactRdvUrl: rawCab.contactRdvUrl ?? null,
          contactOpeningHours: (rawCab as any).contactOpeningHours ?? null,
          contactFacadePhotoUrl: (rawCab as any).contactFacadePhotoUrl ?? null,
          contactOncdMention: (rawCab as any).contactOncdMention ?? false,
          contactMapUrl: (rawCab as any).contactMapUrl ?? null,
          newsletterBranding: parseBrandingSqlite(rawCab.newsletterBranding),
          newsletterCadence: parseCadenceSqlite((rawCab as any).newsletterCadence),
        }
      : null;
    sub = (await db.select().from(cabinetSubscriptions).where(eq(cabinetSubscriptions.cabinetId, session.cabinetId)).limit(1))[0];
  }

  if (!prac || !cab) redirect('/login');

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Mon compte</h1>
        <p className="text-sm text-muted-foreground">Sécurité, informations cabinet, contact, branding newsletter, abonnement</p>
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
          rpps: cab.rpps,
          contactAddress: cab.contactAddress,
          contactPhone: cab.contactPhone,
          contactEmail: cab.contactEmail,
          contactRdvUrl: cab.contactRdvUrl,
          contactOpeningHours: cab.contactOpeningHours,
          contactFacadePhotoUrl: cab.contactFacadePhotoUrl,
          contactOncdMention: cab.contactOncdMention,
          contactMapUrl: cab.contactMapUrl,
        }}
        branding={cab.newsletterBranding}
        cadence={cab.newsletterCadence}
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

function parseBrandingSqlite(raw: unknown): NewsletterBranding {
  if (typeof raw !== 'string') return { showLogo: false };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as NewsletterBranding;
  } catch { /* noop */ }
  return { showLogo: false };
}

function parseCadenceSqlite(raw: unknown): NewsletterCadence | null {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.frequency === 'string') {
      return parsed as NewsletterCadence;
    }
  } catch { /* noop */ }
  return null;
}
