/**
 * Sensident — Auth praticien (email + password + TOTP MFA obligatoire)
 *
 * Stack :
 * - bcryptjs pour le hash password
 * - otplib pour TOTP (compatible Google Authenticator, Authy, 1Password)
 * - Cookies httpOnly + Secure + SameSite=Lax
 * - Custom session table (pas NextAuth default, plus de contrôle)
 */
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'node:crypto';
import { db, withCabinetContext, DB_DIALECT, rawSqlClient } from '@/db/client';
import { practitioners, practitionerSessions } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'sensident_session';
const SESSION_DURATION_DAYS = 7;
const MFA_CHALLENGE_DURATION_MIN = 10;

// ============================================
// PASSWORD
// ============================================
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12); // cost 12 = bon compromis dev/perf
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Politique password : 12 char min, 1 maj, 1 chiffre
export function passwordMeetsPolicy(p: string): { ok: boolean; reason?: string } {
  if (p.length < 12) return { ok: false, reason: 'Le mot de passe doit faire au moins 12 caracteres.' };
  if (!/[A-Z]/.test(p)) return { ok: false, reason: 'Le mot de passe doit contenir au moins une majuscule.' };
  if (!/[0-9]/.test(p)) return { ok: false, reason: 'Le mot de passe doit contenir au moins un chiffre.' };
  return { ok: true };
}

// ============================================
// TOTP MFA
// ============================================
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function getTotpUri(secret: string, accountName: string): string {
  return authenticator.keyuri(accountName, 'Sensident', secret);
}

export async function generateQrCodeDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri);
}

export function verifyTotpCode(secret: string, code: string): boolean {
  // window 1 = accepte le code actuel + le precedent (drift tolerance)
  return authenticator.verify({ token: code, secret });
}

// ============================================
// SESSIONS
// ============================================
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface CreateSessionParams {
  practitionerId: string;
  cabinetId: string;
  ip?: string;
  userAgent?: string;
  mfaVerified: boolean;
}

export async function createSession(params: CreateSessionParams): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const id = crypto.randomUUID();

  if (DB_DIALECT === 'postgresql') {
    // Bypass Drizzle (Drizzle plante sur Neon HTTP avec boolean mfa_verified)
    // postgres-js tagged templates n'acceptent pas Date : convertir en ISO
    const expiresAtIso = expiresAt.toISOString();
    const r = await rawSqlClient`
      INSERT INTO practitioner_sessions (id, practitioner_id, cabinet_id, token_hash, mfa_verified, ip, user_agent, expires_at, created_at, last_used_at)
      VALUES (${id}, ${params.practitionerId}, ${params.cabinetId}, ${tokenHash}, ${params.mfaVerified}, ${params.ip ?? null}, ${params.userAgent ?? null}, ${expiresAtIso}::timestamptz, now(), now())
    `;
  } else {
    // SQLite (dev) via Drizzle
    await db.insert(practitionerSessions).values({
      id,
      practitionerId: params.practitionerId,
      cabinetId: params.cabinetId,
      tokenHash,
      mfaVerified: params.mfaVerified,
      ip: params.ip,
      userAgent: params.userAgent,
      expiresAt,
    });
  }

  return { token, expiresAt };
}

export async function getSessionFromCookie(): Promise<{
  practitionerId: string;
  cabinetId: string;
  mfaVerified: boolean;
} | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const now = new Date();
  const nowIso = now.toISOString();

  if (DB_DIALECT === 'postgresql') {
    // Bypass Drizzle (ne supporte pas les Date avec postgres-js tagged template)
    const sessions = await rawSqlClient<{ practitioner_id: string; cabinet_id: string; mfa_verified: boolean }[]>`
      SELECT practitioner_id, cabinet_id, mfa_verified FROM practitioner_sessions
      WHERE token_hash = ${tokenHash} AND expires_at > ${nowIso}::timestamptz
      LIMIT 1
    `;
    if (sessions.length === 0) return null;
    const s = sessions[0];
    return { practitionerId: s.practitioner_id, cabinetId: s.cabinet_id, mfaVerified: s.mfa_verified };
  }

  const sessions = await db
    .select()
    .from(practitionerSessions)
    .where(and(eq(practitionerSessions.tokenHash, tokenHash), gt(practitionerSessions.expiresAt, now)))
    .limit(1);

  if (sessions.length === 0) return null;

  // Update last_used_at
  await db
    .update(practitionerSessions)
    .set({ lastUsedAt: new Date() })
    .where(eq(practitionerSessions.id, sessions[0].id));

  return {
    practitionerId: sessions[0].practitionerId,
    cabinetId: sessions[0].cabinetId,
    mfaVerified: sessions[0].mfaVerified,
  };
}

export function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = cookies();
  // Force Date object (some ORM drivers serialize Date to number)
  const safeExpiresAt = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: safeExpiresAt,
  });
}

export async function destroySession() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await db.delete(practitionerSessions).where(eq(practitionerSessions.tokenHash, tokenHash));
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// ============================================
// AUTH FLOW HELPERS
// ============================================

/**
 * Verifie un login (email + password) sans creer de session.
 * Renvoie le practitioner + son cabinet, ou null.
 */
export async function authenticateLogin(email: string, password: string) {
  const result = await db
    .select()
    .from(practitioners)
    .where(eq(practitioners.email, email.toLowerCase()))
    .limit(1);

  if (result.length === 0) {
    // Constant-time fake verify pour eviter l'enumeration email
    await bcrypt.compare(password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi');
    return null;
  }

  const practitioner = result[0];
  const passwordOk = await verifyPassword(password, practitioner.passwordHash);
  if (!passwordOk) return null;

  return practitioner;
}
