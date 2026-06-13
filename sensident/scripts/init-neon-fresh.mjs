/**
 * Sensident — Init Neon "fresh" : DROP toutes les tables et recrée le schema
 *
 * ⚠️ DESTRUCTIF : efface TOUT le contenu de la BDD Neon cible.
 * À utiliser UNIQUEMENT sur un Neon de dev/démo.
 */
import postgres from 'postgres';
import fs from 'node:fs';

const env = fs.readFileSync('.env', 'utf-8');
const url = env.split('\n').find(l => l.startsWith('DATABASE_URL=')).split('=').join('=').replace('DATABASE_URL=', '');
const sql = postgres(url, { ssl: 'require', max: 1, connect_timeout: 10 });

const TABLES = [
  'consent_log', 'consent_log', 'patient_reactions', 'patient_magic_links',
  'invite_tokens', 'cabinet_library_articles', 'cabinet_subscriptions',
  'article_heartbeats', 'reading_sessions', 'newsletter_recipients',
  'newsletter_sends', 'newsletter_templates', 'patient_consents',
  'audit_logs', 'rate_limits', 'practitioner_sessions', 'practitioners',
  'admins', 'admin_sessions', 'articles', 'article_categories',
  'categories', 'cabinets',
];

async function main() {
  console.log(`\n  ⚠️  Drop ALL tables from Neon (DDL destuctive)\n`);
  console.log(`  Base : ${url.replace(/:[^:@]+@/, ':***@').slice(0, 80)}…\n`);

  for (const t of TABLES) {
    try {
      await sql.unsafe(`DROP TABLE IF EXISTS "${t}" CASCADE`);
      console.log(`  🗑️  ${t}`);
    } catch (e) {
      console.log(`  ⚠️  ${t}: ${e.message}`);
    }
  }

  // Maintenant on crée les tables attendues par schema.pg.ts
  const ddl = `
    CREATE TABLE cabinets (
      id text PRIMARY KEY,
      slug text NOT NULL UNIQUE,
      name text NOT NULL,
      contact_email text,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      newsletter_branding text DEFAULT '{"showLogo":false}'
    );

    CREATE TABLE admins (
      id text PRIMARY KEY,
      email text NOT NULL UNIQUE,
      name text NOT NULL,
      password_hash text NOT NULL,
      totp_secret text,
      totp_enabled boolean NOT NULL DEFAULT false,
      role text NOT NULL DEFAULT 'reader',
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      last_login_at timestamp with time zone
    );

    CREATE TABLE practitioners (
      id text PRIMARY KEY,
      cabinet_id text NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
      email text NOT NULL UNIQUE,
      name text NOT NULL,
      password_hash text NOT NULL,
      totp_secret text,
      totp_enabled boolean NOT NULL DEFAULT false,
      role text NOT NULL DEFAULT 'associate',
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      last_login_at timestamp with time zone
    );

    CREATE TABLE practitioner_sessions (
      id text PRIMARY KEY,
      practitioner_id text NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
      cabinet_id text NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
      token_hash text NOT NULL UNIQUE,
      mfa_verified boolean NOT NULL DEFAULT false,
      ip text,
      user_agent text,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      expires_at timestamp with time zone NOT NULL,
      last_used_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TABLE admin_sessions (
      id text PRIMARY KEY,
      admin_id text NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
      token_hash text NOT NULL UNIQUE,
      mfa_verified boolean NOT NULL DEFAULT false,
      ip text,
      user_agent text,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      expires_at timestamp with time zone NOT NULL,
      last_used_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TABLE invite_tokens (
      id text PRIMARY KEY,
      cabinet_id text NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
      token_hash text NOT NULL UNIQUE,
      created_by text NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
      expires_at timestamp with time zone NOT NULL,
      max_uses integer NOT NULL DEFAULT 1000,
      used_count integer NOT NULL DEFAULT 0,
      revoked_at timestamp with time zone,
      created_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TABLE patient_consents (
      id text PRIMARY KEY,
      cabinet_id text NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
      email_hash text NOT NULL,
      email_encrypted text,
      opt_in_version text NOT NULL,
      cgu_accepted boolean NOT NULL,
      newsletter_optin boolean NOT NULL DEFAULT false,
      ip text,
      user_agent text,
      invite_token_id text REFERENCES invite_tokens(id) ON DELETE SET NULL,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      confirmed_at timestamp with time zone,
      unsubscribed_at timestamp with time zone,
      consent_newsletter boolean NOT NULL DEFAULT false,
      consent_analytics boolean NOT NULL DEFAULT false,
      consent_reactions boolean NOT NULL DEFAULT false,
      consent_version text DEFAULT '1.0',
      consent_timestamp timestamp with time zone
    );

    CREATE TABLE consent_log (
      id text PRIMARY KEY,
      patient_id text NOT NULL REFERENCES patient_consents(id) ON DELETE CASCADE,
      cabinet_id text NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
      finalite text NOT NULL,
      consenti boolean NOT NULL DEFAULT false,
      version text NOT NULL DEFAULT '1.0',
      "timestamp" timestamp with time zone NOT NULL DEFAULT now(),
      source text NOT NULL DEFAULT 'onboarding'
    );

    CREATE TABLE patient_magic_links (
      id text PRIMARY KEY,
      cabinet_id text NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
      email_hash text NOT NULL,
      token_hash text NOT NULL UNIQUE,
      expires_at timestamp with time zone NOT NULL,
      used_at timestamp with time zone,
      ip text,
      created_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TABLE categories (
      id text PRIMARY KEY,
      code text NOT NULL UNIQUE,
      name text NOT NULL,
      description text,
      parent_id text,
      icon text,
      color text,
      position integer NOT NULL DEFAULT 0,
      created_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TABLE articles (
      id text PRIMARY KEY,
      slug text NOT NULL UNIQUE,
      title text NOT NULL,
      excerpt text NOT NULL,
      category text NOT NULL,
      body_md text NOT NULL,
      slides_json jsonb NOT NULL,
      reading_time_min integer NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      validated_by text,
      validated_at timestamp with time zone,
      next_review_at timestamp with time zone,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TABLE article_categories (
      article_slug text NOT NULL,
      category_id text NOT NULL REFERENCES categories(id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX pk_article_categories ON article_categories (article_slug, category_id);

    CREATE TABLE reading_sessions (
      id text PRIMARY KEY,
      cabinet_id text NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
      patient_email_hash text NOT NULL,
      article_slug text NOT NULL,
      started_at timestamp with time zone NOT NULL DEFAULT now(),
      last_heartbeat_at timestamp with time zone,
      ended_at timestamp with time zone,
      duration_seconds integer NOT NULL DEFAULT 0,
      completed boolean NOT NULL DEFAULT false
    );

    CREATE TABLE article_heartbeats (
      id text PRIMARY KEY,
      session_id text NOT NULL REFERENCES reading_sessions(id) ON DELETE CASCADE,
      "ts" timestamp with time zone NOT NULL DEFAULT now(),
      scroll_pct integer NOT NULL DEFAULT 0
    );
    CREATE INDEX article_heartbeats_session_ts_idx ON article_heartbeats (session_id, "ts");

    CREATE TABLE newsletter_templates (
      id text PRIMARY KEY,
      code text NOT NULL UNIQUE,
      name text NOT NULL,
      description text,
      preview_image_url text,
      react_email_path text NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TABLE newsletter_sends (
      id text PRIMARY KEY,
      cabinet_id text NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
      template_id text REFERENCES newsletter_templates(id) ON DELETE SET NULL,
      article_slug text,
      subject text NOT NULL,
      scheduled_at timestamp with time zone,
      sent_at timestamp with time zone,
      status text NOT NULL DEFAULT 'draft',
      total_recipients integer NOT NULL DEFAULT 0,
      practitioner_name text,
      cabinet_name text,
      custom_message text,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      created_by text
    );

    CREATE TABLE newsletter_recipients (
      id text PRIMARY KEY,
      send_id text NOT NULL REFERENCES newsletter_sends(id) ON DELETE CASCADE,
      cabinet_id text NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
      patient_email_hash text NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      sent_at timestamp with time zone,
      opened_at timestamp with time zone,
      clicked_at timestamp with time zone,
      unsubscribed_at timestamp with time zone
    );

    CREATE TABLE cabinet_subscriptions (
      id text PRIMARY KEY,
      cabinet_id text NOT NULL UNIQUE REFERENCES cabinets(id) ON DELETE CASCADE,
      plan text NOT NULL DEFAULT 'free',
      status text NOT NULL DEFAULT 'active',
      stripe_customer_id text,
      stripe_subscription_id text,
      current_period_end timestamp with time zone,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TABLE audit_logs (
      id text PRIMARY KEY,
      "ts" timestamp with time zone NOT NULL DEFAULT now(),
      actor_type text NOT NULL,
      actor_id text,
      cabinet_id text REFERENCES cabinets(id) ON DELETE SET NULL,
      action text NOT NULL,
      target_type text,
      target_id text,
      ip text,
      user_agent text,
      metadata jsonb
    );

    CREATE TABLE rate_limits (
      id text PRIMARY KEY,
      route text NOT NULL,
      "key" text NOT NULL,
      ip text,
      "ts" timestamp with time zone NOT NULL DEFAULT now()
    );
    CREATE INDEX rate_limits_route_key_ts_idx ON rate_limits (route, "key", "ts");
    CREATE INDEX rate_limits_ts_idx ON rate_limits ("ts");

    CREATE TABLE cabinet_library_articles (
      id text PRIMARY KEY,
      cabinet_id text NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
      article_id text NOT NULL REFERENCES articles(slug) ON DELETE CASCADE,
      is_visible boolean NOT NULL DEFAULT false,
      is_pinned boolean NOT NULL DEFAULT false,
      pin_order integer NOT NULL DEFAULT 0,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX idx_library_unique ON cabinet_library_articles (cabinet_id, article_id);

    CREATE TABLE patient_reactions (
      id text PRIMARY KEY,
      article_id text NOT NULL REFERENCES articles(slug) ON DELETE CASCADE,
      cabinet_id text NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
      patient_email_hash text NOT NULL,
      reaction text NOT NULL,
      created_at timestamp with time zone NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX idx_reactions_unique ON patient_reactions (article_id, cabinet_id, patient_email_hash);
    CREATE INDEX idx_reactions_article_cabinet ON patient_reactions (article_id, cabinet_id);
  `;

  // Execute DDL statement by statement
  for (const stmt of ddl.split(';').map(s => s.trim()).filter(Boolean)) {
    try {
      await sql.unsafe(stmt);
    } catch (e) {
      console.log(`  ⚠️ DDL failed: ${stmt.slice(0, 80)}… → ${e.message.split('\n')[0]}`);
    }
  }

  console.log(`\n  ✅ Schema recréé. Lance maintenant :`);
  console.log(`     node scripts/seed-articles-pg.mjs`);
  console.log(`     node scripts/seed-demo-francois-neon.mjs\n`);

  await sql.end();
}

main().catch(async (e) => {
  console.error('❌ Erreur :', e.message);
  await sql.end();
  process.exit(1);
});
