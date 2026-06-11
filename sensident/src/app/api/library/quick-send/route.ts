import { NextRequest, NextResponse } from 'next/server';
import { withCabinetContext } from '@/db/client';
import { patientConsents, cabinets } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { sendConfirmationEmail, generateConfirmToken } from '@/lib/email';

/**
 * POST /api/library/quick-send
 * Send a magic link to a patient pointing to a specific article
 * Uses double-optin flow: confirm token -> redirect to article
 */
export async function POST(request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non authorise' }, { status: 401 });
  }

  const { articleSlug, patientEmailHash } = await request.json();
  if (!articleSlug || !patientEmailHash) {
    return NextResponse.json({ error: 'articleSlug et patientEmailHash requis' }, { status: 400 });
  }

  // Verify patient belongs to this cabinet, and get cabinet info
  const { patient, cabinet } = await withCabinetContext(session.cabinetId, async (tx) => {
    const p = await tx
      .select()
      .from(patientConsents)
      .where(
        and(
          eq(patientConsents.emailHash, patientEmailHash),
          eq(patientConsents.cabinetId, session.cabinetId)
        )
      )
      .limit(1);
    const c = await tx
      .select()
      .from(cabinets)
      .where(eq(cabinets.id, session.cabinetId))
      .limit(1);
    return { patient: p[0] || null, cabinet: c[0] || null };
  });

  if (!patient) {
    return NextResponse.json({ error: 'Patient introuvable' }, { status: 404 });
  }

  if (!cabinet) {
    return NextResponse.json({ error: 'Cabinet introuvable' }, { status: 404 });
  }

  // Generate a confirm token that includes the article redirect
  const baseToken = generateConfirmToken(patient.email, session.cabinetId);
  const confirmToken = `${baseToken}%3Aredirect%3D${articleSlug}`;

  // Reuse the existing confirmation email flow
  await sendConfirmationEmail({
    to: patient.email,
    cabinet,
    confirmToken,
  });

  return NextResponse.json({ ok: true, message: 'Lien envoye par email' });
}
