import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { inviteTokens, auditLogs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }

  if (DB_DIALECT === 'postgresql') {
    // Fix 05/07 : cast ::text (schema reel text vs Drizzle uuid)
    await rawSqlClient`
      UPDATE invite_tokens
      SET revoked_at = NOW()
      WHERE id::text = ${params.id}::text
        AND cabinet_id::text = ${session.cabinetId}::text
    `;
    await rawSqlClient`
      INSERT INTO audit_logs (id, actor_type, actor_id, cabinet_id, action, target_type, target_id)
      VALUES (${crypto.randomUUID()}::text, 'practitioner', ${session.practitionerId}::text, ${session.cabinetId}::text, 'invite_token_revoked', 'invite_token', ${params.id}::text)
    `;
    return NextResponse.json({ success: true });
  }

  // SQLite (dev)
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
