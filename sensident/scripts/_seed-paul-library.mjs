/**
 * Seed la bibliothèque (cabinet_library_articles) pour les comptes réels
 * de Paul (paul et cabinet-foucault) qui sont actuellement vides.
 *
 * Idempotent : ON CONFLICT (cabinet_id, article_id) DO NOTHING.
 * Reproduit le seed démo François : 10 articles, tous visibles, 5 premiers épinglés.
 *
 * 2026-07-07 12h00 — Demande Paul : "La bibliothèque n'affiche plus aucun article"
 * Cause : seul le compte démo François a été seedé. Les comptes réels
 * (paul, cabinet-foucault) n'ont jamais reçu d'articles dans leur bibliothèque.
 */
import fs from 'node:fs';
import postgres from 'postgres';
import crypto from 'node:crypto';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const url = env.DATABASE_URL;
const sql = postgres(url, { ssl: 'require', max: 1 });

// Cabinets cibles : comptes réels de Paul
const TARGET_CABINETS = [
  { id: 'd2b4da02-8585-4f1e-9e03-1303bb019781', slug: 'paul' },
  { id: '0d54a4e3-7b36-4361-8bae-00882adac45e', slug: 'cabinet-foucault' },
];

// Articles validés
const articles = await sql`SELECT slug FROM articles WHERE status = 'validated' ORDER BY created_at`;
if (articles.length === 0) {
  console.error('Aucun article validé trouvé en base.');
  await sql.end();
  process.exit(1);
}
console.log(`Articles validés : ${articles.length}`);

let totalInserted = 0;
for (const cab of TARGET_CABINETS) {
  console.log(`\n=== Cabinet : ${cab.slug} ===`);

  const existing = await sql`SELECT article_id FROM cabinet_library_articles WHERE cabinet_id::text = ${cab.id}::text`;
  console.log(`  Articles déjà liés : ${existing.length}`);

  for (let i = 0; i < articles.length; i++) {
    const slug = articles[i].slug;
    const isPinned = i < 5;
    const isVisible = true;
    const pinOrder = isPinned ? i : 0;
    const id = crypto.randomUUID();

    const inserted = await sql`
      INSERT INTO cabinet_library_articles
        (id, cabinet_id, article_id, is_visible, is_pinned, pin_order, created_at, updated_at)
      VALUES
        (${id}, ${cab.id}, ${slug}, ${isVisible}, ${isPinned}, ${pinOrder}, NOW(), NOW())
      ON CONFLICT (cabinet_id, article_id) DO NOTHING
      RETURNING id
    `;
    if (inserted.length > 0) {
      totalInserted++;
      console.log(`  ✓ ${slug} (épinglé=${isPinned})`);
    } else {
      console.log(`  - ${slug} (déjà présent, skip)`);
    }
  }
}

console.log(`\n=== Terminé : ${totalInserted} articles insérés au total ===`);

console.log('\n=== État final ===');
const final = await sql`
  SELECT c.slug, COUNT(cla.id)::int as n
  FROM cabinets c
  LEFT JOIN cabinet_library_articles cla ON cla.cabinet_id::text = c.id::text
  WHERE c.id = ANY(${TARGET_CABINETS.map((c) => c.id)}::text[])
  GROUP BY c.slug
`;
for (const r of final) console.log(`  ${r.slug} : ${r.n} articles`);

await sql.end();
