import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { practitioners, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyTotpCode, getSessionFromCookie, setSessionCookie, createSession } from '@/lib/auth';

const MfaSchema = z.object({
  totpCode: z.string().regex(/^\d{6}$/),
});

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  const parsed = MfaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Code invalide (6 chiffres requis).' }, { status: 400 });
  }

  // Recup session en cours
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: 'Session expiree. Reconnectez-vous.' }, { status: 401 });
  }

  // Charge le practitioner
  const result = await db
    .select()
    .from(practitioners)
    .where(eq(practitioners.id, session.practitionerId))
    .limit(1);

  if (result.length === 0) {
    return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 });
  }

  const practitioner = result[0];
  if (!practitioner.totpSecret) {
    return NextResponse.json({ error: 'MFA non initialise. Recommencez l\'inscription.' }, { status: 400 });
  }

  const ok = verifyTotpCode(practitioner.totpSecret, parsed.data.totpCode);
  if (!ok) {
    return NextResponse.json({ error: 'Code incorrect. Reessaie.' }, { status: 400 });
  }

  // Activer MFA et mettre a jour la session
  if (!practitioner.totpEnabled) {
    await db
      .update(practitioners)
      .set({ totpEnabled: true })
      .where(eq(practitioners.id, practitioner.id));
  }

  // Creer une nouvelle session avec mfaVerified = true
  const ip = req.headers.get('x-forwarded-for') || req.ip || undefined;
  const userAgent = req.headers.get('user-agent') || undefined;
  const { token, expiresAt } = await createSession({
    practitionerId: practitioner.id,
    cabinetId: practitioner.cabinetId,
    ip,
    userAgent,
    mfaVerified: true,
  });
  setSessionCookie(token, expiresAt);

  // Audit
  await db.insert(auditLogs).values({
    actorType: 'practitioner',
    actorId: practitioner.id,
    cabinetId: practitioner.cabinetId,
    action: 'mfa_enabled',
    ip: req.ip ?? null,
    userAgent: req.headers.get('user-agent'),
  });

  return NextResponse.json({ success: true });
}
