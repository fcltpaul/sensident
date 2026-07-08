import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { cabinets, auditLogs, patientMagicLinks } from '@/db/schema';
import { eq } from 'drizzle-orm';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CABINET_HASH_SALT = process.env.CABINET_HASH_SALT || 'dev-only-salt-replace-in-prod';

/**
 * GET /api/patient/confirm?token=***
 * Confirme l'opt-in d'un patient (double opt-in).
 *
 * 2026-07-07 23h20 (Tartrinator) : UX fix.
 * Avant : si le patient etait deja confirme ou n'existait pas, on renvoyait
 * vers '/?error=already_confirmed_or_unknown' (= accueil avec message d'erreur).
 * Apres : on redirige TOUJOURS vers /c/{slug}/bienvenue, avec un query param
 * ?already_confirmed=1 si l'optin etait deja valide. La page d'accueil
 * affiche alors un toast "Vous etes deja inscrit, accedez a votre espace".
 *
 * Cas particuliers :
 *  - Token invalide / expire : on garde le redirect '/'?error=... (4xx
 *    cote UX, le cas n'est pas 'normal').
 *  - Cabinet introuvable : redirect '/'.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.redirect(new URL('/?error=missing_token', APP_URL));

  const [payload, sig] = token.split('.');
  if (!payload || !sig) return NextResponse.redirect(new URL('/?error=invalid_token', APP_URL));

  const expected = crypto
    .createHmac('sha256', process.env.AUTH_SECRET || 'dev-secret')
    .update(payload)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return NextResponse.redirect(new URL('/?error=bad_signature', APP_URL));
  }

  let decoded: { email: string; cabinetId: string; ts: number };
  try {
    decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
  } catch {
    return NextResponse.redirect(new URL('/?error=corrupt_token', APP_URL));
  }

  if (Date.now() - decoded.ts > 24 * 60 * 60 * 1000) {
    return NextResponse.redirect(new URL('/?error=expired_token', APP_URL));
  }

  const emailHash = crypto
    .createHash('sha256')
    .update(decoded.email + decoded.cabinetId + CABINET_HASH_SALT)
    .digest('hex');

  // 1. Charger le cabinet (toujours, pour avoir le slug de la redirection).
  let cab: { id: string; slug: string } | null = null;
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<Array<{ id: string; slug: string }>>`
      SELECT id::text AS id, slug FROM cabinets WHERE id::text = ${decoded.cabinetId}::text LIMIT 1
    `;
    cab = rows[0] ?? null;
  } else {
    const c = (await db.select().from(cabinets).where(eq(cabinets.id, decoded.cabinetId)).limit(1))[0];
    cab = c ?? null;
  }
  if (!cab) return NextResponse.redirect(new URL('/', APP_URL));

  // 2. UPDATE : marque comme confirme si pas deja le cas.
  let confirmedId: string | null = null;
  let alreadyConfirmed = false;
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<{ id: string }[]>`
      UPDATE patient_consents
      SET confirmed_at = NOW()
      WHERE cabinet_id::text = ${decoded.cabinetId}::text
        AND email_hash = ${emailHash}
        AND confirmed_at IS NULL
      RETURNING id::text AS id
    `;
    confirmedId = rows[0]?.id ?? null;
  } else {
    // SQLite (dev)
    const { patientConsents } = await import('@/db/schema');
    const rows = await db
      .update(patientConsents)
      .set({ confirmedAt: new Date() })
      .where(eq(patientConsents.cabinetId, decoded.cabinetId))
      .returning({ id: patientConsents.id });
    confirmedId = rows[0]?.id ?? null;
  }

  if (!confirmedId) {
    // Patient deja confirme ou inconnu : on laisse l'utilisateur acceder
    // a son espace (pas une erreur cote UX) ; la page d'accueil n'affiche
    // pas ce parametre, on le passe seulement au sous-domaine.
    alreadyConfirmed = true;
  } else {
    // Audit log uniquement pour les nouvelles confirmations.
    if (DB_DIALECT === 'postgresql') {
      await rawSqlClient`
        INSERT INTO audit_logs (id, actor_type, cabinet_id, action, target_type, target_id, metadata, created_at)
        VALUES (gen_random_uuid()::text, 'patient', ${cab.id}::text, 'optin_confirmed', 'patient_consent',
                ${confirmedId}::text, ${{ method: 'double_optin' }}::jsonb, NOW())
      `;
    } else {
      await db.insert(auditLogs).values({
        actorType: 'patient',
        cabinetId: cab.id,
        action: 'optin_confirmed',
        targetType: 'patient_consent',
        targetId: confirmedId,
        metadata: { method: 'double_optin' },
      });
    }
  }

  // 3. Poser un cookie de session patient (24h) — comme magic-link/verify.
  //    Sans ce cookie, le PUT /api/patient/consent renvoie 401 "Session expirée"
  //    et le patient ne peut pas enregistrer ses préférences depuis la page de bienvenue.
  //    Le token est hashé en BDD (patientMagicLinks.tokenHash = sha256(token)).
  const sessionToken = crypto.randomBytes(32).toString('base64url');
  const sessionHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
  if (DB_DIALECT === 'postgresql') {
    await rawSqlClient`
      INSERT INTO patient_magic_links (id, cabinet_id, email_hash, token_hash, expires_at, created_at)
      VALUES (gen_random_uuid()::text, ${cab.id}::text, ${emailHash}, ${sessionHash},
              NOW() + INTERVAL '24 hours', NOW())
    `;
  } else {
    await db.insert(patientMagicLinks).values({
      cabinetId: cab.id,
      emailHash,
      tokenHash: sessionHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  }

  // 4. Redirige vers l'espace patient (toujours), avec le cookie session posé.
  const target = `/c/${cab.slug}/bienvenue${alreadyConfirmed ? '?already_confirmed=1' : ''}`;
  const response = NextResponse.redirect(new URL(target, APP_URL));
  response.cookies.set('sensident_patient_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60,
  });
  response.cookies.set('sensident_current_cabinet', cab.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60,
  });
  return response;
}