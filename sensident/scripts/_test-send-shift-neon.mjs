// Sensident — Test Neon du décalage de collision.
// Insere 2 newsletter_sends programmees pour le cabinet demo (T+10min et T+20min),
// simule un PUT a T+15min et verifie que la T+20min est decalee a T+30min.
// Restaurre l'etat a la fin.

import { neon } from '@neondatabase/serverless';

const url = 'postgresql://neondb_owner:npg_VIyg5MNw7CDe@ep-square-field-aszhdyyu-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(url);

const cabRows = await sql`SELECT id::text AS id FROM cabinets WHERE slug = 'demo-francois-thibault' LIMIT 1`;
const cabId = cabRows[0]?.id;
if (!cabId) { console.error('Cabinet demo introuvable'); process.exit(1); }
const pracRows = await sql`SELECT id::text AS id FROM practitioners LIMIT 1`;
const pracId = pracRows[0]?.id;
const tmplRows = await sql`SELECT id::text AS id FROM newsletter_templates LIMIT 1`;
const tmplId = tmplRows[0]?.id;
const artRows = await sql`SELECT slug FROM articles LIMIT 1`;
const artSlug = artRows[0]?.slug;
if (!pracId || !tmplId || !artSlug) { console.error('Donnees demo manquantes'); process.exit(1); }

console.log(`Cabinet: ${cabId}`);
console.log(`Praticien: ${pracId}`);
console.log(`Template: ${tmplId}, Article: ${artSlug}`);

// Cleanup au prealable
const existing = await sql`SELECT id::text AS id FROM newsletter_sends WHERE cabinet_id::text = ${cabId}::text AND status = 'scheduled' AND subject = 'TEST_SHIFT'`;
for (const e of (existing || [])) {
  await sql`DELETE FROM newsletter_sends WHERE id::text = ${e.id}::text`;
}

// T0 = maintenant + 1 heure (rond)
const T0 = new Date();
T0.setHours(T0.getHours() + 1, 0, 0, 0);

const inserts = [
  { dt: new Date(T0.getTime() + 10 * 60000), tag: 'A' }, // T0 + 10min
  { dt: new Date(T0.getTime() + 20 * 60000), tag: 'B' }, // T0 + 20min
];
const sendIds = [];
for (const ins of inserts) {
  const id = crypto.randomUUID();
  sendIds.push(id);
  await sql`
    INSERT INTO newsletter_sends
      (id, cabinet_id, template_id, article_slug, subject, scheduled_at, status, total_recipients, created_by, practitioner_name, cabinet_name)
    VALUES (${id}::text, ${cabId}::text, ${tmplId}::text, ${artSlug}, ${'TEST_SHIFT_' + ins.tag}, ${ins.dt.toISOString()}::timestamptz, 'scheduled', 1, ${pracId}::text, 'Test', 'demo')
  `;
}
console.log(`[setup] Insere A=T0+10min (${sendIds[0]}), B=T0+20min (${sendIds[1]})`);

// Programme un nouvel envoi a T0+15min (entre A et B).
// (On simule l'appel direct de shiftConflictingSends sans re-creer le send pour le test.)
const requestedAt = new Date(T0.getTime() + 15 * 60000);
console.log(`[test] Programme envoi a ${requestedAt.toISOString()}`);

// On implemente inline la meme logique que dans /api/newsletter/send/route.ts (v2 = chainage).
const CONFLICT_BEFORE_MS = 5 * 60 * 1000;
const SHIFT_MS = 15 * 60 * 1000;
const WINDOW_AFTER_MS = 15 * 60 * 1000;
const MAX_PASSES = 10;
const excludeId = '00000000-0000-0000-0000-000000000000';
const windowLower = new Date(requestedAt.getTime() - CONFLICT_BEFORE_MS);
const windowUpper = new Date(requestedAt.getTime() + WINDOW_AFTER_MS);
const farFutureCutoff = new Date(requestedAt.getTime() + 12 * 60 * 60 * 1000);

for (let pass = 0; pass < MAX_PASSES; pass++) {
  const candidates = await sql`
    SELECT id::text AS id, scheduled_at::text AS scheduled_at
    FROM newsletter_sends
    WHERE cabinet_id::text = ${cabId}::text
      AND status = 'scheduled'
      AND id::text <> ${excludeId}::text
      AND scheduled_at IS NOT NULL
      AND scheduled_at >= ${windowLower.toISOString()}::timestamptz
      AND scheduled_at <= ${farFutureCutoff.toISOString()}::timestamptz
    ORDER BY scheduled_at ASC
    LIMIT 200
  `;
  const toShift = [];
  let prevSlot = null;
  for (const c of candidates) {
    const schedAt = new Date(c.scheduled_at);
    if (schedAt.getTime() <= requestedAt.getTime()) {
      prevSlot = schedAt;
      continue;
    }
    const isInConflictWindow = schedAt.getTime() >= windowLower.getTime() && schedAt.getTime() <= windowUpper.getTime();
    const tooCloseFromPrev = prevSlot !== null && (schedAt.getTime() - prevSlot.getTime()) < SHIFT_MS;
    if (isInConflictWindow || tooCloseFromPrev) {
      toShift.push({ id: c.id, scheduled_at: schedAt });
    }
    prevSlot = schedAt;
  }
  if (toShift.length === 0) { console.log(`[pass ${pass}] plus rien a decaler.`); break; }
  console.log(`[pass ${pass}] ${toShift.length} candidat(s) a decaler.`);
  let lastSlot = requestedAt;
  for (const t of toShift) {
    const oldAt = t.scheduled_at;
    const naiveShift = new Date(oldAt.getTime() + SHIFT_MS);
    const chainShift = new Date(lastSlot.getTime() + SHIFT_MS);
    const newAt = naiveShift.getTime() > chainShift.getTime() ? naiveShift : chainShift;
    if (newAt.getTime() === oldAt.getTime()) {
      lastSlot = oldAt;
      continue;
    }
    await sql`UPDATE newsletter_sends SET scheduled_at = ${newAt.toISOString()}::timestamptz WHERE id::text = ${t.id}::text`;
    console.log(`   decale ${t.id.slice(0,8)} : ${oldAt.toISOString()} -> ${newAt.toISOString()}`);
    lastSlot = newAt;
  }
}

// Verif etat final
const final = await sql`SELECT id::text AS id, scheduled_at::text AS scheduled_at FROM newsletter_sends WHERE id::text = ANY(${sendIds}::text[]) ORDER BY scheduled_at ASC`;
console.log('\netat final:');
for (const s of final) {
  console.log(`  ${s.id.slice(0,8)} : ${s.scheduled_at}`);
}

// Cleanup
for (const id of sendIds) {
  await sql`DELETE FROM newsletter_sends WHERE id::text = ${id}::text`;
}
console.log('\n[cleanup] envoyes de test supprimes.');
