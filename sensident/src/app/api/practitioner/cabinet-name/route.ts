import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { cabinets, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';

const Schema = z.object({ name: z.string().min(1).max(100) });

/**
 * PUT /api/practitioner/cabinet-name
 *
 * Audit 2026-07-07 03h (fix Neon) :
 *  - La table cabinets en Neon prod n'a PAS la colonne updated_at.
 *  - Avant : Drizzle envoyait {name, updatedAt} => 500 PG column does not exist.
 *  - Fix : branche PG en raw SQL sans updated_at (branche SQLite inchangee).
 *  - Audit en raw SQL Neon (jsonb + cast).
 */
export async function PUT(req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Nom invalide.' }, { status: 400 });

  if (DB_DIALECT === 'postgresql') {
    await rawSqlClient`
      UPDATE cabinets SET name = ${parsed.data.name}
      WHERE id::text = ${session.cabinetId}::text
    `;
    // Audit best-effort
    try {
      await rawSqlClient`
        INSERT INTO audit_logs (id, ts, actor_type, actor_id, cabinet_id, action, target_type, target_id)
        VALUES (
          ${crypto.randomUUID()}::text,
          NOW(),
          'practitioner',
          ${session.practitionerId}::text,
          ${session.cabinetId}::text,
          'cabinet_name_updated',
          'cabinet',
          ${session.cabinetId}::text
        )
      `;
    } catch (e) {
      console.error('[cabinet-name] audit insert failed:', e);
    }
  } else {
    await db.update(cabinets).set({ name: parsed.data.name, updatedAt: new Date() }).where(eq(cabinets.id, session.cabinetId));
    await db.insert(auditLogs).values({
      actorType: 'practitioner',
      actorId: session.practitionerId,
      cabinetId: session.cabinetId,
      action: 'cabinet_name_updated',
      targetType: 'cabinet',
      targetId: session.cabinetId,
    });
  }
  return NextResponse.json({ success: true });
}