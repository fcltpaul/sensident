/**
 * Sensident — Init DB SQLite (dev local)
 *
 * Cree les tables en SQL direct, aligne sur src/db/schema.sqlite.ts.
 * En prod (PostgreSQL HDS), utiliser schema.pg.ts via drizzle-kit.
 */
import { createClient } from '@libsql/client';
import path from 'node:path';
import fs from 'node:fs';

const dbFile = process.env.DATABASE_URL?.replace('file:', '') || path.join(process.cwd(), 'dev.db');
const dir = path.dirname(dbFile);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const client = createClient({ url: `file:${dbFile}` });

console.log('Initialisation de la base SQLite :', dbFile);

const schema = `
  CREATE TABLE IF NOT EXISTS cabinets (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    rpps TEXT,
    contact_address TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    contact_rdv_url TEXT,
    contact_opening_hours TEXT,
    contact_facade_photo_url TEXT,
    contact_oncd_mention INTEGER NOT NULL DEFAULT 0,
    contact_map_url TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS practitioners (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    cabinet_id TEXT NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    totp_secret TEXT,
    totp_enabled INTEGER NOT NULL DEFAULT 0,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'associate', 'assistant')),
    email_verified_at INTEGER,
    last_login_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_practitioners_cabinet ON practitioners(cabinet_id);

  CREATE TABLE IF NOT EXISTS practitioner_sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    practitioner_id TEXT NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
    cabinet_id TEXT NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    mfa_verified INTEGER NOT NULL DEFAULT 0,
    ip TEXT,
    user_agent TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    expires_at INTEGER NOT NULL,
    last_used_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON practitioner_sessions(token_hash);

  CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    totp_secret TEXT,
    totp_enabled INTEGER NOT NULL DEFAULT 0,
    role TEXT NOT NULL DEFAULT 'reader' CHECK (role IN ('superadmin', 'editor', 'reader')),
    last_login_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    mfa_verified INTEGER NOT NULL DEFAULT 0,
    ip TEXT,
    user_agent TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    expires_at INTEGER NOT NULL,
    last_used_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token_hash);

  CREATE TABLE IF NOT EXISTS invite_tokens (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    cabinet_id TEXT NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_by TEXT NOT NULL REFERENCES practitioners(id),
    expires_at INTEGER NOT NULL,
    max_uses INTEGER NOT NULL DEFAULT 1000,
    used_count INTEGER NOT NULL DEFAULT 0,
    revoked_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS patient_consents (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    cabinet_id TEXT NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    email_hash TEXT NOT NULL,
    email_encrypted TEXT,
    opt_in_version TEXT NOT NULL,
    cgu_accepted INTEGER NOT NULL,
    newsletter_optin INTEGER NOT NULL,
    ip TEXT,
    user_agent TEXT,
    invite_token_id TEXT REFERENCES invite_tokens(id) ON DELETE SET NULL,
    confirmed_at INTEGER,
    unsubscribed_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_patient_per_cabinet ON patient_consents(cabinet_id, email_hash);

  CREATE TABLE IF NOT EXISTS patient_magic_links (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    cabinet_id TEXT NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    email_hash TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    used_at INTEGER,
    ip TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    parent_id TEXT,
    icon TEXT,
    color TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    body_md TEXT NOT NULL DEFAULT '',
    slides_json TEXT NOT NULL DEFAULT '[]',
    reading_time_min INTEGER NOT NULL DEFAULT 3,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'archived')),
    validated_by TEXT,
    validated_at INTEGER,
    next_review_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS article_categories (
    article_slug TEXT NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (article_slug, category_id)
  );

  CREATE TABLE IF NOT EXISTS reading_sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    cabinet_id TEXT NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    patient_email_hash TEXT NOT NULL,
    article_slug TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'direct' CHECK (source IN ('newsletter', 'direct', 'site')),
    newsletter_send_id TEXT,
    started_at INTEGER NOT NULL DEFAULT (unixepoch()),
    ended_at INTEGER,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    max_scroll_pct INTEGER NOT NULL DEFAULT 0,
    max_slide_reached INTEGER,
    completed INTEGER NOT NULL DEFAULT 0,
    client_user_agent TEXT,
    client_viewport TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_reading_cabinet ON reading_sessions(cabinet_id, started_at DESC);

  CREATE TABLE IF NOT EXISTS article_heartbeats (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    reading_session_id TEXT NOT NULL REFERENCES reading_sessions(id) ON DELETE CASCADE,
    cabinet_id TEXT NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    ts INTEGER NOT NULL DEFAULT (unixepoch()),
    scroll_pct INTEGER NOT NULL DEFAULT 0,
    tab_visible INTEGER NOT NULL DEFAULT 1,
    slide_index INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_heartbeats_session_ts ON article_heartbeats(reading_session_id, ts);

  CREATE TABLE IF NOT EXISTS newsletter_templates (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    preview_image_url TEXT,
    react_email_path TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS newsletter_sends (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    cabinet_id TEXT NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    template_id TEXT REFERENCES newsletter_templates(id) ON DELETE SET NULL,
    article_slug TEXT,
    subject TEXT NOT NULL,
    scheduled_at INTEGER,
    sent_at INTEGER,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
    total_recipients INTEGER NOT NULL DEFAULT 0,
    practitioner_name TEXT,
    cabinet_name TEXT,
    custom_message TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    created_by TEXT
  );

  CREATE TABLE IF NOT EXISTS newsletter_recipients (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    send_id TEXT NOT NULL REFERENCES newsletter_sends(id) ON DELETE CASCADE,
    cabinet_id TEXT NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    patient_email_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'clicked', 'bounced', 'unsubscribed', 'erased')),
    sent_at INTEGER,
    opened_at INTEGER,
    clicked_at INTEGER,
    unsubscribed_at INTEGER,
    brevo_message_id TEXT
  );

  CREATE TABLE IF NOT EXISTS cabinet_subscriptions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    cabinet_id TEXT NOT NULL UNIQUE REFERENCES cabinets(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'cabinet')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete')),
    current_period_start INTEGER,
    current_period_end INTEGER,
    cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
    is_ambassador INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    ts INTEGER NOT NULL DEFAULT (unixepoch()),
    actor_type TEXT NOT NULL CHECK (actor_type IN ('practitioner', 'patient', 'system', 'admin')),
    actor_id TEXT,
    cabinet_id TEXT REFERENCES cabinets(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    ip TEXT,
    user_agent TEXT,
    metadata TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_audit_cabinet_ts ON audit_logs(cabinet_id, ts DESC);

  CREATE TABLE IF NOT EXISTS rate_limits (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    route TEXT NOT NULL,
    key TEXT NOT NULL,
    ip TEXT,
    ts INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_rate_limits_route_key_ts ON rate_limits(route, key, ts);
  CREATE INDEX IF NOT EXISTS idx_rate_limits_ts ON rate_limits(ts);
`;

async function main() {
  for (const stmt of schema.split(';').map((s) => s.trim()).filter((s) => s.length > 0)) {
    await client.execute(stmt);
  }

  // Migrations idempotentes : ajout de colonnes qui etaient absentes des
  // CREATE TABLE initiaux mais qui sont referencees par le code applicatif.
  // SQLite n'a pas ALTER TABLE ADD COLUMN IF NOT EXISTS, donc on teste
  // pragma_table_info avant chaque ajout.
  const migrations: Array<{ table: string; column: string; ddl: string }> = [
    { table: 'cabinets', column: 'newsletter_branding', ddl: "ALTER TABLE cabinets ADD COLUMN newsletter_branding text NOT NULL DEFAULT '{\"showLogo\":false}'" },
    { table: 'patient_consents', column: 'consent_newsletter', ddl: 'ALTER TABLE patient_consents ADD COLUMN consent_newsletter integer NOT NULL DEFAULT 0' },
    { table: 'patient_consents', column: 'consent_analytics', ddl: 'ALTER TABLE patient_consents ADD COLUMN consent_analytics integer NOT NULL DEFAULT 0' },
    { table: 'patient_consents', column: 'consent_reactions', ddl: 'ALTER TABLE patient_consents ADD COLUMN consent_reactions integer NOT NULL DEFAULT 0' },
    { table: 'patient_consents', column: 'consent_version', ddl: "ALTER TABLE patient_consents ADD COLUMN consent_version text DEFAULT '1.0'" },
    { table: 'patient_consents', column: 'consent_timestamp', ddl: 'ALTER TABLE patient_consents ADD COLUMN consent_timestamp integer' },
  ];
  for (const m of migrations) {
    const r = await client.execute({ sql: `PRAGMA table_info(${m.table})`, args: [] });
    const exists = r.rows.some((row: any) => row.name === m.column);
    if (!exists) {
      await client.execute({ sql: m.ddl, args: [] });
      console.log(`Migration: ${m.table}.${m.column} ajoutee.`);
    }
  }

  // Tables manquantes dans le schema literal (ajoutees par evolution)
  const tablesCheck = await client.execute({ sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='cabinet_library_articles'", args: [] });
  if (tablesCheck.rows.length === 0) {
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS cabinet_library_articles (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        cabinet_id TEXT NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
        article_id TEXT NOT NULL REFERENCES articles(slug) ON DELETE CASCADE,
        is_visible INTEGER NOT NULL DEFAULT 0,
        is_pinned INTEGER NOT NULL DEFAULT 0,
        pin_order INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )`,
      args: [],
    });
    await client.execute({ sql: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_library_unique ON cabinet_library_articles(cabinet_id, article_id)', args: [] });
    console.log('Migration: cabinet_library_articles cree.');
  }

  console.log('Insertion des templates newsletter (5 looks P2)...');

  const templates = [
    { code: 'moderne', name: 'Moderne', description: 'Design moderne avec couleurs vives', react_email_path: 'emails/moderne.tsx' },
    { code: 'classique', name: 'Classique', description: 'Design sobre et professionnel', react_email_path: 'emails/classique.tsx' },
    { code: 'chaleureux', name: 'Chaleureux', description: 'Ton chaleureux et convivial', react_email_path: 'emails/chaleureux.tsx' },
    { code: 'epure', name: 'Epure', description: 'Design minimaliste, focus contenu', react_email_path: 'emails/epure.tsx' },
    { code: 'premium', name: 'Premium', description: 'Design haut de gamme', react_email_path: 'emails/premium.tsx' },
  ];

  for (const t of templates) {
    await client.execute({
      sql: 'INSERT OR IGNORE INTO newsletter_templates (code, name, description, react_email_path) VALUES (?, ?, ?, ?)',
      args: [t.code, t.name, t.description, t.react_email_path],
    });
  }

  console.log('Base initialisee :', dbFile);
  console.log(templates.length, 'templates inseres.');
  console.log('\nProchaines etapes :');
  console.log('  npm run admin:create -- --email paul@sensident.fr --name "Paul Foucault" --role superadmin');
  console.log('  npx tsx scripts/seed-full.ts');
}

main().catch((e) => { console.error(e); process.exit(1); });
