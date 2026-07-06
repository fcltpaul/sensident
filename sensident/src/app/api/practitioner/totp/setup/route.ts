/**
 * Setup TOTP pour un praticien connecte.
 *
 * - Genere un nouveau secret TOTP (si pas deja present)
 * - Active le flag totp_enabled
 * - Renvoie l'URI otpauth + le QR code en data URL
 * - L'utilisateur scanne avec Google Authenticator / Authy / 1Password
 * - Puis verifie un premier code via /api/practitioner/verify-mfa
 *
 * Auth requise : praticien deja connecte.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { practitioners } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  generateTotpSecret,
  getTotpUri,
  generateQrCodeDataUrl,
  getSessionFromCookie,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }

  // Recupere le praticien
  const [practitioner] = await db
    .select()
    .from(practitioners)
    .where(eq(practitioners.id, session.practitionerId))
    .limit(1);

  if (!practitioner) {
    return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 });
  }

  // Genere un nouveau secret si besoin (force un nouveau secret a chaque
  // setup, c'est plus sur : un ancien secret laisse serait compromis)
  const newSecret = generateTotpSecret();
  const uri = getTotpUri(newSecret, practitioner.email);
  const qrCodeUrl = await generateQrCodeDataUrl(uri);

  // Persiste le nouveau secret + active TOTP
  await db
    .update(practitioners)
    .set({ totpSecret: newSecret, totpEnabled: true })
    .where(eq(practitioners.id, practitioner.id));

  return NextResponse.json({
    secret: newSecret,
    uri,
    qrCodeUrl,
    accountName: practitioner.email,
    issuer: 'Sensident',
  });
}

export async function DELETE(req: NextRequest) {
  // Desactive TOTP (pour les utilisateurs qui preferent le code email)
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }

  await db
    .update(practitioners)
    .set({ totpEnabled: false })
    .where(eq(practitioners.id, session.practitionerId));

  return NextResponse.json({ success: true, totpEnabled: false });
}
