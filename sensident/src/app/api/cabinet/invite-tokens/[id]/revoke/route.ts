import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { inviteTokens, auditLogs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }

  await db
    .update(inviteTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(inviteTokens.id, params.id),
        eq(inviteTokens.cabinetId, session.cabinetId)
      )
    );

  await db.insert(auditLogs).values({
    actorType: 'practitioner',
    actorId: session.practitionerId,
    cabinetId: session.cabinetId,
    action: 'invite_token_revoked',
    targetType: 'invite_token',
    targetId: params.id,
  });

  return NextResponse.json({ success: true });
}
