import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { inviteTokens, cabinets, auditLogs } from '@/db/schema';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';

/**
 * Token d'invitation unique par cabinet (07/2026).
 *
 * Spec Paul 06/07 : un seul QR code / lien par cabinet, partage entre tous
 * les patients, qui ne change pas. Le token est permanent (10 ans, 100 000
 * utilisations). Le POST cree le token permanent s'il n'existe pas, ou
 * retourne l'existant sinon -> le bouton "Afficher mon lien" est idempotent.
 *
 * IMPORTANT : on ne peut pas re-afficher le token en clair depuis la BDD
 * (on ne stocke que le hash). Donc l'API ne retourne le token en clair
 * QUE lors d'une creation. Pour reafficher un QR existant, le frontend
 * utilise GET /api/cabinet/invite-tokens/:id/clear (auth praticien + audit).
 *
 * Cote Neon, on reste en raw SQL (cf. dette cabinet_id uuid vs text).
 */

const PERMANENT_MAX_USES = 100_000;
const PERMANENT_DURATION_DAYS = 3650; // ~10 ans

interface CabinetTokenRow {
  id: string;
  created_at: string | Date;
  expires_at: string | Date;
  max_uses: number;
  used_count: number;
}

interface CabinetSlugRow {
  slug: string;
}

async function getOrCreateCabinetToken(
  cabinetId: string,
  practitionerId: string,
): Promise<{ row: CabinetTokenRow; plainToken: string | null }> {
  if (DB_DIALECT === 'postgresql') {
    const existing = await rawSqlClient<CabinetTokenRow[]>`
      SELECT id, created_at, expires_at, max_uses, used_count
      FROM invite_tokens
      WHERE cabinet_id::text = ${cabinetId}::text
        AND revoked_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;
    if (existing[0]) return { row: existing[0], plainToken: null };

    const tokenId = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAtIso = new Date(
      Date.now() + PERMANENT_DURATION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    await rawSqlClient`
      INSERT INTO invite_tokens (id, cabinet_id, token_hash, created_by, expires_at, max_uses, used_count)
      VALUES (
        ${tokenId}::text,
        ${cabinetId}::text,
        ${tokenHash},
        ${practitionerId}::text,
        ${expiresAtIso}::timestamptz,
        ${PERMANENT_MAX_USES},
        0
      )
    `;

    await rawSqlClient`
      INSERT INTO audit_logs (id, actor_type, actor_id, cabinet_id, action, target_type, target_id)
      VALUES (${crypto.randomUUID()}::text, 'practitioner', ${practitionerId}::text, ${cabinetId}::text, 'invite_token_created', 'invite_token', ${tokenId}::text)
    `;

    return {
      row: {
        id: tokenId,
        created_at: new Date(),
        expires_at: expiresAtIso,
        max_uses: PERMANENT_MAX_USES,
        used_count: 0,
      },
      plainToken: token,
    };
  }

  // SQLite (dev)
  const existing = await db
    .select()
    .from(inviteTokens)
    .where(
      and(
        eq(inviteTokens.cabinetId, cabinetId),
        isNull(inviteTokens.revokedAt),
        gt(inviteTokens.expiresAt, new Date()),
      ),
    )
    .orderBy(inviteTokens.createdAt)
    .limit(1);

  if (existing[0]) {
    return {
      row: {
        id: existing[0].id,
        created_at: existing[0].createdAt,
        expires_at: existing[0].expiresAt,
        max_uses: existing[0].maxUses,
        used_count: existing[0].usedCount,
      },
      plainToken: null,
    };
  }

  const tokenId = crypto.randomUUID();
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + PERMANENT_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(inviteTokens).values({
    id: tokenId,
    cabinetId,
    tokenHash,
    createdBy: practitionerId,
    expiresAt,
    maxUses: PERMANENT_MAX_USES,
  });

  await db.insert(auditLogs).values({
    actorType: 'practitioner',
    actorId: practitionerId,
    cabinetId,
    action: 'invite_token_created',
    targetType: 'invite_token',
    targetId: tokenId,
  });

  return {
    row: {
      id: tokenId,
      created_at: new Date(),
      expires_at: expiresAt,
      max_uses: PERMANENT_MAX_USES,
      used_count: 0,
    },
    plainToken: token,
  };
}

async function getCabinetSlug(cabinetId: string): Promise<string | null> {
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<CabinetSlugRow[]>`
      SELECT slug FROM cabinets WHERE id::text = ${cabinetId}::text LIMIT 1
    `;
    return rows[0]?.slug ?? null;
  }
  const rows = await db
    .select({ slug: cabinets.slug })
    .from(cabinets)
    .where(eq(cabinets.id, cabinetId))
    .limit(1);
  return rows[0]?.slug ?? null;
}

function buildInviteUrl(slug: string, token: string | null): string {
  const base = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/c/${slug}/rejoindre`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

export async function POST(_req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }

  const slug = await getCabinetSlug(session.cabinetId);
  if (!slug) {
    return NextResponse.json({ error: 'Cabinet introuvable.' }, { status: 404 });
  }

  const { row, plainToken } = await getOrCreateCabinetToken(
    session.cabinetId,
    session.practitionerId,
  );

  return NextResponse.json({
    id: row.id,
    cabinetId: session.cabinetId,
    cabinetSlug: slug,
    url: buildInviteUrl(slug, plainToken), // URL complete avec token si nouveau
    publicUrl: buildInviteUrl(slug, null), // URL du cabinet seule (pour QR public)
    token: plainToken, // null si token existant, sinon la valeur en clair 1 fois
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : row.expires_at,
    maxUses: row.max_uses,
    usedCount: row.used_count,
    permanent: true,
  });
}

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }

  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<CabinetTokenRow[]>`
      SELECT id, created_at, expires_at, max_uses, used_count
      FROM invite_tokens
      WHERE cabinet_id::text = ${session.cabinetId}::text
        AND revoked_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const row = rows[0];
    return NextResponse.json({
      tokens: row
        ? [
            {
              id: row.id,
              createdAt:
                row.created_at instanceof Date
                  ? row.created_at.toISOString()
                  : row.created_at,
              expiresAt:
                row.expires_at instanceof Date
                  ? row.expires_at.toISOString()
                  : row.expires_at,
              maxUses: row.max_uses,
              usedCount: row.used_count,
              permanent: true,
            },
          ]
        : [],
    });
  }

  // SQLite (dev)
  const rows = await db
    .select()
    .from(inviteTokens)
    .where(
      and(
        eq(inviteTokens.cabinetId, session.cabinetId),
        isNull(inviteTokens.revokedAt),
        gt(inviteTokens.expiresAt, new Date()),
      ),
    )
    .orderBy(inviteTokens.createdAt)
    .limit(1);

  const row = rows[0];
  return NextResponse.json({
    tokens: row
      ? [
          {
            id: row.id,
            createdAt: row.createdAt.toISOString(),
            expiresAt: row.expiresAt.toISOString(),
            maxUses: row.maxUses,
            usedCount: row.usedCount,
            permanent: true,
          },
        ]
      : [],
  });
}
