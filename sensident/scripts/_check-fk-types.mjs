import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_VIyg5MNw7CDe@ep-square-field-aszhdyyu-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

const tables = [
  'cabinets', 'practitioners', 'practitioner_sessions', 'cabinet_subscriptions',
  'articles', 'categories', 'article_categories', 'cabinet_library_articles',
  'newsletter_sends', 'newsletter_recipients', 'reading_sessions',
  'patient_reactions', 'patient_consents', 'invite_tokens', 'audit_logs',
  'consent_log', 'email_logs', 'patient_magic_links', 'stripe_webhook_events',
];

for (const t of tables) {
  const cols = await sql`
    SELECT column_name, data_type FROM information_schema.columns 
    WHERE table_name = ${t} 
      AND (column_name IN ('id', 'cabinet_id', 'practitioner_id', 'patient_email_hash', 'article_id', 'email_hash'))
  `;
  console.log(`=== ${t} ===`);
  console.table(cols);
}