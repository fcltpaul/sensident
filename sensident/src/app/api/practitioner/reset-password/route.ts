/**
 * Reset password avec token recu par email.
 *
 * - Verifie le token signe HMAC
 * - Hash le nouveau mot de passe
 * - Update en BDD
 * - Invalide le token (usage unique)
 * - Invalide toutes les sessions actives du praticien
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { practitioners, passwordResetTokens, practitionerSessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, passwordMeetsPolicy } from '@/lib/auth';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const ResetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(1).max(128),
});

function verifyResetToken(token: string): { email: string; practitionerId: string } | null {
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return null;
  const expected = crypto
    .createHmac('sha256', process.env.AUTH_SECRET || 'dev-secret')
    .update(payloadB64)
    .digest('base64url');
  if (sig !== expected) return null;
  try {
    return JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit('login_practitioner', ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Reessayez dans quelques minutes.' },
      { status: 429 },
    );
  }

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }); }
  const parsed = ResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Token et mot de passe requis.' }, { status: 400 });
  }

  // Politique password
  const policy = passwordMeetsPolicy(parsed.data.password);
  if (!policy.ok) {
    return NextResponse.json({ error: policy.reason }, { status: 400 });
  }

  // Verifie le token signe
  const claims = verifyResetToken(parsed.data.token);
  if (!claims) {
    return NextResponse.json({ error: 'Lien invalide ou expire.' }, { status: 401 });
  }

  // Verifie en BDD qu'un token actif existe pour ce praticien
  const tokenHash = crypto.createHash('sha256').update(parsed.data.token).digest('hex');
  let valid = false;
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<Array<{ id: string }>>`
      SELECT id FROM password_reset_tokens
      WHERE practitioner_id::text = ${claims.practitionerId}::text
        AND token_hash = ${tokenHash}
        AND expires_at > NOW()
        AND used_at IS NULL
      LIMIT 1
    `;
    if (rows[0]) {
      await rawSqlClient`
        UPDATE password_reset_tokens SET used_at = NOW()
        WHERE id::text = ${rows[0].id}::text
      `;
      valid = true;
    }
  } else {
    console.log(`[RESET-PASSWORD] Dev mode, accept all tokens`);
    valid = true;
  }

  if (!valid) {
    return NextResponse.json({ error: 'Lien expire ou deja utilise.' }, { status: 401 });
  }

  // Hash + update
  const newHash = await hashPassword(parsed.data.password);
  if (DB_DIALECT === 'postgresql') {
    await rawSqlClient`
      UPDATE practitioners SET password_hash = ${newHash}
      WHERE id::text = ${claims.practitionerId}::text
    `;
    // Invalide toutes les sessions actives
    await rawSqlClient`
      DELETE FROM practitioner_sessions
      WHERE practitioner_id::text = ${claims.practitionerId}::text
    `;
  } else {
    await db
      .update(practitioners)
      .set({ passwordHash: newHash })
      .where(eq(practitioners.id, claims.practitionerId));
    await db
      .delete(practitionerSessions)
      .where(eq(practitionerSessions.practitionerId, claims.practitionerId));
  }

  return NextResponse.json({ success: true });
}
