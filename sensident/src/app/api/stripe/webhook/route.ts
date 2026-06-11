import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { cabinetSubscriptions, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyWebhookSignature, PLAN_FEATURES, AMBASSADOR_COUPON } from '@/lib/stripe';
import type Stripe from 'stripe';

const PLAN_BY_PRICE: Record<string, 'free' | 'pro' | 'cabinet'> = {
  // Map price_id → plan. A configurer en prod avec les vrais price_id Stripe.
  'price_free_xxx': 'free',
  'price_pro_xxx': 'pro',
  'price_cabinet_xxx': 'cabinet',
};

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = verifyWebhookSignature(body, sig);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      await syncSubscription(sub);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await db
        .update(cabinetSubscriptions)
        .set({ status: 'canceled', updatedAt: new Date() })
        .where(eq(cabinetSubscriptions.stripeSubscriptionId, sub.id));
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = (invoice as any).subscription;
      if (subId) {
        await db
          .update(cabinetSubscriptions)
          .set({ status: 'past_due', updatedAt: new Date() })
          .where(eq(cabinetSubscriptions.stripeSubscriptionId, subId));
      }
      break;
    }
  }

  await db.insert(auditLogs).values({
    actorType: 'system',
    action: `stripe_webhook_${event.type}`,
    metadata: { eventId: event.id } as any,
  });

  return NextResponse.json({ received: true });
}

async function syncSubscription(sub: Stripe.Subscription) {
  const cabinetId = (sub.metadata?.cabinet_id as string) || null;
  if (!cabinetId) return;

  // Determine plan from price
  const priceId = sub.items.data[0]?.price.id;
  const plan = PLAN_BY_PRICE[priceId] ?? 'free';
  const isAmbassador = !!sub.discount?.coupon?.id && sub.discount.coupon.id === AMBASSADOR_COUPON;

  await db
    .update(cabinetSubscriptions)
    .set({
      stripeSubscriptionId: sub.id,
      stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      plan,
      status: sub.status as any,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      isAmbassador,
      updatedAt: new Date(),
    })
    .where(eq(cabinetSubscriptions.cabinetId, cabinetId));
}
