-- ============================================
-- Sensident — Schéma PostgreSQL (multi-tenant strict)
-- ============================================
-- Conventions:
-- - Toutes les tables métier portent `cabinet_id` (FK denormalized + index).
-- - UUID v4 pour les PK (gen_random_uuid via pgcrypto).
-- - Timestamps en UTC.
-- - Audit logs immuables (pas d'UPDATE/DELETE autorise).
-- - RLS (Row-Level Security) activee sur toutes les tables cabinet.
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- 1. CABINETS (tenant racine)
-- ============================================
CREATE TABLE cabinets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]{3,40}$'),
  name            TEXT NOT NULL,
  rpps            TEXT,                                    -- Numero RPPS du praticien (CSP L.4112-1)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Bloc contact B2 flexible : tous les champs sont nullable
  contact_address            TEXT,
  contact_phone              TEXT,
  contact_email              TEXT,
  contact_rdv_url            TEXT,
  contact_opening_hours      JSONB,    -- { "lundi": "9h-18h", ... }
  contact_facade_photo_url   TEXT,
  contact_oncd_mention       BOOLEAN NOT NULL DEFAULT false,
  contact_map_url            TEXT,

  -- Branding newsletter (P2) + cadence (2026-07-07 — Tartrinator)
  newsletter_branding        JSONB,    -- { logoUrl, accentColor, signature, showLogo }
  newsletter_cadence         JSONB     -- { frequency, sendDay, sendHour }
);

CREATE INDEX idx_cabinets_slug ON cabinets (slug);

-- ============================================
-- 2. PRACTITIONERS (1 = 1 cabinet, multi-praticiens derrière le meme login = 1 compte)
-- ============================================
CREATE TABLE practitioners (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id          UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
  email               TEXT UNIQUE NOT NULL CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  password_hash       TEXT NOT NULL,
  totp_secret         TEXT,                                -- Chiffre, nullable jusqu'à activation MFA
  totp_enabled        BOOLEAN NOT NULL DEFAULT false,
  role                TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'collaborator')),
  email_verified_at   TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_practitioners_cabinet_id ON practitioners (cabinet_id);
CREATE INDEX idx_practitioners_email ON practitioners (email);

-- Sessions Auth.js (custom, pas NextAuth default)
CREATE TABLE practitioner_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  cabinet_id      UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
  token_hash      TEXT UNIQUE NOT NULL,
  mfa_verified    BOOLEAN NOT NULL DEFAULT false,
  ip              INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  last_used_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_practitioner ON practitioner_sessions (practitioner_id);
CREATE INDEX idx_sessions_token_hash ON practitioner_sessions (token_hash);

-- ============================================
-- 3. INVITE TOKENS (lien d'invitation patient)
-- ============================================
CREATE TABLE invite_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id      UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
  token_hash      TEXT UNIQUE NOT NULL,                    -- HMAC SHA-256 du token envoye
  created_by      UUID NOT NULL REFERENCES practitioners(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  max_uses        INTEGER NOT NULL DEFAULT 1000 CHECK (max_uses > 0),
  used_count      INTEGER NOT NULL DEFAULT 0,
  revoked_at      TIMESTAMPTZ
);

CREATE INDEX idx_invite_tokens_cabinet ON invite_tokens (cabinet_id);
CREATE INDEX idx_invite_tokens_hash ON invite_tokens (token_hash);

-- ============================================
-- 4. PATIENT CONSENTS (preuve opt-in, double opt-in)
-- ============================================
CREATE TABLE patient_consents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id          UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
  email_hash          TEXT NOT NULL,                       -- SHA-256(email + cabinet_secret), pour counts distincts
  email_encrypted     BYTEA,                                -- PGP chiffre, pour envoi newsletters
  opt_in_version      TEXT NOT NULL,                        -- Hash de la version des CGU/opt-in affichee
  cgu_accepted        BOOLEAN NOT NULL,
  newsletter_optin    BOOLEAN NOT NULL,
  ip                  INET,
  user_agent          TEXT,
  invite_token_id     UUID REFERENCES invite_tokens(id) ON DELETE SET NULL,
  confirmed_at        TIMESTAMPTZ,                          -- Quand le patient a clique dans l'email double opt-in
  unsubscribed_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (cabinet_id, email_hash)                           -- Un meme patient ne peut s'inscrire qu'une fois par cabinet
);

CREATE INDEX idx_patient_consents_cabinet ON patient_consents (cabinet_id);
CREATE INDEX idx_patient_consents_confirmed ON patient_consents (cabinet_id, confirmed_at) WHERE confirmed_at IS NOT NULL;

-- ============================================
-- 5. MAGIC LINKS (patient I1)
-- ============================================
CREATE TABLE patient_magic_links (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id          UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
  email_hash          TEXT NOT NULL,
  token_hash          TEXT UNIQUE NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ NOT NULL,
  used_at             TIMESTAMPTZ,
  ip                  INET
);

CREATE INDEX idx_magic_links_hash ON patient_magic_links (token_hash);

-- ============================================
-- 6. ARTICLES (catalogue mutualise Sensident)
-- ============================================
CREATE TABLE articles (
  slug                TEXT PRIMARY KEY CHECK (slug ~ '^[a-z0-9-]{3,80}$'),
  title               TEXT NOT NULL,
  excerpt             TEXT NOT NULL,                        -- 200 char max, affiché en preview
  category            TEXT NOT NULL,                        -- prevention, hygiene, patho, enfant, etc.
  body_md             TEXT NOT NULL,                        -- Markdown format long
  slides_json         JSONB NOT NULL,                       -- 5 slides structurés (format F4)
  reading_time_min    INTEGER NOT NULL,                     -- Pour le format long
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'archived')),
  validated_by        UUID REFERENCES practitioners(id),
  validated_at        TIMESTAMPTZ,
  next_review_at      TIMESTAMPTZ,                          -- +12 mois après validated_at
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_articles_status ON articles (status) WHERE status = 'validated';
CREATE INDEX idx_articles_category ON articles (category);
CREATE INDEX idx_articles_search ON articles USING GIN (to_tsvector('french', title || ' ' || excerpt || ' ' || body_md));

-- ============================================
-- 7. READING SESSIONS (tracking lecture T1)
-- ============================================
CREATE TABLE reading_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id          UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
  patient_email_hash  TEXT NOT NULL,
  article_slug        TEXT NOT NULL REFERENCES articles(slug) ON DELETE CASCADE,
  source              TEXT NOT NULL CHECK (source IN ('newsletter', 'direct', 'site')),
  newsletter_send_id  UUID,                                 -- FK ajoutée après
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at            TIMESTAMPTZ,
  duration_seconds    INTEGER NOT NULL DEFAULT 0,
  max_scroll_pct      INTEGER NOT NULL DEFAULT 0,           -- 0-100
  max_slide_reached   INTEGER,                              -- 1-5 pour les 5-slides
  completed           BOOLEAN NOT NULL DEFAULT false,
  client_user_agent   TEXT,
  client_viewport     TEXT                                  -- ex: "375x812 iPhone"
);

CREATE INDEX idx_reading_sessions_cabinet ON reading_sessions (cabinet_id, started_at DESC);
CREATE INDEX idx_reading_sessions_article ON reading_sessions (article_slug, started_at DESC);
CREATE INDEX idx_reading_sessions_patient ON reading_sessions (cabinet_id, patient_email_hash);

-- ============================================
-- 8. HEARTBEATS (pings JS toutes les 15s)
-- ============================================
CREATE TABLE article_heartbeats (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_session_id  UUID NOT NULL REFERENCES reading_sessions(id) ON DELETE CASCADE,
  cabinet_id          UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
  ts                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  scroll_pct          INTEGER NOT NULL CHECK (scroll_pct BETWEEN 0 AND 100),
  tab_visible         BOOLEAN NOT NULL DEFAULT true,
  slide_index         INTEGER                              -- Pour les 5-slides
);

CREATE INDEX idx_heartbeats_session ON article_heartbeats (reading_session_id, ts);
CREATE INDEX idx_heartbeats_cabinet_ts ON article_heartbeats (cabinet_id, ts DESC);

-- ============================================
-- 9. NEWSLETTER TEMPLATES (3-5 looks P2)
-- ============================================
CREATE TABLE newsletter_templates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT UNIQUE NOT NULL,                 -- 'moderne', 'chaleureux', 'classique', etc.
  name                TEXT NOT NULL,                        -- Affiché dans le dashboard
  description         TEXT,
  preview_image_url   TEXT,
  react_email_path    TEXT NOT NULL,                        -- Chemin du composant React Email
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 10. NEWSLETTER SENDS (instance d'envoi par cabinet)
-- ============================================
CREATE TABLE newsletter_sends (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id          UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
  template_id         UUID NOT NULL REFERENCES newsletter_templates(id),
  article_slug        TEXT NOT NULL REFERENCES articles(slug),
  subject             TEXT NOT NULL,
  scheduled_at        TIMESTAMPTZ,
  sent_at             TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  total_recipients    INTEGER NOT NULL DEFAULT 0,
  created_by          UUID NOT NULL REFERENCES practitioners(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Personnalisation V3 (stockée au moment de l'envoi)
  practitioner_name   TEXT,
  cabinet_name        TEXT,
  custom_message      TEXT
);

CREATE INDEX idx_newsletter_sends_cabinet ON newsletter_sends (cabinet_id, sent_at DESC);
CREATE INDEX idx_newsletter_sends_status ON newsletter_sends (status) WHERE status IN ('scheduled', 'sending');

-- FK ajoutée maintenant que newsletter_sends existe
ALTER TABLE reading_sessions
  ADD CONSTRAINT fk_reading_sessions_newsletter_send
  FOREIGN KEY (newsletter_send_id) REFERENCES newsletter_sends(id) ON DELETE SET NULL;

-- ============================================
-- 11. NEWSLETTER RECIPIENTS
-- ============================================
CREATE TABLE newsletter_recipients (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id             UUID NOT NULL REFERENCES newsletter_sends(id) ON DELETE CASCADE,
  cabinet_id          UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
  patient_email_hash  TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'clicked', 'bounced', 'unsubscribed')),
  sent_at             TIMESTAMPTZ,
  opened_at           TIMESTAMPTZ,
  clicked_at          TIMESTAMPTZ,
  unsubscribed_at     TIMESTAMPTZ,
  brevo_message_id    TEXT
);

CREATE INDEX idx_recipients_send ON newsletter_recipients (send_id);
CREATE INDEX idx_recipients_cabinet_status ON newsletter_recipients (cabinet_id, status);

-- ============================================
-- 12. CABINET SUBSCRIPTIONS (sync Stripe)
-- ============================================
CREATE TABLE cabinet_subscriptions (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id                  UUID UNIQUE NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
  stripe_customer_id          TEXT UNIQUE,
  stripe_subscription_id      TEXT UNIQUE,
  plan                        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'cabinet')),
  status                      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete')),
  current_period_start        TIMESTAMPTZ,
  current_period_end          TIMESTAMPTZ,
  cancel_at_period_end        BOOLEAN NOT NULL DEFAULT false,
  is_ambassador               BOOLEAN NOT NULL DEFAULT false,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 13. AUDIT LOGS (immuables)
-- ============================================
CREATE TABLE audit_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_type          TEXT NOT NULL CHECK (actor_type IN ('practitioner', 'patient', 'system', 'admin')),
  actor_id            UUID,
  cabinet_id          UUID REFERENCES cabinets(id) ON DELETE SET NULL,
  action              TEXT NOT NULL,                        -- 'read_article', 'view_consent_list', 'export_data', 'login', etc.
  target_type         TEXT,                                 -- 'article', 'consent', 'newsletter_send', etc.
  target_id           UUID,
  ip                  INET,
  user_agent          TEXT,
  metadata            JSONB
);

CREATE INDEX idx_audit_cabinet_ts ON audit_logs (cabinet_id, ts DESC);
CREATE INDEX idx_audit_actor ON audit_logs (actor_type, actor_id);
CREATE INDEX idx_audit_action ON audit_logs (action);

-- IMMUABLE: pas de UPDATE/DELETE
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;

-- ============================================
-- 14. ROW-LEVEL SECURITY (RLS)
-- ============================================
-- Politique globale : chaque table cabinet a une policy qui restreint l'accès
-- au cabinet_id defini dans la session PostgreSQL (current_setting('app.cabinet_id'))

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
-- Les requetes applicatives doivent SET app.cabinet_id AVANT chaque transaction.
-- Politique permissive (à durcir selon le contexte) : on autorise l'accès si
-- le cabinet_id de la ligne correspond au setting.

-- Policy exemple pour patient_consents
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

-- ============================================
-- 15. FONCTIONS UTILITAIRES
-- ============================================

-- Genere un hash d'email (pour counts distincts anonymisés)
CREATE OR REPLACE FUNCTION email_hash(email TEXT, cabinet_secret TEXT)
RETURNS TEXT AS $$
  SELECT encode(digest(lower(trim(email)) || cabinet_secret, 'sha256'), 'hex')
$$ LANGUAGE SQL IMMUTABLE;

-- Note: la fonction digest() necessite pgcrypto, qui est activé.
-- On utilise digest au lieu de encode/digest car pgcrypto fournit digest().
CREATE OR REPLACE FUNCTION email_hash(email TEXT, cabinet_secret TEXT)
RETURNS TEXT AS $$
  SELECT encode(digest(lower(trim(email)) || cabinet_secret, 'sha256'), 'hex')
$$ LANGUAGE SQL IMMUTABLE;

-- Calcul de la retention M0/M+1/M+2
CREATE OR REPLACE VIEW v_patient_retention AS
SELECT
  pc.cabinet_id,
  date_trunc('month', pc.confirmed_at) AS cohort_month,
  COUNT(DISTINCT pc.email_hash) AS m0_active,
  COUNT(DISTINCT CASE
    WHEN EXISTS (
      SELECT 1 FROM reading_sessions rs
      WHERE rs.cabinet_id = pc.cabinet_id
        AND rs.patient_email_hash = pc.email_hash
        AND rs.started_at >= pc.confirmed_at + interval '1 month'
        AND rs.started_at < pc.confirmed_at + interval '2 month'
    ) THEN pc.email_hash
  END) AS m1_active,
  COUNT(DISTINCT CASE
    WHEN EXISTS (
      SELECT 1 FROM reading_sessions rs
      WHERE rs.cabinet_id = pc.cabinet_id
        AND rs.patient_email_hash = pc.email_hash
        AND rs.started_at >= pc.confirmed_at + interval '2 month'
        AND rs.started_at < pc.confirmed_at + interval '3 month'
    ) THEN pc.email_hash
  END) AS m2_active
FROM patient_consents pc
WHERE pc.confirmed_at IS NOT NULL
GROUP BY pc.cabinet_id, date_trunc('month', pc.confirmed_at);

-- ============================================
-- 16. SEED DATA : templates newsletter (3-5 looks P2)
-- ============================================
INSERT INTO newsletter_templates (code, name, description, react_email_path) VALUES
  ('moderne',     'Moderne',     'Lignes epurées, accent bleu nuit, typo sans-serif. Pour cabinets urbains.',     'moderne.tsx'),
  ('chaleureux',  'Chaleureux',  'Couleurs douces, typo serif, ambiance accueillante. Pour cabinets familiaux.',    'chaleureux.tsx'),
  ('classique',   'Classique',   'Sobre et elegant, noir et blanc, typo classique. Pour cabinets traditionnels.',   'classique.tsx'),
  ('epure',       'Épuré',       'Minimaliste, beaucoup de blanc, focus sur le contenu. Pour cabinets design.',     'epure.tsx'),
  ('premium',     'Premium',     'Haut de gamme, dorures subtiles, typo elegante. Pour cabinets premiums.',         'premium.tsx');

-- ============================================
-- 17. TRIGGERS : updated_at automatique
-- ============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cabinets_updated_at
  BEFORE UPDATE ON cabinets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_practitioners_updated_at
  BEFORE UPDATE ON practitioners
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON cabinet_subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- 18. BIBLIOTHÈQUE PATIENT (liaison cabinet -> article)
-- ============================================
CREATE TABLE cabinet_library_articles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id          UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
  article_id          TEXT NOT NULL REFERENCES articles(slug) ON DELETE CASCADE,
  is_visible          BOOLEAN NOT NULL DEFAULT false,
  is_pinned           BOOLEAN NOT NULL DEFAULT false,
  pin_order           INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cabinet_id, article_id)
);

CREATE INDEX idx_library_cabinet ON cabinet_library_articles (cabinet_id, is_visible);

-- ============================================
-- 19. RÉACTIONS PATIENT (👍 / 👎)
-- ============================================
CREATE TABLE patient_reactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id          TEXT NOT NULL REFERENCES articles(slug) ON DELETE CASCADE,
  cabinet_id          UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
  patient_email_hash  TEXT NOT NULL,
  reaction            TEXT NOT NULL CHECK (reaction IN ('up', 'down')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(article_id, cabinet_id, patient_email_hash)
);

CREATE INDEX idx_reactions_article ON patient_reactions (article_id, cabinet_id);

-- ============================================
-- FIN DU SCHÉMA
-- ============================================
