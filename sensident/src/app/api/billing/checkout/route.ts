/**
 * POST /api/billing/checkout
 *
 * 2026-07-07 14h (Tartrinator) — Demande Paul : un seul plan, gratuit pour
 * tous les utilisateurs pendant la phase beta. La facturation Stripe est
 * desactivee pour l'instant. Cette route renvoie 410 GONE pour eviter
 * tout appel client (defense en profondeur : le composant Subscription
 * n'a plus de bouton Stripe, mais si quelqu'un appelle quand meme l'API
 * on renvoie une erreur claire plutot que de se connecter a Stripe).
 *
 * Le code de l'ancien checkout est conserve en commentaire en reference ;
 * a reintroduire le jour ou un plan payant unique est active (avec un
 * seul price_id Stripe et un seul plan enumere).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/auth';

export async function POST(_req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }
  return NextResponse.json(
    {
      error:
        'La facturation est desactivee pendant la phase beta. Acces gratuit pour tous les praticiens.',
    },
    { status: 410 },
  );
}

/*
 * Ancien code checkout (consulte en reference, a reactiver quand le plan
 * payant unique sera mis en service) :
 *
 * import { db } from '@/db/client';
 * import { cabinets, cabinetSubscriptions, practitioners } from '@/db/schema';
 * import { eq } from 'drizzle-orm';
 * import { z } from 'zod';
 * import { stripe, getOrCreateCustomer, ... } from '@/lib/stripe';
 *
 * const Schema = z.object({ plan: z.enum(['pro']), ambassador: z.boolean().optional() });
 * const PRICE_ID = process.env.STRIPE_PRICE_ID!;
 *
 * export async function POST(req: NextRequest) {
 *   const session = await getSessionFromCookie();
 *   if (!session || !session.mfaVerified) return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
 *   const parsed = Schema.safeParse(await req.json().catch(() => null));
 *   if (!parsed.success) return NextResponse.json({ error: 'Plan invalide.' }, { status: 400 });
 *   const cab = (await db.select().from(cabinets).where(eq(cabinets.id, session.cabinetId)).limit(1))[0];
 *   if (!cab) return NextResponse.json({ error: 'Cabinet introuvable.' }, { status: 404 });
 *   const prac = (await db.select().from(practitioners).where(eq(practitioners.id, session.practitionerId)).limit(1))[0];
 *   if (!prac) return NextResponse.json({ error: 'Praticien introuvable.' }, { status: 404 });
 *   const sub = (await db.select().from(cabinetSubscriptions).where(eq(cabinetSubscriptions.cabinetId, cab.id)).limit(1))[0];
 *   const { customerId } = await getOrCreateCustomer({
 *     cabinetId: cab.id, email: prac.email, name: cab.name,
 *     existingCustomerId: sub?.stripeCustomerId,
 *   });
 *   await db.update(cabinetSubscriptions)
 *     .set({ stripeCustomerId: customerId, updatedAt: new Date() })
 *     .where(eq(cabinetSubscriptions.cabinetId, cab.id));
 *   const checkoutSession = await stripe.checkout.sessions.create({
 *     customer: customerId, mode: 'subscription',
 *     payment_method_types: ['card'],
 *     line_items: [{ price: PRICE_ID, quantity: 1 }],
 *     success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/account?stripe_success=1`,
 *     cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/account?stripe_cancelled=1`,
 *     metadata: { cabinet_id: cab.id, plan: parsed.data.plan },
 *   });
 *   return NextResponse.json({ success: true, url: checkoutSession.url });
 * }
 */
