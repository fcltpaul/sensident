import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { cabinets, auditLogs, patientMagicLinks, patientConsents } from '@/db/schema';
import { eq } from 'drizzle-orm';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CABINET_HASH_SALT = process.env.CABINET_HASH_SALT || 'dev-only-salt-replace-in-prod';

// 2026-07-13 12h30 (Tartrinator) : Paul a remonté que le lien de confirmation
// envoyait le patient sur la page d'accueil du cabinet (/c/[slug]/bienvenue)
// au lieu de le conduire a l'article/newsletter qui lui a ete envoye.
//
// Nouveau comportement :
//  - Le mail de confirmation passe desormais ?redirect=<articleSlug> en query param.
//  - Si le token est valide ET que redirect est fourni + sanitizable → on redirige
//    vers /c/[slug]/bibliotheque/<articleSlug> (la route d'article publique) avec le
//    cookie session patient pose (= le patient est "logge" pour 24h).
//  - Si le token est valide SANS redirect → on garde /c/[slug]/bienvenue (ancien
//    comportement, retrocompatible avec d'anciens mails envoyes avant ce fix).
//  - Si le token est invalide / expire : on redirige vers /c/[slug]?confirm_error=<code>
//    (la landing cabinet avec bandeau d'erreur + AlreadySubscribed qui permet de
//    demander un magic link).
//
// Pourquoi pas /c/[slug]/patient/article ? La route n'existe pas dans l'app
// actuelle (les espaces patient sont relies au cookie + bibliotheque). On
// renvoie sur la bibliotheque pour rester coherent avec l'archi MVP.
const ARTICLE_SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,100}$/;

/**
 * GET /api/patient/confirm?token=*** [&redirect=<articleSlug>]
 * Confirme l'opt-in d'un patient (double opt-in) et le redirige vers
 * l'article qui lui a ete envoye, ou vers la landing cabinet en cas
 * d'erreur actionnable.
 *
 * Cas particuliers :
 *  - Token invalide / expire : redirect vers /c/[slug]?confirm_error=<code>
 *    (page actionnable, le patient peut redemander un magic link).
 *  - Cabinet introuvable : redirect vers '/' (fallback).
 *  - Token valide + redirect fourni : redirect vers l'article (nouveau).
 *  - Token valide sans redirect : redirect vers /c/[slug]/bienvenue (legacy).
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  // 2026-07-13 : rediriger eventuellement vers l'article qui a declenche l'envoi.
  // Sanitization stricte pour eviter les open-redirect (slug regex).
  const rawRedirect = req.nextUrl.searchParams.get('redirect');
  const articleSlug = rawRedirect && ARTICLE_SLUG_REGEX.test(rawRedirect) ? rawRedirect : null;

  // === EARLY VALIDATION (avant d'avoir besoin du cabinet) ===
  if (!token) {
    return NextResponse.redirect(new URL('/?confirm_error=missing_token', APP_URL));
  }

  const [payload, sig] = token.split('.');
  if (!payload || !sig) {
    return NextResponse.redirect(new URL('/?confirm_error=invalid_token', APP_URL));
  }

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
    return NextResponse.redirect(new URL('/?confirm_error=bad_signature', APP_URL));
  }

  let decoded: { email: string; cabinetId: string; ts: number };
  try {
    decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
  } catch {
    return NextResponse.redirect(new URL('/?confirm_error=corrupt_token', APP_URL));
  }

  if (Date.now() - decoded.ts > 24 * 60 * 60 * 1000) {
    return NextResponse.redirect(new URL('/?confirm_error=expired_token', APP_URL));
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
  if (!cab) return NextResponse.redirect(new URL('/?confirm_error=unknown_cabinet', APP_URL));

  // 2. UPDATE : marque comme confirme si pas deja le cas.
  //    Note : on utilise le pattern SQL "single SET ... WHERE ... AND confirmed_at IS NULL
  //    RETURNING id". Si le WHERE ne match pas (pas de ligne ou deja confirme), on
  //    tombe dans `alreadyConfirmed`.
  let confirmedId: string | null = null;
  let alreadyConfirmed = false;
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<Array<{ id: string }>>`
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
    const rows = await db
      .update(patientConsents)
      .set({ confirmedAt: new Date() })
      .where(eq(patientConsents.cabinetId, decoded.cabinetId))
      .returning({ id: patientConsents.id });
    confirmedId = rows[0]?.id ?? null;
  }

  if (!confirmedId) {
    // Patient deja confirme ou inconnu : on laisse l'utilisateur acceder
    // a son espace (pas une erreur cote UX). On conserve `already_confirmed=1`
    // pour que la landing puisse afficher un message adapte.
    alreadyConfirmed = true;
  } else {
    // Audit log uniquement pour les nouvelles confirmations.
    // 2026-07-15 13h (Tartrinator task 13589170) : fix bug SQL "column created_at does not exist".
    // La colonne s'appelle `ts` (cf. schema.pg.ts et schema.sqlite.ts).
    // On wrappe en try/catch pour qu'un echec d'audit ne casse pas le flow patient
    // (= la confirmation doit toujours poser le cookie + magic_link + rediriger).
    try {
      if (DB_DIALECT === 'postgresql') {
        await rawSqlClient`
          INSERT INTO audit_logs (id, actor_type, cabinet_id, action, target_type, target_id, metadata, ts)
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
    } catch (auditErr) {
      // Audit best-effort : on log mais on ne casse pas le flow.
      console.error('[confirm] audit_logs insert failed:', auditErr);
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

  // 4. Redirige vers l'article (si redirect fourni) ou vers la page de bienvenue (sinon).
  //    Le cookie session patient est pose systematiquement, donc le patient est
  //    identifie pour 24h des la confirmation.
  let target: string;
  if (articleSlug) {
    // Nouveau comportement 2026-07-13 : on depose le patient directement sur
    // l'article qui lui a ete envoye (= la derniere newsletter ou le contenu
    // partage par son praticien).
    target = `/c/${cab.slug}/bibliotheque/${articleSlug}${alreadyConfirmed ? '?already_confirmed=1' : ''}`;
  } else {
    // Ancien comportement / pas de redirect specifie : page de bienvenue du cabinet.
    target = `/c/${cab.slug}/bienvenue${alreadyConfirmed ? '?already_confirmed=1' : ''}`;
  }

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
