import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });

console.log('\n=== Dernières tentatives email (toutes, 20 dernières) ===\n');
const all = await sql`
  SELECT id, kind, to_hash, subject, success, error, provider, provider_message_id,
         cabinet_id, created_at
  FROM email_logs
  ORDER BY created_at DESC
  LIMIT 20
`;
for (const r of all) {
  console.log(`${r.created_at?.toISOString?.() ?? r.created_at} | kind=${r.kind} | success=${r.success} | provider=${r.provider} | to_hash=${r.to_hash?.slice(0, 16)}... | subject=${r.subject?.slice(0, 60)} | err=${r.error?.slice(0, 80) ?? '-'}`);
}

console.log('\n=== Recherche spécifique (tous hashes contenant "29a91320b1a19fbb") ===\n');
const target = await sql`
  SELECT id, kind, to_hash, subject, success, error, provider, provider_message_id,
         cabinet_id, created_at
  FROM email_logs
  WHERE to_hash LIKE ${'%29a91320b1a19fbb%'}
  ORDER BY created_at DESC
`;
console.log('Rangées trouvées:', target.length);
for (const r of target) {
  console.log(JSON.stringify(r, null, 2));
}

console.log('\n=== Patient consentements récents (5 derniers) ===\n');
const consents = await sql`
  SELECT id, cabinet_id, email_hash, confirmed_at, created_at
  FROM patient_consents
  ORDER BY created_at DESC
  LIMIT 5
`;
for (const r of consents) {
  console.log(`${r.created_at} | confirmed=${r.confirmed_at} | cab=${r.cabinet_id?.slice(0, 8)}... | email_hash=${r.email_hash?.slice(0, 16)}...`);
}

await sql.end();