-- Sensident — Retention cleanup SQL (PostgreSQL HDS)
--
-- Politique : 3 ans post-desabonnement pour donnees patient anonymisees.
-- Cible : pg_cron quotidien a 03:00 Europe/Paris.
--
-- Installation pg_cron :
--   SELECT cron.schedule(
--     'sensident-retention',
--     '0 3 * * *',
--     $$DELETE FROM audit_logs WHERE action='retention_run_marker' AND created_at < (now() - interval '30 days');$$
--   );
--
-- NB : ce fichier est une version "executable" du script retention-purge.ts.
--      Les deux font la meme chose, choisir l'un ou l'autre selon le runner.

BEGIN;

-- 1. patient_consents anonymises > 3 ans
DELETE FROM patient_consents
WHERE email_hash LIKE 'erased\_%'
  AND COALESCE(unsubscribed_at, created_at) < (now() - interval '3 years');

-- 2. newsletter_recipients effaces > 3 ans
DELETE FROM newsletter_recipients
WHERE status = 'erased'
  AND COALESCE(unsubscribed_at, sent_at, created_at) < (now() - interval '3 years');

-- 3. reading_sessions anonymisees > 3 ans (CASCADE supprime article_heartbeats)
DELETE FROM reading_sessions
WHERE patient_email_hash LIKE 'erased\_%'
  AND started_at < (now() - interval '3 years');

-- 4. patient_magic_link expires > 90 jours
DELETE FROM patient_magic_links
WHERE expires_at < (now() - interval '90 days');

-- 5. practitioner_sessions expires > 30 jours
DELETE FROM practitioner_sessions
WHERE expires_at < (now() - interval '30 days');

-- 6. rate_limits > 24h
DELETE FROM rate_limits
WHERE ts < (now() - interval '24 hours');

-- 7. article_heartbeats orphelins
DELETE FROM article_heartbeats
WHERE reading_session_id NOT IN (SELECT id FROM reading_sessions);

-- Audit du run
INSERT INTO audit_logs (actor_type, action, target_type, metadata, created_at)
VALUES (
  'system',
  'retention_purge_run',
  'system',
  jsonb_build_object(
    'ran_at', now(),
    'policy', '3y_post_unsubscribe'
  ),
  now()
);

COMMIT;
