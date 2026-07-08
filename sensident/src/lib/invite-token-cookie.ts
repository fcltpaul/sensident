/**
 * Sensident — Cookie HttpOnly pour le token d'invitation en clair
 *
 * Pourquoi ce module existe (08/07/2026) :
 * Le token d'invitation est un secret : on ne stocke en BDD que son hash
 * SHA-256 (cf. /api/cabinet/invite-tokens). Le token en clair n'est
 * visible qu'une seule fois, à la creation. Auparavant, on le conservait
 * cote navigateur via sessionStorage, mais :
 *   - sessionStorage est vide a chaque nouvelle session / nouvel onglet
 *   - le praticien qui revient sur la page d'invitation voyait un QR
 *     code fantome ("QR code en cache perdu")
 *   - la seule solution etait de "Regenerer le lien", ce qui revoquait
 *     le token en cours (donc rendait les QR codes deja distribues
 *     invalides).
 *
 * Solution : on stocke le token en clair dans un cookie HttpOnly
 * chiffre cote serveur. La cle de chiffrement derivee de AUTH_SECRET
 * (variable d'env existante, jamais exposee au client). Le navigateur
 * recoit le cookie chiffre, le serveur le dechiffre a la lecture.
 *
 * Securite :
 *   - HttpOnly : pas accessible en JS (anti-XSS)
 *   - Secure en prod : transmis uniquement en HTTPS
 *   - SameSite=Lax : pas envoye sur les cross-site navigations
 *   - Chiffrement AES-256-GCM avec IV aleatoire par ecriture
 *   - Cle derivee via SHA-256(AUTH_SECRET) -> 32 bytes
 *   - Le contenu du cookie (token en clair) ne peut etre lu que par
 *     le serveur Sensident
 *   - En cas de vol du cookie, l'attaquant peut s'inscrire comme
 *     patient du cabinet (mais doit confirmer par email), comme
 *     avec un QR code vole
 *
 * Note : ce cookie n'est PAS le cookie de session praticien. Il ne
 * donne PAS acces a l'espace praticien. Il contient le token d'invitation
 * qui est deja public au sens "distribue aux patients".
 */

import crypto from 'node:crypto';
import { cookies } from 'next/headers';

export const INVITE_TOKEN_COOKIE_NAME = 'sensident_invite_token';

// Duree de vie du cookie : 30 jours (le token en BDD vit 10 ans, mais
// on ne garde le token en clair cote serveur que 30 jours pour limiter
// l'exposition en cas de fuite du cookie store). Apres 30 jours, le
// praticien doit cliquer "Regenerer" pour reafficher le QR.
const COOKIE_DURATION_DAYS = 30;

function getEncryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET non defini - impossible de chiffrer le cookie invite_token');
  }
  // SHA-256 -> 32 bytes -> cle AES-256
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Chiffre un token et le pose comme cookie HttpOnly.
 */
export function setInviteTokenCookie(cabinetId: string, tokenId: string, token: string): void {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96 bits, recommande pour GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  // Payload minimal : cabinetId + tokenId + token. Le cabinetId permet
  // de verifier que le cookie correspond bien au cabinet courant (defense
  // en profondeur contre une reutilisation cross-cabinet).
  const payload = JSON.stringify({ cabinetId, tokenId, token });
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format : base64(iv | authTag | encrypted)
  const cookieValue = Buffer.concat([iv, authTag, encrypted]).toString('base64url');

  const cookieStore = cookies();
  cookieStore.set(INVITE_TOKEN_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_DURATION_DAYS * 24 * 60 * 60,
  });
}

/**
 * Lit et dechiffre le cookie. Renvoie null si absent / invalide / expire.
 * Verifie que le cabinetId du payload correspond au cabinetId passe en
 * argument.
 */
export function readInviteTokenCookie(
  cabinetId: string,
): { tokenId: string; token: string } | null {
  const cookieStore = cookies();
  const raw = cookieStore.get(INVITE_TOKEN_COOKIE_NAME)?.value;
  if (!raw) return null;

  try {
    const key = getEncryptionKey();
    const buf = Buffer.from(raw, 'base64url');
    if (buf.length < 12 + 16) return null; // IV + authTag minimum
    const iv = buf.subarray(0, 12);
    const authTag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    const payload = JSON.parse(decrypted) as { cabinetId?: string; tokenId?: string; token?: string };

    if (payload.cabinetId !== cabinetId) {
      // Cookie d'un autre cabinet : on ignore silencieusement
      return null;
    }
    if (!payload.tokenId || !payload.token) {
      return null;
    }
    return { tokenId: payload.tokenId, token: payload.token };
  } catch {
    // Cookie corrompu / mal chiffre : on l'ignore
    return null;
  }
}

/**
 * Supprime le cookie (action explicite praticien).
 */
export function clearInviteTokenCookie(): void {
  const cookieStore = cookies();
  cookieStore.delete(INVITE_TOKEN_COOKIE_NAME);
}
