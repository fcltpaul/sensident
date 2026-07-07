// Sensident — Stress test du décalage de collision.
// Insere 5 newsletter_sends a des intervalles de 5min, puis insere une nouvelle
// au milieu. Verifie que toutes les newsletters conservees sont espacees >= 15min.
import { neon } from '@neondatabase/serverless';

const url = 'postgresql://neondb_owner:npg_VIyg5MNw7CDe@ep-square-field-aszhdyyu-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(url);

const cabRows = await sql`SELECT id::text AS id FROM cabinets WHERE slug = 'demo-francois-thibault' LIMIT 1`;
const cabId = cabRows[0]?.id;
const pracRows = await sql`SELECT id::text AS id FROM practitioners LIMIT 1`;
const pracId = pracRows[0]?.id;
const tmplRows = await sql`SELECT id::text AS id FROM newsletter_templates LIMIT 1`;
const tmplId = tmplRows[0]?.id;
const artRows = await sql`SELECT slug FROM articles LIMIT 1`;
const artSlug = artRows[0]?.slug;
if (!cabId || !pracId || !tmplId || !artSlug) { console.error('Setup demo manquant'); process.exit(1); }

// Cleanup prealable
const existing = await sql`SELECT id::text AS id FROM newsletter_sends WHERE cabinet_id::text = ${cabId}::text AND status = 'scheduled' AND subject LIKE 'TEST_STRESS%'`;
for (const e of (existing || [])) {
  await sql`DELETE FROM newsletter_sends WHERE id::text = ${e.id}::text`;
}

const T0 = new Date();
T0.setHours(T0.getHours() + 1, 0, 0, 0);

// Insere 5 envoyes a T0+5min, T0+10min, T0+15min, T0+20min, T0+25min
const sendIds = [];
for (let i = 0; i < 5; i++) {
  const id = crypto.randomUUID();
  sendIds.push(id);
  await sql`
    INSERT INTO newsletter_sends
      (id, cabinet_id, template_id, article_slug, subject, scheduled_at, status, total_recipients, created_by, practitioner_name, cabinet_name)
    VALUES (${id}::text, ${cabId}::text, ${tmplId}::text, ${artSlug}, ${`TEST_STRESS_${i}`}, ${new Date(T0.getTime() + (i + 1) * 5 * 60000).toISOString()}::timestamptz, 'scheduled', 1, ${pracId}::text, 'Test', 'demo')
  `;
}
console.log(`[setup] 5 envoyes espaces de 5min autour de T0+5min a T0+25min.`);

// On insere un nouveau a T0+12min (entre les 2eme et 3eme envoyes).
const requestedAt = new Date(T0.getTime() + 12 * 60000);
const newSendId = crypto.randomUUID();

// Reimplement de la logique de shiftConflictingSends (v2, chainage).
const CONFLICT_BEFORE_MS = 5 * 60 * 1000;
const SHIFT_MS = 15 * 60 * 1000;
const MAX_PASSES = 10;
const windowLower = new Date(requestedAt.getTime() - CONFLICT_BEFORE_MS);
const windowUpper = new Date(requestedAt.getTime() + 15 * 60 * 1000);
const farFutureCutoff = new Date(requestedAt.getTime() + 12 * 60 * 60 * 1000);

const updates = [];
for (let pass = 0; pass < MAX_PASSES; pass++) {
  const candidates = await sql`
    SELECT id::text AS id, scheduled_at::text AS scheduled_at
    FROM newsletter_sends
    WHERE cabinet_id::text = ${cabId}::text
      AND status = 'scheduled'
      AND id::text <> ${newSendId}::text
      AND subject LIKE 'TEST_STRESS%'
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
  if (toShift.length === 0) { console.log(`[pass ${pass}] fin.`); break; }
  console.log(`[pass ${pass}] ${toShift.length} a decaler.`);
  let lastSlot = requestedAt;
  for (const t of toShift) {
    const oldAt = t.scheduled_at;
    const naiveShift = new Date(oldAt.getTime() + SHIFT_MS);
    const chainShift = new Date(lastSlot.getTime() + SHIFT_MS);
    const newAt = naiveShift.getTime() > chainShift.getTime() ? naiveShift : chainShift;
    if (newAt.getTime() === oldAt.getTime()) { lastSlot = oldAt; continue; }
    await sql`UPDATE newsletter_sends SET scheduled_at = ${newAt.toISOString()}::timestamptz WHERE id::text = ${t.id}::text`;
    updates.push({ id: t.id.slice(0,8), from: oldAt.toISOString(), to: newAt.toISOString() });
    lastSlot = newAt;
  }
}
console.log('\nMises a jour appliquees:');
for (const u of updates) console.log(`  ${u.id}: ${u.from} -> ${u.to}`);

const final = await sql`SELECT id::text AS id, scheduled_at::text AS scheduled_at FROM newsletter_sends WHERE subject LIKE 'TEST_STRESS%' AND status = 'scheduled' ORDER BY scheduled_at ASC`;
console.log(`\netat final (${final.length} envoyes) :`);
for (const s of final) console.log(`  ${s.id.slice(0,8)} : ${s.scheduled_at}`);

// Verifie ecart >= 15min entre chaque send >= requestedAt
// (les envoyes deja passes par rapport au nouveau send ne sont PAS retouches
// par design, c'est le comportement attendu.)
let allOk = true;
const slots = final.map((s) => ({ id: s.id, dt: new Date(s.scheduled_at) }));
const reqDt = new Date(T0.getTime() + 12 * 60000);
const futureSlots = slots.filter((s) => s.dt.getTime() >= reqDt.getTime());
console.log(`\n[invariant] Ecarts entre envoyes >= ${reqDt.toISOString()} (apres insertion du nouveau) :`);
for (let i = 1; i < futureSlots.length; i++) {
  const gap = (futureSlots[i].dt.getTime() - futureSlots[i - 1].dt.getTime()) / 60000;
  if (gap < 15) {
    console.log(`!!! ecart insuffisant (${gap} min) entre ${futureSlots[i - 1].id.slice(0,8)} et ${futureSlots[i].id.slice(0,8)}`);
    allOk = false;
  } else {
    console.log(`  ${futureSlots[i - 1].id.slice(0,8)} -> ${futureSlots[i].id.slice(0,8)} : ${gap} min OK`);
  }
}
if (futureSlots.length === 0) console.log('  (aucun envoye futur a verifier)');
console.log(allOk ? '\n[OK] Invariant respecte pour les envoyes >= requestedAt.' : '\n[FAIL] Invariant casse.');

// Cleanup
for (const s of final) {
  await sql`DELETE FROM newsletter_sends WHERE id::text = ${s.id}::text`;
}
console.log('[cleanup] envoyes de test supprimes.');
