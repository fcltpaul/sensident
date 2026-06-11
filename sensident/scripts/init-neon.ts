/**
 * Sensident — Init Neon (PostgreSQL)
 *
 * Crée toutes les tables du schema.pg.ts sur Neon (idempotent).
 * Utilise des CREATE TABLE IF NOT EXISTS en SQL direct, calqué sur schema.pg.ts.
 *
 * Idempotent : peut être réexécuté sans erreur.
 */
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url || !url.startsWith('postgres')) {
  console.error('DATABASE_URL doit commencer par postgres://');
  process.exit(1);
}

const sql = postgres(url, { max: 1, connect_timeout: 10 });

const SCHEMA = `
  -- Extensions
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- pour gen_random_uuid()

  -- CABINETS
  CREATE TABLE IF NOT EXISTS cabinets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    rpps TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    contact_address TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    contact_rdv_url TEXT,
    contact_opening_hours JSONB,
    contact_facade_photo_url TEXT,
    contact_oncd_mention BOOLEAN NOT NULL DEFAULT FALSE,
    contact_map_url TEXT
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_cabinets_slug ON cabinets(slug);

  -- PRACTITIONERS
  CREATE TABLE IF NOT EXISTS practitioners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cabinet_id UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    totp_secret TEXT,
    totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'collaborator')),
    email_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_practitioners_cabinet_id ON practitioners(cabinet_id);

  -- PRACTITIONER SESSIONS
  CREATE TABLE IF NOT EXISTS practitioner_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
    cabinet_id UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    mfa_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ip INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_practitioner_sessions_token ON practitioner_sessions(token_hash);

  -- ADMINS
  CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    totp_secret TEXT,
    totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    role TEXT NOT NULL DEFAULT 'reader' CHECK (role IN ('superadmin', 'editor', 'reader')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
  );

  -- ADMIN SESSIONS
  CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    mfa_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ip INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token_hash);

  -- INVITE TOKENS
  CREATE TABLE IF NOT EXISTS invite_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cabinet_id UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    max_uses INTEGER NOT NULL DEFAULT 1000,
    used_count INTEGER NOT NULL DEFAULT 0,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- PATIENT CONSENTS
  CREATE TABLE IF NOT EXISTS patient_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cabinet_id UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    email_hash TEXT NOT NULL,
    email_encrypted TEXT,
    opt_in_version TEXT NOT NULL,
    cgu_accepted BOOLEAN NOT NULL,
    newsletter_optin BOOLEAN NOT NULL DEFAULT FALSE,
    ip INET,
    user_agent TEXT,
    invite_token_id UUID REFERENCES invite_tokens(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMPTZ,
    unsubscribed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_patient_per_cabinet ON patient_consents(cabinet_id, email_hash);

  -- PATIENT MAGIC LINKS
  CREATE TABLE IF NOT EXISTS patient_magic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cabinet_id UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    email_hash TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    ip INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- CATEGORIES
  CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    parent_id UUID,
    icon TEXT,
    color TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- ARTICLES
  CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    excerpt TEXT,
    body_markdown TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'archived')),
    author_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    reviewer_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- ARTICLE CATEGORIES
  CREATE TABLE IF NOT EXISTS article_categories (
    article_slug TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (article_slug, category_id)
  );

  -- READING SESSIONS
  CREATE TABLE IF NOT EXISTS reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cabinet_id UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    patient_email_hash TEXT NOT NULL,
    article_slug TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_heartbeat_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    total_duration_sec INTEGER DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT FALSE
  );
  CREATE INDEX IF NOT EXISTS idx_reading_cabinet ON reading_sessions(cabinet_id, started_at DESC);

  -- ARTICLE HEARTBEATS
  CREATE TABLE IF NOT EXISTS article_heartbeats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES reading_sessions(id) ON DELETE CASCADE,
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scroll_pct INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_heartbeats_session_ts ON article_heartbeats(session_id, ts);

  -- NEWSLETTER TEMPLATES
  CREATE TABLE IF NOT EXISTS newsletter_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cabinet_id UUID REFERENCES cabinets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_markdown TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- NEWSLETTER SENDS
  CREATE TABLE IF NOT EXISTS newsletter_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cabinet_id UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    template_id UUID REFERENCES newsletter_templates(id) ON DELETE SET NULL,
    article_slug TEXT,
    subject TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recipient_count INTEGER NOT NULL DEFAULT 0
  );

  -- NEWSLETTER RECIPIENTS
  CREATE TABLE IF NOT EXISTS newsletter_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    send_id UUID NOT NULL REFERENCES newsletter_sends(id) ON DELETE CASCADE,
    cabinet_id UUID NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    patient_email_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'opened', 'clicked', 'unsubscribed', 'bounced', 'erased')),
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    unsubscribed_at TIMESTAMPTZ
  );

  -- CABINET SUBSCRIPTIONS
  CREATE TABLE IF NOT EXISTS cabinet_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cabinet_id UUID NOT NULL UNIQUE REFERENCES cabinets(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'cabinet')),
    status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- AUDIT LOGS
  CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_type TEXT NOT NULL CHECK (actor_type IN ('practitioner', 'patient', 'system', 'admin')),
    actor_id TEXT,
    cabinet_id UUID REFERENCES cabinets(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    ip INET,
    user_agent TEXT,
    metadata JSONB
  );
  CREATE INDEX IF NOT EXISTS idx_audit_cabinet_ts ON audit_logs(cabinet_id, ts DESC);

  -- RATE LIMITS
  CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route TEXT NOT NULL,
    key TEXT NOT NULL,
    ip INET,
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_rate_limits_route_key_ts ON rate_limits(route, key, ts);
  CREATE INDEX IF NOT EXISTS idx_rate_limits_ts ON rate_limits(ts);
`;

const SEED_TEMPLATES = `
  -- Insere les 5 templates (laisser PG generer les UUIDs)
  INSERT INTO newsletter_templates (name, subject, body_markdown)
  SELECT * FROM (VALUES
    ('Moderne'::TEXT, '{{cabinet_name}} · {{article_title}}'::TEXT, '# {{article_title}}\n\n{{article_excerpt}}\n\n[Lire l''article]({{article_url}})'::TEXT),
    ('Chaleureux'::TEXT, 'Votre conseil prévention du mois : {{article_title}}'::TEXT, 'Bonjour,\n\n{{article_excerpt}}\n\n[Lire la suite]({{article_url}})'::TEXT),
    ('Classique'::TEXT, '{{article_title}} — Prévention par {{cabinet_name}}'::TEXT, '{{article_excerpt}}\n\n[Lire l''article complet]({{article_url}})'::TEXT),
    ('Épuré'::TEXT, '{{article_title}}'::TEXT, '{{article_excerpt}}\n\n→ {{article_url}}'::TEXT),
    ('Premium'::TEXT, '{{cabinet_name}} — {{article_title}}'::TEXT, '{{article_excerpt}}\n\n[Lire l''article]({{article_url}})'::TEXT)
  ) AS v(name, subject, body_markdown)
  WHERE NOT EXISTS (SELECT 1 FROM newsletter_templates WHERE newsletter_templates.name = v.name);
`;

async function main() {
  console.log('Connexion à Neon...');
  const v = await sql`SELECT version()`;
  console.log('  PG:', (v[0] as any).version.slice(0, 60));

  console.log('Création des tables...');
  for (const stmt of SCHEMA.split(';').map(s => s.trim()).filter(s => s.length > 0)) {
    await sql.unsafe(stmt);
  }
  console.log('  ✅ Tables créées');

  console.log('Insertion des templates newsletter...');
  await sql.unsafe(SEED_TEMPLATES);
  const tpl = await sql`SELECT COUNT(*) as c FROM newsletter_templates`;
  console.log(`  ✅ ${(tpl[0] as any).c} templates en BDD`);

  // Lister les tables créées
  const tables = await sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `;
  console.log(`\nTables présentes (${tables.length}) :`);
  for (const t of tables) console.log('  -', (t as any).tablename);

  await sql.end();
  console.log('\n✅ Neon initialisé.');
}

main().catch((e) => { console.error(e); process.exit(1); });
