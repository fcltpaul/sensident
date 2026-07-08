import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { auditLogs } from '@/db/schema';
import { getSessionFromCookie } from '@/lib/auth';

/**
 * Endpoint de diagnostic : log les erreurs cote serveur dans audit_logs
 * pour qu'on puisse les lire depuis Neon (ou SQLite en dev) quand une
 * page crash avec un digest Next.js opaque.
 *
 * Securite : l'acces est restreint aux praticiens authentifies. Le contenu
 * est ecrit dans audit_logs (deja audite cote admin) et n'est jamais
 * expose cote patient. Ne pas utiliser pour des PII utilisateur.
 *
 * NOTE : ce endpoint est cree pour debug le crash engagement/analytics
 * signale le 08/07/2026. A conserver ou supprimer apres diagnostic.
 */
export async function POST(req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }

  let body: { context?: string; message?: string; stack?: string; digest?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const ctx = (body.context ?? 'unknown').slice(0, 100);
  const msg = (body.message ?? '').slice(0, 2000);
  const stack = (body.stack ?? '').slice(0, 8000);
  const digest = (body.digest ?? '').slice(0, 100);

  if (DB_DIALECT === 'postgresql') {
    await rawSqlClient`
      INSERT INTO audit_logs (id, actor_type, actor_id, cabinet_id, action, target_type, target_id, metadata)
      VALUES (
        ${id}::text,
        'system',
        ${session.practitionerId}::text,
        ${session.cabinetId}::text,
        'debug_error_log',
        'page',
        ${ctx}::text,
        ${JSON.stringify({ digest, message: msg, stack })}::jsonb
      )
    `;
  } else {
    await db.insert(auditLogs).values({
      actorType: 'system',
      actorId: session.practitionerId,
      cabinetId: session.cabinetId,
      action: 'debug_error_log',
      targetType: 'page',
      targetId: ctx,
      metadata: JSON.stringify({ digest, message: msg, stack }),
    });
  }

  return NextResponse.json({ ok: true, id });
}
