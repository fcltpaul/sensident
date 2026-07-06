import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { inviteTokens, cabinets } from '@/db/schema';
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { InvitationPanel } from './invitation-panel';

/**
 * Fix 06/07/2026 — Drizzle `eq(cabinetId)` crashait cote Neon car Drizzle
 * depose cabinet_id comme uuid alors que la colonne reelle en prod est en text.
 * On aligne sur le pattern `rawSqlClient + ::text` deja applique a
 * `/api/cabinet/invite-tokens` (boucle 4.1) et sur la liste des brouillons.
 *
 * En SQLite (dev), le chemin Drizzle reste inchange.
 */
export default async function InvitationPage() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  let tokens: Array<{
    id: string;
    createdAt: Date;
    expiresAt: Date;
    maxUses: number;
    usedCount: number;
  }> = [];

  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<
      Array<{
        id: string;
        created_at: string | Date;
        expires_at: string | Date;
        max_uses: number;
        used_count: number;
      }>
    >`
      SELECT id, created_at, expires_at, max_uses, used_count
      FROM invite_tokens
      WHERE cabinet_id::text = ${session.cabinetId}::text
        AND revoked_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 20
    `;
    tokens = rows.map((r) => ({
      id: r.id,
      createdAt: new Date(r.created_at),
      expiresAt: new Date(r.expires_at),
      maxUses: r.max_uses,
      usedCount: r.used_count,
    }));

    const cabRows = await rawSqlClient<Array<{ id: string; slug: string }>>`
      SELECT id, slug FROM cabinets WHERE id::text = ${session.cabinetId}::text LIMIT 1
    `;
    const cab = cabRows[0];
    if (!cab) redirect('/login');

    return (
      <div className="space-y-6 p-6 md:p-8">
        <div>
          <h1 className="text-2xl font-bold">Liens d&apos;invitation</h1>
          <p className="text-sm text-muted-foreground">
            Generez des liens (ou QR codes) que vos patients utilisent pour s&apos;inscrire.
            Vous pouvez distribuer ces liens au fauteuil, par email, ou sur vos reseaux.
          </p>
        </div>

        <InvitationPanel
          cabinetSlug={cab.slug}
          activeTokens={tokens.map((t) => ({
            id: t.id,
            createdAt: t.createdAt.toISOString(),
            expiresAt: t.expiresAt.toISOString(),
            maxUses: t.maxUses,
            usedCount: t.usedCount,
          }))}
        />
      </div>
    );
  }

  // SQLite (dev)
  const nowD = new Date();

  tokens = await db
    .select({
      id: inviteTokens.id,
      createdAt: inviteTokens.createdAt,
      expiresAt: inviteTokens.expiresAt,
      maxUses: inviteTokens.maxUses,
      usedCount: inviteTokens.usedCount,
    })
    .from(inviteTokens)
    .where(
      and(
        eq(inviteTokens.cabinetId, session.cabinetId),
        isNull(inviteTokens.revokedAt),
        gt(inviteTokens.expiresAt, nowD),
      ),
    )
    .orderBy(desc(inviteTokens.createdAt))
    .limit(20);

  const cab = (
    await db
      .select({ id: cabinets.id, slug: cabinets.slug })
      .from(cabinets)
      .where(eq(cabinets.id, session.cabinetId))
      .limit(1)
  )[0];
  if (!cab) redirect('/login');

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Liens d&apos;invitation</h1>
        <p className="text-sm text-muted-foreground">
          Generez des liens (ou QR codes) que vos patients utilisent pour s&apos;inscrire.
          Vous pouvez distribuer ces liens au fauteuil, par email, ou sur vos reseaux.
        </p>
      </div>

      <InvitationPanel
        cabinetSlug={cab.slug}
        activeTokens={tokens.map((t) => ({
          id: t.id,
          createdAt: t.createdAt.toISOString(),
          expiresAt: t.expiresAt.toISOString(),
          maxUses: t.maxUses,
          usedCount: t.usedCount,
        }))}
      />
    </div>
  );
}
