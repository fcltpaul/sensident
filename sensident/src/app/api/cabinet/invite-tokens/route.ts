import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { db } from '@/db/client';
import { inviteTokens, cabinets, auditLogs } from '@/db/schema';
import { eq, and, gt, isNull, desc } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';

const CreateSchema = z.object({
  maxUses: z.number().int().min(1).max(100000).default(1000),
  durationDays: z.number().int().min(1).max(365).default(90),
});

/**
 * Cree un nouveau token d'invitation patient.
 * Le token (en clair) est envoye au client une seule fois pour etre affiche en QR code.
 * Seul le hash est stocke en BDD.
 */
export async function POST(req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const parsed = CreateSchema.safeParse(body);

  const maxUses = parsed.success ? parsed.data.maxUses : 1000;
  const durationDays = parsed.success ? parsed.data.durationDays : 90;

  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  await db.insert(inviteTokens).values({
    cabinetId: session.cabinetId,
    tokenHash,
    createdBy: session.practitionerId,
    expiresAt,
    maxUses,
  });

  const cab = (await db.select().from(cabinets).where(eq(cabinets.id, session.cabinetId)).limit(1))[0];
  if (!cab) return NextResponse.json({ error: 'Cabinet introuvable.' }, { status: 404 });

  await db.insert(auditLogs).values({
    actorType: 'practitioner',
    actorId: session.practitionerId,
    cabinetId: cab.id,
    action: 'invite_token_created',
  });

  const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/c/${cab.slug}/rejoindre?token=***${token}`;

  return NextResponse.json({ url, token, expiresAt, maxUses });
}

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }

  const tokens = await db
    .select()
    .from(inviteTokens)
    .where(
      and(
        eq(inviteTokens.cabinetId, session.cabinetId),
        isNull(inviteTokens.revokedAt),
        gt(inviteTokens.expiresAt, new Date())
      )
    )
    .orderBy(desc(inviteTokens.createdAt))
    .limit(10);

  return NextResponse.json({
    tokens: tokens.map((t) => ({
      id: t.id,
      createdAt: t.createdAt,
      expiresAt: t.expiresAt,
      maxUses: t.maxUses,
      usedCount: t.usedCount,
    })),
  });
}
