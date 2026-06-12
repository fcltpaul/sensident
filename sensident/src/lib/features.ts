/**
 * Sensident — Feature flags par tier
 *
 * Centralise les checks de plan pour les features gated (free/pro/cabinet).
 *
 * Usage serveur (API routes, server components) :
 *   import { getCabinetPlan, enforceFeature, countNewslettersThisMonth } from '@/lib/features';
 *   const plan = await getCabinetPlan(cabinetId);
 *   await enforceFeature(cabinetId, 'analytics'); // throw 403 si pas le droit
 *
 * Usage client (UI) :
 *   import { hasFeature, getRemainingQuota } from '@/lib/features';
 *   if (!hasFeature(plan, 'engagement')) showUpgradeBanner();
 *
 * Source de verite : PLAN_FEATURES dans lib/stripe.ts
 * Source de plan par cabinet : cabinet_subscriptions.plan
 *
 * HDS : les checks ne lisent que cabinet_subscriptions, pas de PII patient.
 * Le compteur de newsletters/mois est agrege (count), pas de liste de sends.
 */

import { db } from '@/db/client';
import { cabinetSubscriptions, patientConsents, newsletterSends } from '@/db/schema';
import { and, eq, gte, sql } from 'drizzle-orm';
import { hasFeature, PLAN_FEATURES, type PlanCode } from '@/lib/stripe';

export type Tier = PlanCode;
export type FeatureKey = keyof typeof PLAN_FEATURES.free;

/**
 * Recupere le plan actuel d'un cabinet. Defaut 'free' si pas de row.
 */
export async function getCabinetPlan(cabinetId: string): Promise<Tier> {
  const row = (await db
    .select({ plan: cabinetSubscriptions.plan })
    .from(cabinetSubscriptions)
    .where(eq(cabinetSubscriptions.cabinetId, cabinetId))
    .limit(1))[0];
  return (row?.plan as Tier) || 'free';
}

/**
 * Verifie qu'un cabinet a acces a une feature. Throw une erreur sinon.
 * Usage serveur uniquement (le retour est un objet Error serializable).
 */
export class FeatureDeniedError extends Error {
  status = 403;
  constructor(
    public feature: FeatureKey,
    public currentPlan: Tier,
    public requiredPlan: Tier,
  ) {
    super(`Feature '${feature}' non disponible pour le plan '${currentPlan}'. Requis : '${requiredPlan}' ou plus.`);
  }
}

const TIER_ORDER: Record<Tier, number> = { free: 0, pro: 1, cabinet: 2 };

export async function enforceFeature(cabinetId: string, feature: FeatureKey): Promise<Tier> {
  const plan = await getCabinetPlan(cabinetId);
  if (!hasFeature(plan, feature)) {
    const required = feature === 'maxPatients' ? 'cabinet'
      : feature === 'newslettersPerMonth' ? 'pro'
      : feature === 'engagement' ? 'pro'
      : feature === 'analytics' ? 'pro'
      : feature === 'templates' ? 'pro'
      : feature === 'support' ? 'pro'
      : 'cabinet';
    throw new FeatureDeniedError(feature, plan, required as Tier);
  }
  return plan;
}

/**
 * Compte le nombre de patients opt-in actifs d'un cabinet (= patients
 * inscrits via le flow du praticien). Utilise pour enforce maxPatients.
 */
export async function countActivePatients(cabinetId: string): Promise<number> {
  const r = await db
    .select({ c: sql<number>`COUNT(*)` })
    .from(patientConsents)
    .where(
      and(
        eq(patientConsents.cabinetId, cabinetId),
        eq(patientConsents.cguAccepted, true),
        sql`${patientConsents.unsubscribedAt} IS NULL`
      )
    );
  return Number(r[0]?.c || 0);
}

/**
 * Compte le nombre de newsletters ENVOYEES ce mois-ci pour un cabinet.
 * C'est le compteur de quota 'newslettersPerMonth'.
 */
export async function countNewslettersThisMonth(cabinetId: string): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const r = await db
    .select({ c: sql<number>`COUNT(*)` })
    .from(newsletterSends)
    .where(
      and(
        eq(newsletterSends.cabinetId, cabinetId),
        gte(newsletterSends.sentAt, startOfMonth)
      )
    );
  return Number(r[0]?.c || 0);
}

/**
 * Verifie que le cabinet peut creer un nouveau patient. Throw si quota atteint.
 * A utiliser dans POST /api/cabinet/invite-tokens (avant de generer le token).
 */
export async function enforceMaxPatients(cabinetId: string): Promise<{ plan: Tier; used: number; max: number }> {
  const plan = await enforceFeature(cabinetId, 'maxPatients');
  const used = await countActivePatients(cabinetId);
  const max = PLAN_FEATURES[plan].maxPatients as number;
  if (used >= max) {
    throw new FeatureDeniedError('maxPatients', plan, plan === 'free' ? 'pro' : 'cabinet');
  }
  return { plan, used, max };
}

/**
 * Verifie que le cabinet peut envoyer une nouvelle newsletter ce mois-ci.
 * A utiliser dans POST /api/newsletter/send (avant l'envoi).
 */
export async function enforceNewslettersQuota(
  cabinetId: string,
): Promise<{ plan: Tier; used: number; max: number }> {
  const plan = await enforceFeature(cabinetId, 'newslettersPerMonth');
  const used = await countNewslettersThisMonth(cabinetId);
  const max = PLAN_FEATURES[plan].newslettersPerMonth as number;
  if (used >= max) {
    throw new FeatureDeniedError('newslettersPerMonth', plan, 'cabinet');
  }
  return { plan, used, max };
}

/**
 * Verifie qu'un cabinet peut utiliser un template donne.
 * Free n'a acces qu'au template 'moderne' (le seul dans sa liste 'moderne').
 * Pro et Cabinet ont acces a tous.
 */
export async function enforceTemplateAccess(cabinetId: string, templateCode: string): Promise<Tier> {
  const plan = await getCabinetPlan(cabinetId);
  if (!hasFeature(plan, 'templates')) {
    // Free : seul 'moderne' est autorise
    if (templateCode !== 'moderne') {
      throw new FeatureDeniedError('templates', plan, 'pro');
    }
  }
  return plan;
}

/**
 * Helper UI : retourne le nombre de newsletters restantes ce mois-ci pour un plan.
 * Pure (pas de DB) : utilise pour affichage dans le bandeau.
 */
export function getRemainingQuota(plan: Tier, used: number): number {
  const max = PLAN_FEATURES[plan].newslettersPerMonth as number;
  return Math.max(0, max - used);
}

/**
 * Re-export pour faciliter l'usage client.
 */
export { hasFeature, PLAN_FEATURES };
export type { PlanCode };
