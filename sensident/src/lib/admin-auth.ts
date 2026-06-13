/**
 * Sensident — Auth admin (Paul, Dr Thibault, etc.)
 *
 * Sépare des praticiens : les admins gèrent le catalogue, valident les articles,
 * consultent les audit logs. Pas d'accès aux données patient nominatives.
 */
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { db } from '@/db/client';
import { admins, adminSessions } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'sensident_admin_session';
const SESSION_DAYS = 7;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function getTotpUri(secret: string, account: string): string {
  return authenticator.keyuri(account, 'Sensident Admin', secret);
}

export function verifyTotp(secret: string, code: string): boolean {
  return authenticator.verify({ token: code, secret });
}

function newToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function hashToken(t: string): string {
  return crypto.createHash('sha256').update(t).digest('hex');
}

export async function createAdminSession(params: {
  adminId: string;
  ip?: string;
  userAgent?: string;
  mfaVerified: boolean;
}) {
  const token = newToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const id = crypto.randomUUID();

  await db.insert(adminSessions).values({
    id,
    adminId: params.adminId,
    tokenHash,
    mfaVerified: params.mfaVerified,
    ip: params.ip,
    userAgent: params.userAgent,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function getAdminSession(): Promise<{
  adminId: string;
  role: 'superadmin' | 'editor' | 'reader';
  mfaVerified: boolean;
} | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashToken(token);
  const now = new Date();
  const sessions = await db
    .select()
    .from(adminSessions)
    .where(and(eq(adminSessions.tokenHash, tokenHash), gt(adminSessions.expiresAt, now)))
    .limit(1);
  if (sessions.length === 0) return null;
  const admin = await db.select().from(admins).where(eq(admins.id, sessions[0].adminId)).limit(1);
  if (admin.length === 0) return null;
  return {
    adminId: admin[0].id,
    role: admin[0].role,
    mfaVerified: sessions[0].mfaVerified,
  };
}

export function setAdminCookie(token: string, expiresAt: Date) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function destroyAdminSession() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await db.delete(adminSessions).where(eq(adminSessions.tokenHash, tokenHash));
  }
  cookieStore.delete(SESSION_COOKIE);
}
