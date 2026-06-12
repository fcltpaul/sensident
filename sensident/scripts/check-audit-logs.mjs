import { createClient } from '@libsql/client';
import postgres from 'postgres';

const sdb = createClient({ url: 'file:./dev.db' });
const sr = await sdb.execute({
  sql: "SELECT action, COUNT(*) as c FROM audit_logs WHERE action LIKE 'stripe_webhook_%' GROUP BY action",
  args: [],
});
console.log('SQLite:');
console.log(JSON.stringify(sr.rows, null, 2));
await sdb.close();

const sql = postgres('postgresql://neondb_owner:npg_VIyg5MNw7CDe@ep-square-field-aszhdyyu-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require', { max: 1 });
try {
  const nr = await sql`SELECT action, COUNT(*)::int as c FROM audit_logs WHERE action LIKE 'stripe_webhook_%' GROUP BY action`;
  console.log('Neon:');
  console.log(JSON.stringify(nr, null, 2));
} catch (e) {
  console.log('Neon err:', e.message);
}
await sql.end();
