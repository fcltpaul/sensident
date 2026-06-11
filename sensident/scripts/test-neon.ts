import postgres from 'postgres';
const url = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_VIyg5MNw7CDe@ep-square-field-aszhdyyu-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = postgres(url, { max: 1, connect_timeout: 10 });
(async () => {
  try {
    const r = await sql`SELECT version()`;
    console.log('OK:', r[0]);
    const r2 = await sql`SELECT current_database() as db, current_user as user, inet_server_addr() as ip`;
    console.log('INFO:', r2[0]);
    await sql.end();
    process.exit(0);
  } catch (e: any) {
    console.log('ERR:', e.message);
    process.exit(1);
  }
})();
