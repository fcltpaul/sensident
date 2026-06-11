const { createClient } = require('@libsql/client');
const db = createClient({ url: 'file:C:/Users/clawuser/.openclaw/workspace-tartrinator/sensident/dev.db' });
(async () => {
  const tables = ['newsletter_recipients','newsletter_sends','patient_consents','patient_magic_links','invite_tokens','reading_sessions','article_heartbeats','practitioner_sessions','practitioners','admin_sessions','admins','audit_logs','rate_limits','cabinet_subscriptions','article_categories','categories','cabinets'];
  for (const t of tables) {
    try { await db.execute(`DELETE FROM ${t}`); } catch (e) { console.log('skip', t, e.message); }
  }
  console.log('cleared');
  process.exit(0);
})();
