import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });

// Récap des colonnes de email_logs
console.log('\n=== Schema email_logs ===\n');
const cols = await sql`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'email_logs'
  ORDER BY ordinal_position
`;
for (const c of cols) console.log(`  ${c.column_name} ${c.data_type} ${c.is_nullable}`);

// Compter tentatives échouées par error pattern
console.log('\n=== Total email_logs ===\n');
const total = await sql`SELECT COUNT(*)::int as n FROM email_logs`;
console.log('Total:', total[0].n);

// Test INSERT direct pour vérifier que ça marche
console.log('\n=== Test INSERT direct dans email_logs ===\n');
const testId = `test-${Date.now()}`;
try {
  await sql`
    INSERT INTO email_logs (id, kind, to_hash, subject, success, provider, metadata)
    VALUES (
      ${testId},
      'diag_insert_test',
      'abcd1234abcd1234',
      'Diagnostic check',
      true,
      'manual',
      ${JSON.stringify({ ts: new Date().toISOString(), source: 'check-env-config.mjs' })}::text
    )
  `;
  console.log('INSERT OK');
  // Cleanup
  await sql`DELETE FROM email_logs WHERE id = ${testId}`;
  console.log('DELETE OK');
} catch (e) {
  console.log('INSERT FAIL:', e.message);
}

await sql.end();