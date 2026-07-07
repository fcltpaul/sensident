/**
 * POST /api/stripe/webhook
 *
 * 2026-07-07 14h (Tartrinator) — Demande Paul : pas de facturation pendant
 * la phase beta. Stripe n'envoie plus de webhook sur la prod, et l'ancien
 * code de synchronisation cabinetSubscriptions est conserve en commentaire
 * en reference. La route renvoie 503 Service Unavailable pour eviter
 * toute side effect si jamais Stripe envoie encore un webhook.
 *
 * A reactiver quand le plan payant unique sera lance (avec un seul
 * price_id et un seul plan enumere).
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      received: false,
      message:
        'Stripe desactive pendant la phase beta (acces gratuit pour tous les praticiens).',
    },
    { status: 503 },
  );
}

/*
 * Ancien code webhook (reference, a reactiver quand la facturation revient) :
 *
 * import { verifyWebhookSignature, AMBASSADOR_COUPON } from '@/lib/stripe';
 * import { db } from '@/db/client';
 * import { cabinetSubscriptions, auditLogs } from '@/db/schema';
 * import { eq } from 'drizzle-orm';
 * import type Stripe from 'stripe';
 *
 * const PLAN_BY_PRICE: Record<string, 'pro'> = {
 *   [process.env.STRIPE_PRICE_ID!]: 'pro',
 * };
 *
 * export async function POST(req: NextRequest) {
 *   const sig = req.headers.get('stripe-signature');
 *   if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 });
 *   const body = await req.text();
 *   let event: Stripe.Event;
 *   try { event = verifyWebhookSignature(body, sig); }
 *   catch { return NextResponse.json({ error: 'Invalid signature' }, { status: 400 }); }
 *   switch (event.type) {
 *     case 'customer.subscription.created':
 *     case 'customer.subscription.updated': { ... await syncSubscription(...); break; }
 *     case 'customer.subscription.deleted': { ... }
 *     case 'invoice.payment_failed': { ... }
 *   }
 *   await db.insert(auditLogs).values({
 *     actorType: 'system',
 *     action: `stripe_webhook_${event.type}`,
 *     metadata: { eventId: event.id } as any,
 *   });
 *   return NextResponse.json({ received: true });
 * }
 */
