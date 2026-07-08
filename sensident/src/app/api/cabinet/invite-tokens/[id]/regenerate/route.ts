import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { inviteTokens, cabinets, auditLogs } from '@/db/schema';
import { and, eq, isNull, gt } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { setInviteTokenCookie } from '@/lib/invite-token-cookie';

/**
 * Regenere le token d'invitation du cabinet (action rare et explicite).
 *
 * - Revoque tous les tokens actifs du cabinet (pour ne garder qu'un seul)
 * - Cree un nouveau token permanent (10 ans, 100k usages)
 * - Retourne le token en clair UNE fois
 *
 * Effet : tous les QR codes anterieurs distribues deviennent invalides.
 * Utiliser cette action UNIQUEMENT si le QR a ete compromis.
 */

const PERMANENT_MAX_USES = 100_000;
const PERMANENT_DURATION_DAYS = 3650;

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }

  // Slug du cabinet
  let slug: string | null = null;
  if (DB_DIALECT === 'postgresql') {
    const cabRows = await rawSqlClient<Array<{ slug: string }>>`
      SELECT slug FROM cabinets WHERE id::text = ${session.cabinetId}::text LIMIT 1
    `;
    slug = cabRows[0]?.slug ?? null;
  } else {
    const cabRows = await db
      .select({ slug: cabinets.slug })
      .from(cabinets)
      .where(eq(cabinets.id, session.cabinetId))
      .limit(1);
    slug = cabRows[0]?.slug ?? null;
  }

  if (!slug) {
    return NextResponse.json({ error: 'Cabinet introuvable.' }, { status: 404 });
  }

  // 1) Revoquer l'ancien
  if (DB_DIALECT === 'postgresql') {
    await rawSqlClient`
      UPDATE invite_tokens
      SET revoked_at = NOW()
      WHERE id::text = ${params.id}::text
        AND cabinet_id::text = ${session.cabinetId}::text
        AND revoked_at IS NULL
    `;
  } else {
    await db
      .update(inviteTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(inviteTokens.id, params.id),
          eq(inviteTokens.cabinetId, session.cabinetId),
          isNull(inviteTokens.revokedAt)
        )
      );
  }

  // 2) Audit revocation
  if (DB_DIALECT === 'postgresql') {
    await rawSqlClient`
      INSERT INTO audit_logs (id, actor_type, actor_id, cabinet_id, action, target_type, target_id, metadata)
      VALUES (
        ${crypto.randomUUID()}::text,
        'practitioner',
        ${session.practitionerId}::text,
        ${session.cabinetId}::text,
        'invite_token_revoked_for_regen',
        'invite_token',
        ${params.id}::text,
        ${JSON.stringify({ reason: 'manual_regeneration' })}::jsonb
      )
    `;
  } else {
    await db.insert(auditLogs).values({
      actorType: 'practitioner',
      actorId: session.practitionerId,
      cabinetId: session.cabinetId,
      action: 'invite_token_revoked_for_regen',
      targetType: 'invite_token',
      targetId: params.id,
      metadata: JSON.stringify({ reason: 'manual_regeneration' }),
    });
  }

  // 3) Creer le nouveau
  const newTokenId = crypto.randomUUID();
  const plainToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');
  const expiresAt = new Date(Date.now() + PERMANENT_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const expiresAtIso = expiresAt.toISOString();

  if (DB_DIALECT === 'postgresql') {
    await rawSqlClient`
      INSERT INTO invite_tokens (id, cabinet_id, token_hash, created_by, expires_at, max_uses, used_count)
      VALUES (
        ${newTokenId}::text,
        ${session.cabinetId}::text,
        ${tokenHash},
        ${session.practitionerId}::text,
        ${expiresAtIso}::timestamptz,
        ${PERMANENT_MAX_USES},
        0
      )
    `;
    await rawSqlClient`
      INSERT INTO audit_logs (id, actor_type, actor_id, cabinet_id, action, target_type, target_id)
      VALUES (${crypto.randomUUID()}::text, 'practitioner', ${session.practitionerId}::text, ${session.cabinetId}::text, 'invite_token_created', 'invite_token', ${newTokenId}::text)
    `;
  } else {
    await db.insert(inviteTokens).values({
      id: newTokenId,
      cabinetId: session.cabinetId,
      tokenHash,
      createdBy: session.practitionerId,
      expiresAt,
      maxUses: PERMANENT_MAX_USES,
    });
    await db.insert(auditLogs).values({
      actorType: 'practitioner',
      actorId: session.practitionerId,
      cabinetId: session.cabinetId,
      action: 'invite_token_created',
      targetType: 'invite_token',
      targetId: newTokenId,
    });
  }

  const base = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/c/${slug}/rejoindre`;
  const url = `${base}?token=${encodeURIComponent(plainToken)}`;

  // Stocke le nouveau token dans le cookie HttpOnly chiffre pour affichage
  // futur sans re-cliquer sur Regenerer.
  setInviteTokenCookie(session.cabinetId, newTokenId, plainToken);

  return NextResponse.json({
    id: newTokenId,
    url,
    token: plainToken,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAtIso,
    maxUses: PERMANENT_MAX_USES,
    usedCount: 0,
    permanent: true,
    regenerated: true,
  });
}
