/**
 * Sensident — Retention cleanup (cron quotidien)
 *
 * Objectif : conformite RGPD art. 5(1)(e) — minimisation de la conservation.
 *
 * Politique de retention (3 ans post-desabonnement) :
 *  - patient_consents :
 *      Si unsubscribedAt < (now - 3 ans) ET email_hash LIKE 'erased_%' :
 *        suppression DEFINITIVE du row.
 *  - patient_magic_links :
 *      expiresAt < (now - 90 jours) : suppression definitive (deja expire).
 *  - newsletter_recipients :
 *      status = 'erased' ET unsubscribedAt < (now - 3 ans) :
 *        suppression definitive.
 *  - reading_sessions :
 *      patient_email_hash LIKE 'erased_%' ET startedAt < (now - 3 ans) :
 *        suppression definitive.
 *  - article_heartbeats :
 *      via cascade FK depuis reading_sessions.
 *  - practitioner_sessions :
 *      expiresAt < (now - 30 jours) : suppression definitive.
 *  - rate_limits :
 *      ts < (now - 24h) : suppression definitive.
 *  - audit_logs :
 *      JAMAIS supprime (preuve legale). Seulement flag de retention.
 *
 * Cible : PostgreSQL HDS (prod). En dev SQLite, on logge les actions sans rien
 * supprimer (les schemas divergent — schema.sqlite.ts ne contient pas toutes
 * les tables).
 *
 * Usage :
 *   npx tsx scripts/retention-purge.ts             # dry-run (defaut)
 *   npx tsx scripts/retention-purge.ts --apply      # applique les suppressions
 *   npx tsx scripts/retention-purge.ts --days=1095  # override 3 ans
 *
 * Cron recommande : tous les jours a 03:00 Europe/Paris.
 *   0 3 * * *  cd /app && npx tsx scripts/retention-purge.ts --apply >> /var/log/sensident/retention.log 2>&1
 */

import { db } from '../src/db/client';
import { sql } from 'drizzle-orm';

const RETENTION_DAYS = 3 * 365; // 3 ans
const MAGIC_LINK_RETENTION_DAYS = 90;
const SESSION_RETENTION_DAYS = 30;
const RATE_LIMIT_RETENTION_HOURS = 24;

function parseArgs(): { apply: boolean; daysOverride?: number } {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const daysArg = args.find((a) => a.startsWith('--days='));
  const daysOverride = daysArg ? parseInt(daysArg.split('=')[1], 10) : undefined;
  return { apply, daysOverride };
}

function nowMinusDays(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

interface PurgeStats {
  patient_consents: number;
  newsletter_recipients: number;
  reading_sessions: number;
  patient_magic_links: number;
  practitioner_sessions: number;
  rate_limits: number;
  article_heartbeats: number;
  total: number;
}

async function countOrDelete(table: string, whereSql: string, apply: boolean): Promise<number> {
  if (apply) {
    // Drizzle ne supporte pas toutes les operations sur PG en mode portable,
    // on utilise sql brut.
    const res: any = await db.execute({ sql: `DELETE FROM ${table} WHERE ${whereSql}`, params: [] });
    return (res?.changes ?? res?.count ?? 0) as number;
  }
  const res: any = await db.execute({ sql: `SELECT COUNT(*)::int AS c FROM ${table} WHERE ${whereSql}`, params: [] });
  return (res?.c ?? res?.rows?.[0]?.c ?? 0) as number;
}

export async function runRetention(apply: boolean, daysOverride?: number): Promise<PurgeStats> {
  const retentionDays = daysOverride ?? RETENTION_DAYS;
  const cutoffAnonymized = nowMinusDays(retentionDays);
  const cutoffMagicLink = nowMinusDays(MAGIC_LINK_RETENTION_DAYS);
  const cutoffSession = nowMinusDays(SESSION_RETENTION_DAYS);
  const cutoffRateLimit = nowMinusDays(0);
  cutoffRateLimit.setHours(cutoffRateLimit.getHours() - RATE_LIMIT_RETENTION_HOURS);

  // Format ISO
  const iso = (d: Date) => d.toISOString();

  const stats: PurgeStats = {
    patient_consents: 0,
    newsletter_recipients: 0,
    reading_sessions: 0,
    patient_magic_links: 0,
    practitioner_sessions: 0,
    rate_limits: 0,
    article_heartbeats: 0,
    total: 0,
  };

  // 1. patient_consents anonymises > 3 ans
  stats.patient_consents = await countOrDelete(
    'patient_consents',
    `email_hash LIKE 'erased\\_%' AND COALESCE(unsubscribed_at, created_at) < '${iso(cutoffAnonymized)}'`,
    apply
  );

  // 2. newsletter_recipients effaces > 3 ans
  stats.newsletter_recipients = await countOrDelete(
    'newsletter_recipients',
    `status = 'erased' AND COALESCE(unsubscribed_at, sent_at, created_at) < '${iso(cutoffAnonymized)}'`,
    apply
  );

  // 3. reading_sessions anonymisees > 3 ans (CASCADE supprime article_heartbeats en PG)
  stats.reading_sessions = await countOrDelete(
    'reading_sessions',
    `patient_email_hash LIKE 'erased\\_%' AND started_at < '${iso(cutoffAnonymized)}'`,
    apply
  );

  // 4. patient_magic_links expires > 90 jours
  stats.patient_magic_links = await countOrDelete(
    'patient_magic_links',
    `expires_at < '${iso(cutoffMagicLink)}'`,
    apply
  );

  // 5. practitioner_sessions expires > 30 jours
  stats.practitioner_sessions = await countOrDelete(
    'practitioner_sessions',
    `expires_at < '${iso(cutoffSession)}'`,
    apply
  );

  // 6. rate_limits > 24h
  stats.rate_limits = await countOrDelete(
    'rate_limits',
    `ts < '${iso(cutoffRateLimit)}'`,
    apply
  );

  // 7. article_heartbeats (orphelins — au cas ou cascade ne fonctionne pas)
  stats.article_heartbeats = await countOrDelete(
    'article_heartbeats',
    `reading_session_id NOT IN (SELECT id FROM reading_sessions)`,
    apply
  );

  stats.total =
    stats.patient_consents +
    stats.newsletter_recipients +
    stats.reading_sessions +
    stats.patient_magic_links +
    stats.practitioner_sessions +
    stats.rate_limits +
    stats.article_heartbeats;

  return stats;
}

async function main() {
  const { apply, daysOverride } = parseArgs();

  console.log('=== Sensident — Retention cleanup ===');
  console.log(`Date       : ${new Date().toISOString()}`);
  console.log(`Mode       : ${apply ? 'APPLY (suppressions reelles)' : 'DRY-RUN (aucune suppression)'}`);
  console.log(`Retention  : ${daysOverride ?? RETENTION_DAYS} jours (3 ans par defaut)`);
  console.log('');

  // En SQLite, le schema est different. On detecte et on sort proprement.
  if ((process.env.DATABASE_URL || '').startsWith('file:')) {
    console.log('[INFO] Mode SQLite detecte (dev). Les tables PG (patient_consents, etc.)');
    console.log('       n\'existent pas en SQLite. Sortie sans action.');
    console.log('       Ce script est concu pour PostgreSQL HDS en production.');
    return;
  }

  const t0 = Date.now();
  const stats = await runRetention(apply, daysOverride);
  const duration = Date.now() - t0;

  console.log('Resultats :');
  console.log(`  patient_consents     : ${stats.patient_consents}`);
  console.log(`  newsletter_recipients: ${stats.newsletter_recipients}`);
  console.log(`  reading_sessions     : ${stats.reading_sessions}`);
  console.log(`  patient_magic_links  : ${stats.patient_magic_links}`);
  console.log(`  practitioner_sessions: ${stats.practitioner_sessions}`);
  console.log(`  rate_limits          : ${stats.rate_limits}`);
  console.log(`  article_heartbeats   : ${stats.article_heartbeats}`);
  console.log('  ---');
  console.log(`  TOTAL                : ${stats.total} rows ${apply ? 'supprimes' : 'a supprimer'}`);
  console.log(`Duree                  : ${duration} ms`);

  if (!apply && stats.total > 0) {
    console.log('');
    console.log('Pour appliquer : npx tsx scripts/retention-purge.ts --apply');
  }

  // Audit log : on enregistre le run lui-meme (preuve d'execution)
  try {
    await db.execute({
      sql: `INSERT INTO audit_logs (actor_type, action, target_type, metadata) VALUES ($1, $2, $3, $4)`,
      params: ['system', 'retention_purge_run', 'system', JSON.stringify({ ...stats, apply, days: daysOverride ?? RETENTION_DAYS })],
    });
  } catch {
    // Si la table audit_logs n'existe pas (cas limite), on ne fait pas planter
  }
}

main().catch((err) => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
