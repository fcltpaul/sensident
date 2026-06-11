import postgres from 'postgres';
const url = process.env.DATABASE_URL!;
const sql = postgres(url, { max: 1 });
(async () => {
  // Tente l'INSERT minimal qui crash
  try {
    const r = await sql`
      INSERT INTO practitioners (cabinet_id, email, name, password_hash, totp_secret, totp_enabled, role)
      VALUES (gen_random_uuid(), 'test1@x.fr', 'test1', 'xxx', 'yyy', false, 'owner')
      RETURNING id
    `;
    console.log('OK:', r[0]);
  } catch (e: any) {
    console.log('ERR1:', e.message);
  }

  // Tente avec cabinet_id valide (recupere un existant)
  try {
    const cab = await sql`INSERT INTO cabinets (slug, name) VALUES ('test-cab-${Date.now()}', 'Test') RETURNING id`;
    const r = await sql`
      INSERT INTO practitioners (cabinet_id, email, name, password_hash, totp_secret, totp_enabled, role)
      VALUES (${cab[0].id}, 'test2@x.fr', 'test2', 'xxx', 'yyy', false, 'owner')
      RETURNING id
    `;
    console.log('OK2:', r[0]);
    await sql`DELETE FROM cabinets WHERE id = ${cab[0].id}`;
  } catch (e: any) {
    console.log('ERR2:', e.message);
  }

  // Schema exact de practitioners
  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'practitioners'
    ORDER BY ordinal_position
  `;
  console.log('\nSchema practitioners:');
  for (const c of cols) console.log('  ', c.column_name, c.data_type, c.is_nullable);

  await sql.end();
})();
