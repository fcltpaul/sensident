import { db } from '@/db/client';
import { D } from '@/db/date-helper';
import { inviteTokens, cabinets } from '@/db/schema';
import { eq, and, gt, isNull, desc, sql } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { InvitationPanel } from './invitation-panel';

export default async function InvitationPage() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  const nowD = D(new Date());

  const tokens = await db
    .select()
    .from(inviteTokens)
    .where(
      and(
        eq(inviteTokens.cabinetId, session.cabinetId),
        isNull(inviteTokens.revokedAt),
        sql`${inviteTokens.expiresAt} > ${nowD}`
      )
    )
    .orderBy(desc(inviteTokens.createdAt))
    .limit(20);

  const cab = (await db.select().from(cabinets).where(eq(cabinets.id, session.cabinetId)).limit(1))[0];
  if (!cab) redirect('/login');

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Liens d'invitation</h1>
        <p className="text-sm text-muted-foreground">
          Generez des liens (ou QR codes) que vos patients utilisent pour s'inscrire.
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
