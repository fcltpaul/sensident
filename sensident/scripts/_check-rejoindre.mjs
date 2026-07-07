import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

const sql = neon('postgresql://neondb_owner:npg_VIyg5MNw7CDe@ep-square-field-aszhdyyu-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

// Test scenario : cabinet demo + un token connu
const slug = 'demo-francois-thibault';
const token = 'test-token-12345';

const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

console.log('=== Test query exacte de /c/[slug]/rejoindre ===');

// 1. SELECT cabinet
const cabs = await sql`SELECT id, name FROM cabinets WHERE slug = ${slug} LIMIT 1`;
console.log('cabinet:', cabs);

if (cabs[0]) {
  // 2. SELECT invite_tokens
  const tokens = await sql`
    SELECT id FROM invite_tokens
    WHERE cabinet_id::text = ${cabs[0].id}::text
      AND token_hash = ${tokenHash}
      AND expires_at > NOW()
      AND revoked_at IS NULL
    LIMIT 1
  `;
  console.log('token valid:', tokens);
}

// 3. Test full /rejoindre sans token (cas landing R1)
console.log('\n=== Test sans token (landing R1) ===');
const cabNoToken = await sql`SELECT id, name FROM cabinets WHERE slug = ${slug} LIMIT 1`;
console.log('cabinet:', cabNoToken);

// 4. Test avec un token valide
console.log('\n=== Test avec token reel (2e ligne du sample) ===');
const validToken = '9864222ccbdf269c326bf7866f4611552bfe777eb5b73994662dfb3e1cc92aa9'; // hash connu
const tokens2 = await sql`
  SELECT id FROM invite_tokens
  WHERE cabinet_id::text = ${cabs[0].id}::text
    AND token_hash = ${validToken}
    AND expires_at > NOW()
    AND revoked_at IS NULL
  LIMIT 1
`;
console.log('token valid:', tokens2);