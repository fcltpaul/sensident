import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_VIyg5MNw7CDe@ep-square-field-aszhdyyu-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = postgres(DATABASE_URL, { ssl: 'require' });

const rlsSQL = [
  // Enable RLS on all sensitive tables
  "ALTER TABLE practitioner_sessions ENABLE ROW LEVEL SECURITY",
  "ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY",
  "ALTER TABLE patient_consents ENABLE ROW LEVEL SECURITY",
  "ALTER TABLE patient_magic_links ENABLE ROW LEVEL SECURITY",
  "ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY",
  "ALTER TABLE article_heartbeats ENABLE ROW LEVEL SECURITY",
  "ALTER TABLE newsletter_sends ENABLE ROW LEVEL SECURITY",
  "ALTER TABLE newsletter_recipients ENABLE ROW LEVEL SECURITY",
  "ALTER TABLE cabinet_subscriptions ENABLE ROW LEVEL SECURITY",
  "ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY",

  // Policies: auth isolation via app.cabinet_id
  `CREATE POLICY patient_consents_cabinet_isolation ON patient_consents
    USING (cabinet_id::text = current_setting('app.cabinet_id', true))
    WITH CHECK (cabinet_id::text = current_setting('app.cabinet_id', true))`,
  `CREATE POLICY reading_sessions_cabinet_isolation ON reading_sessions
    USING (cabinet_id::text = current_setting('app.cabinet_id', true))
    WITH CHECK (cabinet_id::text = current_setting('app.cabinet_id', true))`,
  `CREATE POLICY heartbeats_cabinet_isolation ON article_heartbeats
    USING (session_id IN (SELECT id FROM reading_sessions WHERE cabinet_id::text = current_setting('app.cabinet_id', true)))`,
  `CREATE POLICY newsletter_sends_cabinet_isolation ON newsletter_sends
    USING (cabinet_id::text = current_setting('app.cabinet_id', true))
    WITH CHECK (cabinet_id::text = current_setting('app.cabinet_id', true))`,
  `CREATE POLICY recipients_cabinet_isolation ON newsletter_recipients
    USING (cabinet_id::text = current_setting('app.cabinet_id', true))
    WITH CHECK (cabinet_id::text = current_setting('app.cabinet_id', true))`,
  `CREATE POLICY tokens_cabinet_isolation ON invite_tokens
    USING (cabinet_id::text = current_setting('app.cabinet_id', true))
    WITH CHECK (cabinet_id::text = current_setting('app.cabinet_id', true))`,
  `CREATE POLICY sessions_cabinet_isolation ON practitioner_sessions
    USING (cabinet_id::text = current_setting('app.cabinet_id', true))
    WITH CHECK (cabinet_id::text = current_setting('app.cabinet_id', true))`,
  `CREATE POLICY magic_links_cabinet_isolation ON patient_magic_links
    USING (cabinet_id::text = current_setting('app.cabinet_id', true))
    WITH CHECK (cabinet_id::text = current_setting('app.cabinet_id', true))`,
  `CREATE POLICY subscriptions_cabinet_isolation ON cabinet_subscriptions
    USING (cabinet_id::text = current_setting('app.cabinet_id', true))
    WITH CHECK (cabinet_id::text = current_setting('app.cabinet_id', true))`,
  `CREATE POLICY audit_logs_cabinet_isolation ON audit_logs
    USING (cabinet_id IS NULL OR cabinet_id::text = current_setting('app.cabinet_id', true))`,

  // Catalogue articles: readable by all authenticated users
  "ALTER TABLE articles ENABLE ROW LEVEL SECURITY",
  `CREATE POLICY articles_read_validated ON articles
    FOR SELECT
    USING (status = 'validated')`,

  // Templates: active templates readable by all
  "ALTER TABLE newsletter_templates ENABLE ROW LEVEL SECURITY",
  `CREATE POLICY templates_read ON newsletter_templates
    FOR SELECT
    USING (true)`,
];

for (const stmt of rlsSQL) {
  try {
    await sql.unsafe(stmt);
    console.log('OK:', stmt.slice(0, 80));
  } catch (e) {
    if (e.message?.includes('already exists')) {
      console.log('SKIP (exists):', stmt.slice(0, 80));
    } else {
      console.error('ERROR:', e.message.slice(0, 120));
    }
  }
}

console.log('\nDone.');
await sql.end();
