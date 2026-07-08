/**
 * Sensident - Logger d'erreurs server-side
 *
 * 08/07/2026 : en production, Next.js masque error.message dans les
 * Server Components (politique anti-leak). Le seul identifiant est
 * error.digest, qui ne donne pas la cause.
 *
 * Ce module permet de logguer cote serveur (ou le message est preserve)
 * dans audit_logs Neon pour diagnostic.
 *
 * Usage dans une server component qui crash :
 *
 *   try {
 *     const data = await someQuery();
 *   } catch (err) {
 *     logServerError('engagement:someQuery', err);
 *     throw err;
 *   }
 */
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { auditLogs } from '@/db/schema';

interface LogOpts {
  context: string;
  cabinetId?: string;
  practitionerId?: string;
}

export function logServerError(err: unknown, opts: LogOpts): void {
  const e = err instanceof Error ? err : new Error(String(err));
  const id = crypto.randomUUID();
  const ctx = (opts.context ?? 'unknown').slice(0, 100);
  const msg = (e.message ?? '').slice(0, 2000);
  const stack = (e.stack ?? '').slice(0, 8000);
  const cabinetId = opts.cabinetId ?? null;
  const practitionerId = opts.practitionerId ?? null;

  // Log console (visible dans Vercel logs)
  console.error(`[${ctx}]`, e);

  // Log Neon (visible dans Studio SQL)
  Promise.resolve().then(async () => {
    try {
      if (DB_DIALECT === 'postgresql') {
        await rawSqlClient`
          INSERT INTO audit_logs (id, actor_type, actor_id, cabinet_id, action, target_type, target_id, metadata)
          VALUES (
            ${id}::text,
            'system',
            ${practitionerId ?? 'server'}::text,
            ${cabinetId ?? 'server'}::text,
            'server_error_log',
            'page',
            ${ctx}::text,
            ${JSON.stringify({ message: msg, stack })}::jsonb
          )
        `;
      } else {
        await db.insert(auditLogs).values({
          actorType: 'system',
          actorId: practitionerId ?? 'server',
          cabinetId: cabinetId ?? 'server',
          action: 'server_error_log',
          targetType: 'page',
          targetId: ctx,
          metadata: JSON.stringify({ message: msg, stack }),
        });
      }
    } catch {
      // Si l'insert Neon echoue aussi, on ne peut rien faire de plus.
      // Le console.error ci-dessus reste la seule trace.
    }
  });
}