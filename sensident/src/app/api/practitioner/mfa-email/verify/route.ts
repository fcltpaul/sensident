/**
 * Verification d'un code MFA recu par email.
 *
 * - Verifie le code contre le hash stocke en BDD
 * - Si OK, marque la session comme mfaVerified
 * - Le code est a usage unique (on le supprime apres verif)
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { practitionerSessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
import { checkRateLimit } from '@/lib/rate-limit';

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
      { error: 'Trop de tentatives. Reessayez dans quelques minutes.' },
      { status: 429 },
    );
  }

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }); }
  const code = (body.code || '').toString().trim();
  if (!/^[0-9]{6}$/.test(code)) {
    return NextResponse.json({ error: 'Code a 6 chiffres requis.' }, { status: 400 });
  }
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');

  // Verifie le code en BDD
  let valid = false;
  if (DB_DIALECT === 'postgresql') {
    const found = await rawSqlClient<Array<{ id: string }>>`
      SELECT id FROM mfa_email_codes
      WHERE practitioner_id::text = ${session.practitionerId}::text
        AND code_hash = ${codeHash}
        AND expires_at > NOW()
        AND used_at IS NULL
      LIMIT 1
    `;
    if (found[0]) {
      // Marque comme utilise
      await rawSqlClient`
        UPDATE mfa_email_codes
        SET used_at = NOW()
        WHERE id::text = ${found[0].id}::text
      `;
      valid = true;
    }
  } else {
    // En dev, on accepte tout code 6 chiffres si on a logge (pas de table)
    console.log(`[MFA-EMAIL] Verify code (dev, no BDD): ${code}`);
    valid = false; // En dev, on laisse l'utilisateur utiliser le devCode du send
  }

  if (!valid) {
    return NextResponse.json({ error: 'Code invalide ou expire.' }, { status: 401 });
  }

  // Marque la session comme MFA verifiee
  const token = req.cookies.get('sensident_session')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Session expiree.' }, { status: 401 });
  }
  const tokenHash = hashToken(token);

  if (DB_DIALECT === 'postgresql') {
    await rawSqlClient`
      UPDATE practitioner_sessions
      SET mfa_verified = true, last_used_at = NOW()
      WHERE token_hash = ${tokenHash}
    `;
  } else {
    await db
      .update(practitionerSessions)
      .set({ mfaVerified: true })
      .where(eq(practitionerSessions.tokenHash, tokenHash));
  }

  return NextResponse.json({ success: true });
}
