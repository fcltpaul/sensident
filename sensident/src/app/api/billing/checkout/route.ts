import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { cabinets, cabinetSubscriptions, practitioners } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { stripe, getOrCreateCustomer, AMBASSADOR_COUPON, AMBASSADOR_DURATION_MONTHS } from '@/lib/stripe';

const Schema = z.object({
  plan: z.enum(['free', 'pro', 'cabinet']),
  ambassador: z.boolean().optional().default(false),
});

const PRICE_IDS: Record<string, string> = {
  // A configurer en prod avec les vrais price_id Stripe
  free: 'price_free_xxx',
  pro: 'price_pro_xxx',
  cabinet: 'price_cabinet_xxx',
};

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Plan invalide.' }, { status: 400 });

  const cab = (await db.select().from(cabinets).where(eq(cabinets.id, session.cabinetId)).limit(1))[0];
  if (!cab) return NextResponse.json({ error: 'Cabinet introuvable.' }, { status: 404 });

  const prac = (await db.select().from(practitioners).where(eq(practitioners.id, session.practitionerId)).limit(1))[0];
  if (!prac) return NextResponse.json({ error: 'Praticien introuvable.' }, { status: 404 });

  // Si free, on desactive Stripe et on reste en free
  if (parsed.data.plan === 'free') {
    await db
      .update(cabinetSubscriptions)
      .set({ plan: 'free', status: 'active', updatedAt: new Date() })
      .where(eq(cabinetSubscriptions.cabinetId, cab.id));
    return NextResponse.json({ success: true, message: 'Plan desactive. Vous etes en Free.' });
  }

  // Creer ou recuperer le customer Stripe
  const sub = (await db.select().from(cabinetSubscriptions).where(eq(cabinetSubscriptions.cabinetId, cab.id)).limit(1))[0];
  const { customerId } = await getOrCreateCustomer({
    cabinetId: cab.id,
    email: prac.email,
    name: cab.name,
    existingCustomerId: sub?.stripeCustomerId,
  });

  await db
    .update(cabinetSubscriptions)
    .set({ stripeCustomerId: customerId, updatedAt: new Date() })
    .where(eq(cabinetSubscriptions.cabinetId, cab.id));

  // Creer une Stripe Checkout Session
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: PRICE_IDS[parsed.data.plan], quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/account?stripe_success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/account?stripe_cancelled=1`,
    metadata: { cabinet_id: cab.id, plan: parsed.data.plan },
    discounts: parsed.data.ambassador ? [{ coupon: AMBASSADOR_COUPON }] : undefined,
  });

  return NextResponse.json({ success: true, url: checkoutSession.url });
}
