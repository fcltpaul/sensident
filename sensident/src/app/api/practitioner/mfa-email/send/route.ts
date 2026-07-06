/**
 * Envoi d'un code MFA par email (alternative au TOTP).
 *
 * - Genere un code a 6 chiffres
 * - Le stocke en BDD avec expiration 10 min (table mfa_email_codes)
 * - L'envoie par email via Brevo
 *
 * Auth : praticien connecte (apres login password) mais pas encore verifie.
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { practitioners } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';

const CODE_TTL_MIN = 10;

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }
  if (session.mfaVerified) {
    return NextResponse.json({ success: true, alreadyVerified: true });
  }

  const rl = await checkRateLimit('mfa_verify', session.practitionerId);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Trop de demandes. Reessayez dans quelques minutes.' },
      { status: 429 },
    );
  }

  // Recupere email + name
  let email = '';
  let name = '';
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<Array<{ email: string; name: string }>>`
      SELECT email, name FROM practitioners WHERE id = ${session.practitionerId}::text LIMIT 1
    `;
    if (rows[0]) { email = rows[0].email; name = rows[0].name; }
  } else {
    const rows = await db
      .select({ email: practitioners.email, name: practitioners.name })
      .from(practitioners)
      .where(eq(practitioners.id, session.practitionerId))
      .limit(1);
    if (rows[0]) { email = rows[0].email; name = rows[0].name; }
  }

  if (!email) {
    return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 });
  }

  // Genere code a 6 chiffres
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60 * 1000);

  // Stocke le code
  if (DB_DIALECT === 'postgresql') {
    await rawSqlClient`
      INSERT INTO mfa_email_codes (id, practitioner_id, code_hash, expires_at)
      VALUES (${crypto.randomUUID()}::text, ${session.practitionerId}::text, ${codeHash}, ${expiresAt.toISOString()}::timestamptz)
    `;
  } else {
    // SQLite (dev) : la table n'existe pas en schema, on logge juste.
    console.log(`[MFA-EMAIL] Code pour ${email}: ${code} (expire ${expiresAt.toISOString()})`);
  }

  // Envoie par email
  const result = await sendEmail({
    to: email,
    subject: 'Votre code de connexion Sensident',
    html: `<div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto;">
      <p>Bonjour${name ? ` ${name}` : ''},</p>
      <p>Votre code de verification a 6 chiffres :</p>
      <h2 style="font-size: 32px; letter-spacing: 8px; text-align: center; font-family: monospace;">${code}</h2>
      <p>Ce code expire dans ${CODE_TTL_MIN} minutes.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
      <p style="font-size: 12px; color: #64748b;">Si vous n'etes pas a l'origine de cette demande, ignorez cet email.</p>
    </div>`,
    text: `Code de verification Sensident: ${code}\n\nExpire dans ${CODE_TTL_MIN} minutes.`,
    kind: 'mfa_email_code',
    cabinetId: session.cabinetId,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: 'Impossible d\'envoyer l\'email. Reessayez.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    expiresAt: expiresAt.toISOString(),
    devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
  });
}
