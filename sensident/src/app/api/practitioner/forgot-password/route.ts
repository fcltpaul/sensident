/**
 * Demande de reinitialisation de mot de passe.
 *
 * - Recoit un email
 * - Anti-enumeration : reponse OK dans tous les cas
 * - Genere un token signed HMAC valable 1h
 * - Envoie un email avec un lien /reset-password?token=***
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { practitioners, passwordResetTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/email';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const ForgotSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
});

const TOKEN_TTL_HOURS = 1;

function generateResetToken(email: string, practitionerId: string): string {
  const payload = JSON.stringify({ email, practitionerId, ts: Date.now() });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const sig = crypto
    .createHmac('sha256', process.env.AUTH_SECRET || 'dev-secret')
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit('login_practitioner', ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: true, message: 'Si un compte existe, un email de reinitialisation a ete envoye.' },
      { status: 200 },
    );
  }

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }); }
  const parsed = ForgotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email invalide.' }, { status: 400 });
  }

  // Anti-enumeration : on cherche le praticien en silence
  let practitioner: { id: string; email: string } | null = null;
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<Array<{ id: string; email: string }>>`
      SELECT id, email FROM practitioners WHERE email = ${parsed.data.email}::text LIMIT 1
    `;
    practitioner = rows[0] ?? null;
  } else {
    const rows = await db
      .select({ id: practitioners.id, email: practitioners.email })
      .from(practitioners)
      .where(eq(practitioners.email, parsed.data.email))
      .limit(1);
    practitioner = rows[0] ?? null;
  }

  if (practitioner) {
    const token = generateResetToken(practitioner.email, practitioner.id);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);

    if (DB_DIALECT === 'postgresql') {
      // Invalide les anciens tokens actifs
      await rawSqlClient`
        UPDATE password_reset_tokens SET used_at = NOW()
        WHERE practitioner_id::text = ${practitioner.id}::text AND used_at IS NULL
      `;
      await rawSqlClient`
        INSERT INTO password_reset_tokens (id, practitioner_id, token_hash, expires_at)
        VALUES (${crypto.randomUUID()}::text, ${practitioner.id}::text, ${tokenHash}, ${expiresAt.toISOString()}::timestamptz)
      `;
    }

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://sensidentv0.vercel.app'}/reset-password?token=***`;

    await sendEmail({
      to: practitioner.email,
      subject: 'Reinitialisation de votre mot de passe Sensident',
      html: `<div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>Reinitialisation de mot de passe</h2>
        <p>Vous (ou quelqu'un utilisant cette adresse) a demande la reinitialisation du mot de passe de votre compte Sensident.</p>
        <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
        <p style="text-align: center; margin: 20px 0;">
          <a href="${resetUrl}" style="background: #0F172A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reinitialiser mon mot de passe</a>
        </p>
        <p style="font-size: 12px; color: #64748b;">Ou copiez-collez ce lien :<br><a href="${resetUrl}">${resetUrl}</a></p>
        <p style="font-size: 12px; color: #64748b;">Ce lien expire dans ${TOKEN_TTL_HOURS} heure. Si vous n'etes pas a l'origine de cette demande, ignorez cet email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="font-size: 11px; color: #94a3b8;">Sensident - Plateforme de prevention dentaire</p>
      </div>`,
      text: `Reinitialisation de mot de passe Sensident\n\nOuvrez ce lien (expire dans ${TOKEN_TTL_HOURS}h) :\n${resetUrl}\n\nSi vous n'etes pas a l'origine de cette demande, ignorez cet email.`,
      kind: 'password_reset',
      cabinetId: undefined,
    });
  }

  return NextResponse.json({
    success: true,
    message: 'Si un compte existe, un email de reinitialisation a ete envoye.',
  });
}
