import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { practitioners, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromCookie, generateTotpSecret, getTotpUri, generateQrCodeDataUrl } from '@/lib/auth';

export async function POST() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const prac = (await db.select().from(practitioners).where(eq(practitioners.id, session.practitionerId)).limit(1))[0];
  if (!prac) return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 });

  const newSecret = generateTotpSecret();
  const totpUri = getTotpUri(newSecret, prac.email);
  const qrCodeUrl = await generateQrCodeDataUrl(totpUri);

  // On stocke le nouveau secret, mais on ne le valide qu'apres verification
  await db.update(practitioners).set({ totpSecret: newSecret, totpEnabled: false, updatedAt: new Date() }).where(eq(practitioners.id, prac.id));

  await db.insert(auditLogs).values({
    actorType: 'practitioner',
    actorId: prac.id,
    cabinetId: prac.cabinetId,
    action: 'mfa_reset_requested',
  });

  return NextResponse.json({ qrCodeUrl, totpSecret: newSecret });
}
