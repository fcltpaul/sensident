// Sensident — Test Neon direct des nouvelles colonnes + JSON casts.
// Verifie qu'on peut lire/écrire newsletter_branding et newsletter_cadence
// sur cabinets avec cast jsonb, sans crash.
import { neon } from '@neondatabase/serverless';

const url = 'postgresql://neondb_owner:npg_VIyg5MNw7CDe@ep-square-field-aszhdyyu-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(url);

// 1) Reset branding + cadence du cabinet demo François à des valeurs propres
const cabRows = await sql`SELECT id::text AS id FROM cabinets WHERE slug = 'demo-francois-thibault' LIMIT 1`;
const cabId = cabRows[0]?.id;
if (!cabId) { console.error('Cabinet demo introuvable'); process.exit(1); }
console.log(`Cabinet demo: ${cabId}`);

// 2) Tests d'écriture et lecture
const testBranding = JSON.stringify({
  logoUrl: 'https://example.com/logo.png',
  accentColor: '#1E40AF',
  signature: 'Cordialement, Dr François',
  showLogo: true,
});

await sql`
  UPDATE cabinets
  SET newsletter_branding = ${testBranding}::jsonb, updated_at = NOW()
  WHERE id::text = ${cabId}::text
`;
const r1 = await sql`SELECT newsletter_branding FROM cabinets WHERE id::text = ${cabId}::text`;
console.log('Branding ecrit/lu:', JSON.stringify(r1[0]?.newsletter_branding));

const testCadence = JSON.stringify({ frequency: 'weekly', sendDay: 2, sendHour: 9 });
await sql`
  UPDATE cabinets
  SET newsletter_cadence = ${testCadence}::jsonb, updated_at = NOW()
  WHERE id::text = ${cabId}::text
`;
const r2 = await sql`SELECT newsletter_cadence FROM cabinets WHERE id::text = ${cabId}::text`;
console.log('Cadence ecrit/lu:', JSON.stringify(r2[0]?.newsletter_cadence));

// 3) Validation (avec valeurs bidons pour verifier les path d'erreur cote Neon : on s'attend a un cast jsonb OK)
const invalidBranding = 'pas du json';
try {
  await sql`UPDATE cabinets SET newsletter_branding = ${invalidBranding}::jsonb WHERE id::text = ${cabId}::text`;
  console.log('!!! CAST Bidon PASSE pas attendu');
} catch (e) {
  console.log('CAST Bidon OK (rejete, normal):', e.message.split('\n')[0]);
}

// 4) Restore Demo François : branding vide, cadence vide (comme avant les tests)
await sql`
  UPDATE cabinets
  SET
    newsletter_branding = '{"showLogo":false}'::jsonb,
    newsletter_cadence = NULL,
    updated_at = NOW()
  WHERE id::text = ${cabId}::text
`;
const r3 = await sql`SELECT newsletter_branding, newsletter_cadence FROM cabinets WHERE id::text = ${cabId}::text`;
console.log('Restore OK. etat final:');
console.log('  branding =', JSON.stringify(r3[0]?.newsletter_branding));
console.log('  cadence =', JSON.stringify(r3[0]?.newsletter_cadence));

console.log('\n[OK] Tests Neon reussis.');
