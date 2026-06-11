/**
 * Sensident — Génération de token de désabonnement (HMAC signé, scope cabinet+recipient, TTL 90j)
 *
 * Format : base64url(payload).base64url(sig)
 * payload = { recipientId, cabinetId, ts }
 *
 * Utilisé par :
 *  - le script render-newsletters.ts (intégration dans chaque email)
 *  - tout futur export (export RGPD, etc.)
 *
 * La vérification + consommation se fait dans /api/patient/unsubscribe/route.ts (GET).
 */
import crypto from 'node:crypto';

const SECRET = process.env.AUTH_SECRET || 'dev-secret';

export interface UnsubscribePayload {
  recipientId: string;
  cabinetId: string;
  ts: number;
}

export function buildUnsubscribeToken(recipientId: string, cabinetId: string): string {
  const payload: UnsubscribePayload = {
    recipientId,
    cabinetId,
    ts: Date.now(),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}
