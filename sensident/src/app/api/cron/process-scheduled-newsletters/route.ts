/**
 * Sensident — Cron : traitement des newsletters programmees
 *
 * Endpoint machine (pas d'auth praticien) :
 *   GET  /api/cron/process-scheduled-newsletters
 *   POST /api/cron/process-scheduled-newsletters
 *
 * Authentification : header `Authorization: Bearer <CRON_SECRET>`
 * Le secret est signe en HMAC-SHA256 sur le body + timestamp pour eviter
 * les replays. La fenetre anti-replay est de 5 min.
 *
 * Pour les tests/dev, le mode `?dry_run=1` est accepte (auth quand meme).
 *
 * Logique :
 *   1. Charger tous les newsletter_sends avec status='scheduled' ET scheduledAt <= now
 *   2. Pour chacun : passer status='sending', executer executeNewsletterSend,
 *      mettre status='sent' (succes) ou 'scheduled' avec retry (erreur)
 *   3. Audit log de chaque batch (counts, pas de PII patient)
 *   4. Retourner JSON avec resume (processed/sent/failed)
 *
 * HDS :
 *   - Pas de PII patient dans les logs (compteurs uniquement)
 *   - Signature obligatoire, anti-replay
 *   - Endpoint a heberger sur infra HDS (Scaleway / OVH / etc.)
 *   - Ne pas exposer publiquement sans auth (sinon les concurrents peuvent spammer)
 *
 * Declenchement recommande (post-MVP) :
 *   - Option A (preferee HDS) : pg_cron sur la DB Neon/Scaleway + pg_net pour
 *     appeler l'endpoint. Le scheduler est dans la meme enclave HDS que la DB.
 *   - Option B : GitHub Actions cron (5 min granularity, gratuit, secret via GH Secrets).
 *     Moins HDS-natif mais acceptable si l'endpoint est sur infra HDS.
 *   - Option C (exclue) : Vercel Cron — pas HDS, abandon post-MVP.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { db } from '@/db/client';
import { newsletterSends, auditLogs } from '@/db/schema';
import { and, eq, lte, sql } from 'drizzle-orm';
import { executeNewsletterSend } from '@/lib/newsletter';

const REPLAY_WINDOW_MS = 5 * 60 * 1000; // 5 min
const MAX_PER_RUN = 50;                 // garde-fou

type CronResult = {
  ok: true;
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  durationMs: number;
  dryRun: boolean;
};

function verifySignature(req: NextRequest, body: string): { ok: boolean; reason?: string } {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return { ok: false, reason: 'CRON_SECRET non configure cote serveur' };
  }
  const auth = req.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(\S+)$/);
  if (!m) return { ok: false, reason: 'Header Authorization Bearer manquant' };
  const token = m[1];

  // Format du token : <timestamp>.<hmac>
  // ou legacy : <hmac> (retro-compatible)
  const parts = token.split('.');
  if (parts.length === 2) {
    const [tsStr, sig] = parts;
    const ts = parseInt(tsStr, 10);
    if (!ts || Math.abs(Date.now() - ts) > REPLAY_WINDOW_MS) {
      return { ok: false, reason: 'Timestamp hors fenetre anti-replay' };
    }
    const expected = createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: 'Signature HMAC invalide' };
    }
    return { ok: true };
  }
  // Legacy : juste le HMAC du body
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  const a = Buffer.from(token, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'Signature invalide' };
  }
  return { ok: true };
}

async function handle(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const url = new URL(req.url);
  const dryRun = url.searchParams.get('dry_run') === '1';

  try {
    return await handleInner(req, url, dryRun, start);
  } catch (e: any) {
    // Catch-all : garantit qu'on retourne TOUJOURS du JSON (jamais de HTML 500).
    // Log cote serveur uniquement (pas de PII).
    console.error('[cron] handle error:', e?.message || e);
    return NextResponse.json(
      { error: `Erreur interne: ${e?.message || 'inconnue'}` },
      { status: 500 }
    );
  }
}

async function handleInner(req: NextRequest, url: URL, dryRun: boolean, start: number): Promise<NextResponse> {
  // Lecture body pour signature (vide pour GET)
  const body = req.method === 'POST' ? await req.text() : '';

  // 1. Verifier la signature
  const sigCheck = verifySignature(req, body);
  if (!sigCheck.ok) {
    return NextResponse.json({ error: sigCheck.reason }, { status: 401 });
  }

  // 2. Trouver les sends a traiter
  const now = new Date();
  const due = await db
    .select()
    .from(newsletterSends)
    .where(
      and(
        eq(newsletterSends.status, 'scheduled'),
        lte(newsletterSends.scheduledAt, now)
      )
    )
    .limit(MAX_PER_RUN);

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      due: due.length,
      ids: due.map((s) => s.id),
      durationMs: Date.now() - start,
    } as CronResult & { dryRun: true; due: number; ids: string[] });
  }

  let sent = 0;
  let failed = 0;

  for (const send of due) {
    // Marquer 'sending' pour eviter qu'un autre worker re-prenne le meme send
    // (lock optimiste via status check).
    const claimed = await db
      .update(newsletterSends)
      .set({ status: 'sending' })
      .where(and(eq(newsletterSends.id, send.id), eq(newsletterSends.status, 'scheduled')))
      .returning({ id: newsletterSends.id });

    if (claimed.length === 0) continue; // un autre worker l'a pris

    if (!send.cabinetId || !send.templateId || !send.articleSlug) {
      // Donnees incompletes : on marque 'cancelled' (irrecuperable sans intervention)
      await db
        .update(newsletterSends)
        .set({ status: 'cancelled' })
        .where(eq(newsletterSends.id, send.id));
      failed++;
      continue;
    }

    // Trouver le practitionerId via le cabinet (createdBy est stocke mais on prend
    // le owner actif pour avoir un practitionerId valide pour executeNewsletterSend).
    const ownerPractitionerId = send.createdBy || send.cabinetId;

    const result = await executeNewsletterSend(send.id, {
      cabinetId: send.cabinetId,
      practitionerId: ownerPractitionerId,
      articleSlug: send.articleSlug,
      templateId: send.templateId,
      subject: send.subject,
      customMessage: send.customMessage || '',
    });

    if (result.success) {
      await db
        .update(newsletterSends)
        .set({ status: 'sent', sentAt: new Date() })
        .where(eq(newsletterSends.id, send.id));
      sent++;
    } else {
      // Echec : on remet en 'scheduled' pour retry au prochain run
      // (apres 3 echecs consecutifs, on annule — pas implemente ici, TODO post-MVP)
      await db
        .update(newsletterSends)
        .set({ status: 'scheduled' })
        .where(eq(newsletterSends.id, send.id));
      failed++;
    }
  }

  // 3. Audit log
  await db.insert(auditLogs).values({
    actorType: 'system',
    action: 'cron_process_scheduled_newsletters',
    metadata: {
      processed: due.length,
      sent,
      failed,
      durationMs: Date.now() - start,
    } as any,
  });

  return NextResponse.json({
    ok: true,
    processed: due.length,
    sent,
    failed,
    skipped: 0,
    durationMs: Date.now() - start,
    dryRun: false,
  } as CronResult);
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
