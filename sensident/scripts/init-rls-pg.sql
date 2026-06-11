-- ============================================
-- Sensident — Init RLS PostgreSQL
-- ============================================
-- Script dédié à l'activation des policies RLS
-- Exécuter après le schema principal (src/db/schema.sql)
-- Usage: psql $DATABASE_URL -f scripts/init-rls-pg.sql
-- ============================================

BEGIN;

-- Activer RLS sur les tables sensibles
ALTER TABLE practitioner_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_tokens                ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_consents             ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_magic_links          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_sessions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_heartbeats           ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_sends             ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_recipients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cabinet_subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                   ENABLE ROW LEVEL SECURITY;

-- Politique par defaut : deny all (RLS stricte)
-- Le cabinet_id est passé via SET app.cabinet_id AVANT chaque transaction.

CREATE POLICY patient_consents_cabinet_isolation ON patient_consents
  USING (cabinet_id::text = current_setting('app.cabinet_id', true))
  WITH CHECK (cabinet_id::text = current_setting('app.cabinet_id', true));

CREATE POLICY reading_sessions_cabinet_isolation ON reading_sessions
  USING (cabinet_id::text = current_setting('app.cabinet_id', true))
  WITH CHECK (cabinet_id::text = current_setting('app.cabinet_id', true));

CREATE POLICY heartbeats_cabinet_isolation ON article_heartbeats
  USING (cabinet_id::text = current_setting('app.cabinet_id', true))
  WITH CHECK (cabinet_id::text = current_setting('app.cabinet_id', true));

CREATE POLICY newsletter_sends_cabinet_isolation ON newsletter_sends
  USING (cabinet_id::text = current_setting('app.cabinet_id', true))
  WITH CHECK (cabinet_id::text = current_setting('app.cabinet_id', true));

CREATE POLICY recipients_cabinet_isolation ON newsletter_recipients
  USING (cabinet_id::text = current_setting('app.cabinet_id', true))
  WITH CHECK (cabinet_id::text = current_setting('app.cabinet_id', true));

CREATE POLICY tokens_cabinet_isolation ON invite_tokens
  USING (cabinet_id::text = current_setting('app.cabinet_id', true))
  WITH CHECK (cabinet_id::text = current_setting('app.cabinet_id', true));

CREATE POLICY sessions_cabinet_isolation ON practitioner_sessions
  USING (cabinet_id::text = current_setting('app.cabinet_id', true))
  WITH CHECK (cabinet_id::text = current_setting('app.cabinet_id', true));

CREATE POLICY magic_links_cabinet_isolation ON patient_magic_links
  USING (cabinet_id::text = current_setting('app.cabinet_id', true))
  WITH CHECK (cabinet_id::text = current_setting('app.cabinet_id', true));

CREATE POLICY subscriptions_cabinet_isolation ON cabinet_subscriptions
  USING (cabinet_id::text = current_setting('app.cabinet_id', true))
  WITH CHECK (cabinet_id::text = current_setting('app.cabinet_id', true));

CREATE POLICY audit_logs_cabinet_isolation ON audit_logs
  USING (
    cabinet_id IS NULL
    OR cabinet_id::text = current_setting('app.cabinet_id', true)
  );

-- Articles : catalogue global, lisible par tous les praticiens authentifiés
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY articles_read_validated ON articles
  FOR SELECT
  USING (status = 'validated');

-- Newsletter templates : lecture publique
ALTER TABLE newsletter_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY templates_read ON newsletter_templates
  FOR SELECT
  USING (is_active = true);

COMMIT;
