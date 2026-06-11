import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { practitioners, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromCookie, verifyTotpCode } from '@/lib/auth';

const Schema = z.object({ totpCode: z.string().regex(/^\d{6}$/) });

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Code invalide.' }, { status: 400 });

  const prac = (await db.select().from(practitioners).where(eq(practitioners.id, session.practitionerId)).limit(1))[0];
  if (!prac || !prac.totpSecret) return NextResponse.json({ error: 'MFA non initialise. Recommencez.' }, { status: 400 });

  const ok = verifyTotpCode(prac.totpSecret, parsed.data.totpCode);
  if (!ok) return NextResponse.json({ error: 'Code incorrect.' }, { status: 400 });

  await db.update(practitioners).set({ totpEnabled: true, updatedAt: new Date() }).where(eq(practitioners.id, prac.id));

  await db.insert(auditLogs).values({
    actorType: 'practitioner',
    actorId: prac.id,
    cabinetId: prac.cabinetId,
    action: 'mfa_reset_verified',
  });

  return NextResponse.json({ success: true });
}
