import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
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
 *
 * Fix boucle 4.1 (07/2026) :
 * - INSERT via raw SQL PG (uuid/text mismatch — cf. dashboard-stats pattern 14/06)
 * - SELECT cabinets via raw SQL PG (meme raison)
 * - SQLite : chemin Drizzle inchange (dev local)
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
  const tokenId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  const expiresAtIso = expiresAt.toISOString();

  if (DB_DIALECT === 'postgresql') {
    // Schema reel en prod : colonnes id/cabinet_id/created_by en text (cf. scripts/_check_invite_tokens.mjs).
    // Cast ::text cote colonne ET cote parametre pour eviter erreur PG.
    await rawSqlClient`
      INSERT INTO invite_tokens (id, cabinet_id, token_hash, created_by, expires_at, max_uses, used_count)
      VALUES (
        ${tokenId}::text,
        ${session.cabinetId}::text,
        ${tokenHash},
        ${session.practitionerId}::text,
        ${expiresAtIso}::timestamptz,
        ${maxUses},
        0
      )
    `;
    const cabRows = await rawSqlClient<{ id: string; slug: string }[]>`
      SELECT id, slug FROM cabinets WHERE id::text = ${session.cabinetId}::text LIMIT 1
    `;
    const cab = cabRows[0];
    if (!cab) return NextResponse.json({ error: 'Cabinet introuvable.' }, { status: 404 });

    await rawSqlClient`
      INSERT INTO audit_logs (actor_type, actor_id, cabinet_id, action)
      VALUES ('practitioner', ${session.practitionerId}::text, ${cab.id}::text, 'invite_token_created')
    `;

    const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/c/${cab.slug}/rejoindre?token=***${token}`;
    return NextResponse.json({ url, token, expiresAt: expiresAtIso, maxUses });
  }

  // SQLite (dev)
  await db.insert(inviteTokens).values({
    id: tokenId,
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

  if (DB_DIALECT === 'postgresql') {
    // Fix 05/07 : cast ::text sur cabinet_id (schema reel = text, schema Drizzle = uuid)
    const rows = await rawSqlClient<
      Array<{
        id: string;
        created_at: string;
        expires_at: string;
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
      LIMIT 10
    `;
    return NextResponse.json({
      tokens: rows.map((t) => ({
        id: t.id,
        createdAt: t.created_at,
        expiresAt: t.expires_at,
        maxUses: t.max_uses,
        usedCount: t.used_count,
      })),
    });
  }

  // SQLite (dev)
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
