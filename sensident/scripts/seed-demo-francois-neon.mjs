/**
 * Sensident — Seed démo Dr François Thibault (NEON)
 *
 * Adapté au schéma RÉEL de Neon (uuid, colonnes contact_*, etc).
 * Idempotent : efface l'ancien cabinet démo avant d'insérer.
 *
 * Usage :
 *   node scripts/seed-demo-francois-neon.mjs
 */
import { createHash, randomUUID, randomBytes } from 'node:crypto';
import postgres from 'postgres';
import fs from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Charge .env
const envPath = resolve(projectRoot, '.env');
try {
  const env = fs.readFileSync(envPath, 'utf-8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
    }
  }
} catch {}

const url = process.env.DATABASE_URL;
if (!url || !url.startsWith('postgres')) {
  console.error('❌ DATABASE_URL doit commencer par postgres://');
  process.exit(1);
}

const sql = postgres(url, { ssl: 'require', max: 1, connect_timeout: 10 });

const SLUG = 'demo-francois-thibault';
const CABINET_NAME = 'Cabinet du Dr François Thibault';
const PRACTITIONER_EMAIL = 'demo@sensident.fr';
const PRACTITIONER_NAME = 'Dr François Thibault';
const PASSWORD_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
const SALT = 'demo-salt-v1';

const FIRST_NAMES = ['Marie', 'Jean', 'Sophie', 'Pierre', 'Camille', 'Lucas', 'Emma', 'Hugo', 'Léa', 'Nathan', 'Chloé', 'Maxime', 'Julie', 'Antoine', 'Sarah', 'Thomas', 'Laura', 'Nicolas', 'Marine', 'Alexandre'];
const LAST_NAMES = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier'];

const SUBJECTS = [
  'Les 5 gestes pour un brossage efficace',
  'Halte au sucre invisible',
  'Vos gencives vous parlent',
  'La carie : tout ce qu\'il faut savoir',
  'Vos visites chez le dentiste : votre meilleur investissement',
];
const ARTICLE_SLUGS = [
  'brossage-efficace', 'fil-brosse-interdentaire', 'bain-de-bouche', 'abcdaire-enfant',
  'sucre-invisible', 'gingivite-alerte', 'carie-tout-savoir', 'brossage-adulte-technique',
  'alimentation-acide', 'soins-prevention-reguliers',
];

function hashEmail(email) {
  return createHash('sha256').update(email + SALT).digest('hex');
}

function daysAgo(d) {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log(`\n  🌟 Sensident — Seed démo Dr François Thibault (Neon)\n`);
  console.log(`  Base : ${url.replace(/:[^:@]+@/, ':***@').slice(0, 80)}…\n`);

  // 0. Prérequis : au moins 10 articles validés
  const ac = await sql`SELECT COUNT(*)::int as c FROM articles WHERE status = 'validated'`;
  if (ac[0].c === 0) {
    console.error('❌ Aucun article validé. Lance d\'abord : node scripts/seed-articles-pg.mjs');
    await sql.end();
    process.exit(1);
  }
  const tc = await sql`SELECT COUNT(*)::int as c FROM newsletter_templates`;
  if (tc[0].c === 0) {
    console.error('❌ Aucun template newsletter.');
    await sql.end();
    process.exit(1);
  }

  // 1. Reset cabinet démo
  const existing = await sql`SELECT id FROM cabinets WHERE slug = ${SLUG}`;
  if (existing.length > 0) {
    console.log(`  🔄 Reset cabinet démo existant (id=${existing[0].id})...`);
    await sql`DELETE FROM cabinets WHERE id = ${existing[0].id}`;
  }

  // 2. Cabinet — adapté au nouveau schema (sans rpps, sans contact_*)
  const cabinetId = randomUUID();
  await sql`
    INSERT INTO cabinets (
      id, slug, name, contact_email,
      newsletter_branding, created_at
    ) VALUES (
      ${cabinetId}, ${SLUG}, ${CABINET_NAME}, ${'contact@cabinet-thibault.fr'},
      ${sql.json({ showLogo: false, accentColor: '#0D9488', signature: 'Dr François Thibault — Prévention bucco-dentaire' })},
      ${daysAgo(120)}
    )
  `;
  console.log(`  ✅ Cabinet créé : ${CABINET_NAME}`);

  // 3. Praticien owner
  const practitionerId = randomUUID();
  await sql`
    INSERT INTO practitioners (id, cabinet_id, email, name, password_hash, totp_enabled, role, last_login_at, created_at)
    VALUES (
      ${practitionerId}, ${cabinetId}, ${PRACTITIONER_EMAIL}, ${PRACTITIONER_NAME},
      ${PASSWORD_HASH}, false, 'owner', ${daysAgo(1)}, ${daysAgo(120)}
    )
  `;
  console.log(`  ✅ Praticien créé : ${PRACTITIONER_EMAIL}`);

  // 4. Subscription Pro
  try {
    await sql`
      INSERT INTO cabinet_subscriptions (id, cabinet_id, plan, status, stripe_customer_id, stripe_subscription_id, current_period_end, is_ambassador, created_at, updated_at)
      VALUES (
        ${randomUUID()}, ${cabinetId}, 'pro', 'active',
        'cus_demo_francois', 'sub_demo_francois',
        ${daysAgo(-365)}, true, ${daysAgo(120)}, ${daysAgo(1)}
      )
    `;
  } catch (e) {
    // Pas de is_ambassador
    await sql`
      INSERT INTO cabinet_subscriptions (id, cabinet_id, plan, status, stripe_customer_id, stripe_subscription_id, current_period_end, created_at, updated_at)
      VALUES (
        ${randomUUID()}, ${cabinetId}, 'pro', 'active',
        'cus_demo_francois', 'sub_demo_francois',
        ${daysAgo(-365)}, ${daysAgo(120)}, ${daysAgo(1)}
      )
    `;
  }
  console.log(`  ✅ Subscription Pro activée`);

  // 5. Patients
  const patients = [];
  for (let i = 0; i < 20; i++) {
    const first = FIRST_NAMES[i];
    const last = LAST_NAMES[i];
    const email = `${first.toLowerCase()}.${last.toLowerCase()}@example.com`;
    const emailHash = hashEmail(email);
    const optInDaysAgo = 5 + Math.floor(Math.random() * 75);
    const confirmedDaysAgo = Math.max(0, optInDaysAgo - 1);

    const patientId = randomUUID();
    // On n'utilise que les colonnes qui existent dans le schema observé
    try {
      await sql`
        INSERT INTO patient_consents (
          id, cabinet_id, email_hash, email_encrypted, opt_in_version,
          cgu_accepted, newsletter_optin, consent_newsletter, consent_analytics, consent_reactions,
          ip, user_agent, created_at, confirmed_at, consent_version, consent_timestamp
        ) VALUES (
          ${patientId}, ${cabinetId}, ${emailHash},
          ${Buffer.from(email).toString('base64')}, ${'1.0'},
          true, true, true, true, true,
          ${'127.0.0.1'}, ${'Démo François'},
          ${daysAgo(optInDaysAgo)}, ${daysAgo(confirmedDaysAgo)}, ${'1.0'}, ${daysAgo(confirmedDaysAgo)}
        )
      `;
    } catch (e) {
      // Si le schema est différent, on tente sans les colonnes consent_*
      await sql`
        INSERT INTO patient_consents (
          id, cabinet_id, email_hash, email_encrypted, opt_in_version,
          cgu_accepted, newsletter_optin, ip, user_agent, created_at, confirmed_at
        ) VALUES (
          ${patientId}, ${cabinetId}, ${emailHash},
          ${Buffer.from(email).toString('base64')}, ${'1.0'},
          true, true, ${'127.0.0.1'}, ${'Démo François'},
          ${daysAgo(optInDaysAgo)}, ${daysAgo(confirmedDaysAgo)}
        )
      `;
    }

    patients.push({ patientId, emailHash, email, confirmedDaysAgo });
  }
  console.log(`  ✅ 20 patients opt-in créés`);

  // 6. 5 newsletters envoyées
  // Le schema réel de newsletter_templates n'a pas 'is_active', juste cabinet_id/name/subject/body_markdown
  // On prend le 1er template du cabinet
  let tpl;
  try {
    tpl = await sql`SELECT id FROM newsletter_templates WHERE cabinet_id = ${cabinetId} OR cabinet_id IS NULL LIMIT 1`;
    if (tpl.length === 0) tpl = await sql`SELECT id FROM newsletter_templates LIMIT 1`;
  } catch {
    tpl = await sql`SELECT id FROM newsletter_templates LIMIT 1`;
  }
  if (!tpl || tpl.length === 0) {
    console.error('❌ Aucun template newsletter.');
    await sql.end();
    process.exit(1);
  }
  const templateId = tpl[0].id;

  for (let i = 0; i < 5; i++) {
    const sendId = randomUUID();
    const articleSlug = ARTICLE_SLUGS[i % ARTICLE_SLUGS.length];
    const subject = SUBJECTS[i];
    const sentAt = daysAgo(60 - i * 12);

    try {
      // Avec recipient_count (schema observé)
      await sql`
        INSERT INTO newsletter_sends (id, cabinet_id, template_id, article_slug, subject, sent_at, recipient_count)
        VALUES (${sendId}, ${cabinetId}, ${templateId}, ${articleSlug}, ${subject}, ${sentAt}, ${patients.length})
      `;
    } catch {
      // Avec total_recipients
      await sql`
        INSERT INTO newsletter_sends (id, cabinet_id, template_id, article_slug, subject, sent_at, total_recipients, status, practitioner_name, cabinet_name, custom_message, created_at, created_by)
        VALUES (${sendId}, ${cabinetId}, ${templateId}, ${articleSlug}, ${subject}, ${sentAt}, ${patients.length}, 'sent', ${PRACTITIONER_NAME}, ${CABINET_NAME}, ${`Sujet : ${subject}`}, ${new Date(sentAt.getTime() - 3600000)}, ${practitionerId})
      `;
    }

    for (const p of patients) {
      const opened = Math.random() > 0.4;
      const clicked = opened && Math.random() > 0.7;
      try {
        await sql`
          INSERT INTO newsletter_recipients (id, send_id, cabinet_id, patient_email_hash, status, sent_at, opened_at, clicked_at)
          VALUES (${randomUUID()}, ${sendId}, ${cabinetId}, ${p.emailHash}, ${clicked ? 'clicked' : (opened ? 'opened' : 'sent')}, ${sentAt},
            ${opened ? new Date(sentAt.getTime() + 3600000 + Math.floor(Math.random() * 86400000)) : null},
            ${clicked ? new Date(sentAt.getTime() + 3600000 + Math.floor(Math.random() * 86400000 * 2)) : null}
          )
        `;
      } catch {
        // newsletter_recipients pas dans ce schema, on s'en fout
        break;
      }
    }
  }
  console.log(`  ✅ 5 newsletters envoyées`);

  // 7. Bibliothèque cabinet
  const articleRows = await sql`SELECT slug FROM articles WHERE status = 'validated'`;
  for (let i = 0; i < articleRows.length; i++) {
    const a = articleRows[i];
    const isPinned = i < 3;
    try {
      await sql`
        INSERT INTO cabinet_library_articles (id, cabinet_id, article_id, is_visible, is_pinned, pin_order, created_at, updated_at)
        VALUES (${randomUUID()}, ${cabinetId}, ${a.slug}, true, ${isPinned}, ${isPinned ? i : 0}, ${new Date()}, ${new Date()})
      `;
    } catch (e) {
      console.log(`     ⚠️ cabinet_library_articles insert raté: ${e.message}`);
    }
  }
  console.log(`  ✅ Bibliothèque cabinet configurée (${articleRows.length} articles, 3 épinglés)`);

  console.log(`\n  🎉 Démo François prête sur Neon !\n`);

  await sql.end();
}

main().catch(async (e) => {
  console.error('❌ Erreur seed :', e.message);
  await sql.end();
  process.exit(1);
});
