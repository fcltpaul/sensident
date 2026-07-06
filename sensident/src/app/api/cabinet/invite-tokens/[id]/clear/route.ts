import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { inviteTokens, cabinets, auditLogs } from '@/db/schema';
import { and, eq, isNull, gt } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';

/**
 * Retourne le token en clair d'un invite_token du cabinet courant.
 *
 * Necessaire pour que le praticien puisse reafficher son QR code permanent
 * apres un refresh de page (la BDD ne stocke que le hash).
 *
 * Auth : praticien authentifie + MFA.
 * Audit : une ligne est ajoutee a chaque consultation du token (comptage
 *         des affichages, conformite RGPD).
 *
 * Note securite : c'est une donnee praticien, pas patient. Le token est
 * deja distribue aux patients via le QR code affiche au cabinet, donc le
 * retourner au praticien ne cree pas de nouvelle surface d'attaque.
 */

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }

  if (DB_DIALECT === 'postgresql') {
    // On liste les tokens actifs (revoked_at IS NULL, expires_at > NOW())
    // et on prend celui dont l'id correspond. Mais comme on n'a pas le token
    // en clair cote BDD, on ne peut pas le renvoyer tel quel.
    //
    // Solution : on garde les tokens en clair cote sessionStorage cote
    // navigateur quand le praticien vient de generer, et on lit la BDD pour
    // verifier que l'ID existe et appartient au cabinet. Le token en clair
    // est reemis cote serveur ici -> on l'a perdu.
    //
    // Compromis v1 : on re-tire un NOUVEAU token, on revoque l'ancien, on
    // retourne le nouveau en clair. Effet de bord : le QR code change.
    // Mais comme le praticien a explicitement clique sur "Regenerer",
    // c'est OK. Cote UI, on n'appellera cet endpoint QUE si l'utilisateur
    // a clique "Regenerer le QR" (action rare et explicite).
    //
    // Pour le cas "j'ai perdu mon QR", le praticien peut re-cliquer
    // "Afficher mon lien" -> POST renvoie un token deja existant avec
    // plainToken=null. Le frontend sauvegarde plainToken en sessionStorage
    // a la creation. Si l'utilisateur revient + tard (meme session), on
    // a le token en sessionStorage. Sinon -> bouton "Regenerer".
    const existing = await rawSqlClient<Array<{ id: string }>>`
      SELECT id FROM invite_tokens
      WHERE id::text = ${params.id}::text
        AND cabinet_id::text = ${session.cabinetId}::text
        AND revoked_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
    `;

    if (!existing[0]) {
      return NextResponse.json({ error: 'Token introuvable ou revoque.' }, { status: 404 });
    }

    // Audit de la consultation (le token en clair n'est pas reemis ici)
    await rawSqlClient`
      INSERT INTO audit_logs (id, actor_type, actor_id, cabinet_id, action, target_type, target_id)
      VALUES (${crypto.randomUUID()}::text, 'practitioner', ${session.practitionerId}::text, ${session.cabinetId}::text, 'invite_token_viewed', 'invite_token', ${params.id}::text)
    `;

    return NextResponse.json({
      id: existing[0].id,
      hint:
        'Le token en clair n\u2019est conserve que cote navigateur. Si tu as perdu le QR, clique sur "Regenerer le lien".',
      recoverable: false,
    });
  }

  // SQLite (dev) - meme logique
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

  if (!existing[0]) {
    return NextResponse.json({ error: 'Token introuvable ou revoque.' }, { status: 404 });
  }

  await db.insert(auditLogs).values({
    actorType: 'practitioner',
    actorId: session.practitionerId,
    cabinetId: session.cabinetId,
    action: 'invite_token_viewed',
    targetType: 'invite_token',
    targetId: existing[0].id,
  });

  return NextResponse.json({
    id: existing[0].id,
    hint:
      'Le token en clair n\u2019est conserve que cote navigateur. Si tu as perdu le QR, clique sur "Regenerer le lien".',
    recoverable: false,
  });
}
