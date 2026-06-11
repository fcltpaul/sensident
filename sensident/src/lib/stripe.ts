/**
 * Sensident — Stripe client + plan features
 *
 * Pas de pricing affiche dans le MVP (decision post-MVP Paul).
 * Mais l'infra billing est en place : 3 plans, webhooks, coupon ambassadeur.
 *
 * No-AI : Stripe = pas d'IA, OK.
 */
import Stripe from 'stripe';

const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';

export const stripe = new Stripe(stripeKey, {
  apiVersion: '2024-06-20',
  typescript: true,
});

export const PLAN_FEATURES = {
  free: {
    name: 'Free',
    maxPatients: 100,
    newslettersPerMonth: 1,
    templates: ['moderne'],
    analytics: 'basic',
    engagement: false,
    support: 'community',
  },
  pro: {
    name: 'Pro',
    maxPatients: 1000,
    newslettersPerMonth: 4,
    templates: 'all',
    analytics: 'full',
    engagement: true,
    support: 'email',
  },
  cabinet: {
    name: 'Cabinet',
    maxPatients: 10000,
    newslettersPerMonth: 99,
    templates: 'all',
    analytics: 'full',
    engagement: true,
    support: 'priority',
  },
} as const;

export type PlanCode = keyof typeof PLAN_FEATURES;

export const AMBASSADOR_COUPON = 'AMBASSADOR_2026';  // 100% off 6 mois
export const AMBASSADOR_DURATION_MONTHS = 6;

export function hasFeature(plan: PlanCode | string, feature: keyof typeof PLAN_FEATURES.free): boolean {
  const features = PLAN_FEATURES[plan as PlanCode] ?? PLAN_FEATURES.free;
  if (feature === 'templates') return features.templates === 'all';
  if (feature === 'analytics') return features.analytics === 'full';
  if (feature === 'engagement') return features.engagement === true;
  if (feature === 'support') return features.support !== 'community';
  if (feature === 'maxPatients') return (features.maxPatients as number) > 0;
  if (feature === 'newslettersPerMonth') return (features.newslettersPerMonth as number) > 0;
  return false;
}

/**
 * Cree un Stripe Customer et l'associe au cabinet.
 * Idempotent : si deja cree, reutilise.
 */
export async function getOrCreateCustomer(params: {
  cabinetId: string;
  email: string;
  name?: string;
  existingCustomerId?: string | null;
}): Promise<{ customerId: string }> {
  if (params.existingCustomerId) {
    return { customerId: params.existingCustomerId };
  }
  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: { cabinet_id: params.cabinetId },
  });
  return { customerId: customer.id };
}

/**
 * Cree un abonnement Stripe pour un cabinet.
 * Si ambassador = true, applique le coupon AMBASSADOR_2026 (100% off 6 mois).
 */
export async function createSubscription(params: {
  customerId: string;
  priceId: string;
  ambassador?: boolean;
}): Promise<{ subscriptionId: string; status: string }> {
  const sub = await stripe.subscriptions.create({
    customer: params.customerId,
    items: [{ price: params.priceId }],
    coupon: params.ambassador ? AMBASSADOR_COUPON : undefined,
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });
  return {
    subscriptionId: sub.id,
    status: sub.status,
  };
}

export function verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET non configure');
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
