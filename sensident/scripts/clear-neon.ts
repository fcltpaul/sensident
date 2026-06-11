import postgres from 'postgres';
const url = process.env.DATABASE_URL!;
const sql = postgres(url, { max: 1 });
const tables = ['newsletter_recipients','newsletter_sends','patient_consents','patient_magic_links','invite_tokens','reading_sessions','article_heartbeats','practitioner_sessions','practitioners','admin_sessions','admins','audit_logs','rate_limits','cabinet_subscriptions','article_categories','categories','cabinets'];
(async () => {
  for (const t of tables) {
    try { await sql.unsafe('DELETE FROM ' + t); console.log('cleared', t); } catch (e: any) { console.log('skip', t, '-', e.message); }
  }
  const c = await sql`SELECT COUNT(*)::int as c FROM cabinets`;
  console.log('cabinets remaining:', c[0].c);
  await sql.end();
})();
