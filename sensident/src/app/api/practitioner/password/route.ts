import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { practitioners, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromCookie, verifyPassword, hashPassword, passwordMeetsPolicy } from '@/lib/auth';

const Schema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(1),
});

export async function PUT(req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });

  const policy = passwordMeetsPolicy(parsed.data.newPassword);
  if (!policy.ok) return NextResponse.json({ error: policy.reason }, { status: 400 });

  const prac = (await db.select().from(practitioners).where(eq(practitioners.id, session.practitionerId)).limit(1))[0];
  if (!prac) return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 });

  const ok = await verifyPassword(parsed.data.oldPassword, prac.passwordHash);
  if (!ok) return NextResponse.json({ error: 'Ancien mot de passe incorrect.' }, { status: 400 });

  const newHash = await hashPassword(parsed.data.newPassword);
  await db.update(practitioners).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(practitioners.id, prac.id));

  await db.insert(auditLogs).values({
    actorType: 'practitioner',
    actorId: prac.id,
    cabinetId: prac.cabinetId,
    action: 'password_changed',
    ip: req.ip ?? null,
    userAgent: req.headers.get('user-agent'),
  });

  return NextResponse.json({ success: true });
}
