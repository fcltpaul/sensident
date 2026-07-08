import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { inviteTokens, auditLogs } from '@/db/schema';
import { and, eq, isNull, gt } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { readInviteTokenCookie, clearInviteTokenCookie } from '@/lib/invite-token-cookie';

/**
 * Retourne le token en clair d'un invite_token du cabinet courant.
 *
 * 08/07/2026 : Auparavant, cette route renvoyait un message "token perdu,
 * cliquez sur Regenerer" car on ne stockait le token en clair que dans
 * sessionStorage cote navigateur. Maintenant, le token est aussi stocke
 * dans un cookie HttpOnly chiffre cote serveur (cf.
 * lib/invite-token-cookie.ts). Cette route peut donc reafficher le QR
 * code au prochain login / refresh, sans revoquer le token en cours.
 *
 * Auth : praticien authentifie + MFA + cabinet match.
 * Audit : une ligne par consultation (comptage des affichages QR, RGPD).
 *
 * Note securite : le token est deja public au sens "distribue via QR code".
 * Le renvoyer au praticien authentifie ne cree pas de nouvelle surface
 * d'attaque. La protection reelle reste le double opt-in email.
 */

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }

  // 1) Verifier que le token existe en BDD et appartient au cabinet
  let dbExists = false;
  if (DB_DIALECT === 'postgresql') {
    const existing = await rawSqlClient<Array<{ id: string }>>`
      SELECT id FROM invite_tokens
      WHERE id::text = ${params.id}::text
        AND cabinet_id::text = ${session.cabinetId}::text
        AND revoked_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
    `;
    dbExists = !!existing[0];
  } else {
    const existing = await db
      .select({ id: inviteTokens.id })
      .from(inviteTokens)
      .where(
        and(
          eq(inviteTokens.id, params.id),
          eq(inviteTokens.cabinetId, session.cabinetId),
          isNull(inviteTokens.revokedAt),
          gt(inviteTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);
    dbExists = !!existing[0];
  }

  if (!dbExists) {
    return NextResponse.json({ error: 'Token introuvable ou revoque.' }, { status: 404 });
  }

  // 2) Lire le token en clair depuis le cookie HttpOnly chiffre
  const stored = readInviteTokenCookie(session.cabinetId);
  if (!stored || stored.tokenId !== params.id) {
    // Le token n'est pas dans notre cookie (autre appareil, cookies vides,
    // ou > 30 jours). Le praticien doit cliquer "Regenerer".
    return NextResponse.json({
      id: params.id,
      recoverable: false,
      hint:
        "Le token a ete cree sur un autre appareil/navigateur, ou il y a plus de 30 jours. Clique sur \"Regenerer le lien\" pour reafficher un QR.",
    });
  }

  // 3) Audit de la consultation
  if (DB_DIALECT === 'postgresql') {
    await rawSqlClient`
      INSERT INTO audit_logs (id, actor_type, actor_id, cabinet_id, action, target_type, target_id)
      VALUES (${crypto.randomUUID()}::text, 'practitioner', ${session.practitionerId}::text, ${session.cabinetId}::text, 'invite_token_viewed', 'invite_token', ${params.id}::text)
    `;
  } else {
    await db.insert(auditLogs).values({
      actorType: 'practitioner',
      actorId: session.practitionerId,
      cabinetId: session.cabinetId,
      action: 'invite_token_viewed',
      targetType: 'invite_token',
      targetId: params.id,
    });
  }

  return NextResponse.json({
    id: params.id,
    token: stored.token,
    recoverable: true,
  });
}

export async function DELETE(_req: NextRequest) {
  // Supprime le cookie HttpOnly (action "oublier le cache QR" cote serveur).
  // Le token en BDD reste valide (la revocation est une action explicite separee).
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }
  clearInviteTokenCookie();
  return NextResponse.json({ ok: true });
}
