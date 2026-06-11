/**
 * Reproduction minimale du bug Neon Drizzle null params.
 * Compare 4 cas : Date / null Date / Date valide / null sans Date.
 */
import postgres from 'postgres';

const url = process.env.DATABASE_URL!;
console.log('URL:', url.slice(0, 50) + '...');

const sql = postgres(url, { max: 1, connect_timeout: 10 });

async function test(label: string, fn: () => Promise<any>) {
  console.log(`\n=== ${label} ===`);
  try {
    const r = await fn();
    console.log('  OK:', r);
    return r;
  } catch (e: any) {
    console.log('  FAIL:', e.message);
    return null;
  }
}

async function main() {
  // Cleanup
  await sql`DELETE FROM practitioners WHERE email LIKE 'test-%'`;

  // Get a cabinet_id
  const cab = (await sql`SELECT id FROM cabinets LIMIT 1`)[0];
  if (!cab) {
    console.log('No cabinet, create one first');
    return;
  }
  console.log('Using cabinet:', cab.id);

  // Test 1: insert avec un Date valide
  await test('Date valide (expiresAt)', async () => {
    return await sql`
      INSERT INTO practitioner_sessions (practitioner_id, cabinet_id, token_hash, mfa_verified, expires_at)
      VALUES (gen_random_uuid(), ${cab.id}, 'tok1', false, ${new Date(Date.now() + 86400000)})
      RETURNING id
    `;
  });

  // Test 2: insert avec null Date (NOT NULL on last_used_at, mais ok ici)
  await test('Date null (last_used_at)', async () => {
    return await sql`
      INSERT INTO practitioner_sessions (practitioner_id, cabinet_id, token_hash, mfa_verified, expires_at, last_used_at)
      VALUES (gen_random_uuid(), ${cab.id}, 'tok2', false, ${new Date(Date.now() + 86400000)}, null)
      RETURNING id
    `;
  });

  // Test 3: insert avec timestamp JS via toISOString
  await test('Date en ISO string', async () => {
    return await sql`
      INSERT INTO practitioner_sessions (practitioner_id, cabinet_id, token_hash, mfa_verified, expires_at)
      VALUES (gen_random_uuid(), ${cab.id}, 'tok3', false, ${new Date(Date.now() + 86400000).toISOString()})
      RETURNING id
    `;
  });

  // Test 4: insert avec un timestamp numerique (ce que postgres-js voit)
  await test('Date en timestamp numerique', async () => {
    return await sql`
      INSERT INTO practitioner_sessions (practitioner_id, cabinet_id, token_hash, mfa_verified, expires_at)
      VALUES (gen_random_uuid(), ${cab.id}, 'tok4', false, ${Date.now()})
      RETURNING id
    `;
  });

  // Cleanup
  await sql`DELETE FROM practitioners WHERE email LIKE 'test-%'`;
  await sql.end();
  console.log('\nDone.');
}

main();
