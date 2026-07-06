import postgres from 'postgres';
import crypto from 'node:crypto';

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });

const testId = crypto.randomUUID();
console.log('Test UUID:', testId);

try {
  await sql`
    INSERT INTO email_logs (id, kind, to_hash, subject, success, error, provider, provider_message_id, cabinet_id, metadata)
    VALUES (
      ${testId}::text,
      'diag_uuid_test',
      'abcd1234abcd1234',
      'Diagnostic check',
      true,
      null,
      'manual',
      null,
      null::text,
      null::text
    )
  `;
  console.log('INSERT OK with UUID');
  await sql`DELETE FROM email_logs WHERE id = ${testId}::text`;
  console.log('DELETE OK');
} catch (e) {
  console.log('INSERT FAIL:', e.message);
}

await sql.end();