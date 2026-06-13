/**
 * Sensident — Seed démo Dr François Thibault (SQLITE, pour démo François)
 *
 * Idempotent : efface les anciennes données du cabinet démo avant d'insérer.
 * Crée :
 *   - Cabinet "Cabinet du Dr François Thibault" (slug: demo-francois-thibault)
 *   - Praticien owner (MFA désactivé, password 'demo1234')
 *   - Subscription Pro
 *   - 20 patients opt-in
 *   - 5 newsletters envoyées (60 derniers jours)
 *   - reading_sessions + article_heartbeats (engagement)
 *   - audit_logs
 *
 * Usage :
 *   node scripts/seed-demo-francois-sqlite.mjs
 */
import { createHash, randomUUID, randomBytes } from 'node:crypto';
import { createClient } from '@libsql/client';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const DB_PATH = resolve(projectRoot, 'dev.db');

if (!existsSync(DB_PATH)) {
  console.error(`❌ dev.db introuvable : ${DB_PATH}`);
  console.error('   Lance d\'abord : npm run db:init');
  process.exit(1);
}

const client = createClient({ url: `file:${DB_PATH}` });
await client.execute('PRAGMA journal_mode=WAL');
await client.execute('PRAGMA foreign_keys=ON');

// ============================================
// CONSTANTES
// ============================================
const SLUG = 'demo-francois-thibault';
const CABINET_NAME = 'Cabinet du Dr François Thibault';
const PRACTITIONER_EMAIL = 'demo@sensident.fr';
const PRACTITIONER_NAME = 'Dr François Thibault';
// bcrypt pour le password 'demo1234' (cost 10 — démo seulement)
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

function randomId() {
  return randomBytes(16).toString('hex');
}

function daysAgo(d) {
  return Math.floor(Date.now() / 1000) - d * 24 * 60 * 60;
}

async function run(sql, args = []) {
  await client.execute({ sql, args });
}

async function get(sql, args = []) {
  const r = await client.execute({ sql, args });
  return r.rows[0];
}

async function all(sql, args = []) {
  const r = await client.execute({ sql, args });
  return r.rows;
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log(`\n  🌟 Sensident — Seed démo Dr François Thibault (SQLite)\n`);
  console.log(`  Base : ${DB_PATH}\n`);

  // 0. Vérifications prérequis
  const articleCount = await get("SELECT COUNT(*) as c FROM articles WHERE status = 'validated'");
  if (Number(articleCount.c) === 0) {
    console.error('❌ Aucun article validé. Lance d\'abord :');
    console.error('   node scripts/seed-articles-sqlite.mjs');
    process.exit(1);
  }
  const tplCount = await get("SELECT COUNT(*) as c FROM newsletter_templates");
  if (Number(tplCount.c) === 0) {
    console.error('❌ Aucun template newsletter.');
    process.exit(1);
  }

  // 1. Reset cabinet démo
  const existing = await get("SELECT id FROM cabinets WHERE slug = ?", [SLUG]);
  if (existing) {
    console.log(`  🔄 Reset cabinet démo existant (id=${existing.id})...`);
    await run("DELETE FROM cabinets WHERE id = ?", [existing.id]);
  }

  // 2. Cabinet
  const cabinetId = randomId();
  await run(`
    INSERT INTO cabinets (id, slug, name, contact_email, created_at, newsletter_branding)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    cabinetId,
    SLUG,
    CABINET_NAME,
    'contact@cabinet-thibault.fr',
    daysAgo(120),
    JSON.stringify({ showLogo: false, accentColor: '#0D9488', signature: 'Dr François Thibault — Prévention bucco-dentaire' }),
  ]);
  console.log(`  ✅ Cabinet créé : ${CABINET_NAME}`);

  // 3. Praticien owner
  const practitionerId = randomId();
  await run(`
    INSERT INTO practitioners (id, cabinet_id, email, name, password_hash, totp_enabled, role, email_verified_at, last_login_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, 'owner', ?, ?, ?, ?)
  `, [practitionerId, cabinetId, PRACTITIONER_EMAIL, PRACTITIONER_NAME, PASSWORD_HASH, daysAgo(120), daysAgo(1), daysAgo(120), daysAgo(1)]);
  console.log(`  ✅ Praticien créé : ${PRACTITIONER_EMAIL}`);

  // 4. Subscription Pro
  await run(`
    INSERT INTO cabinet_subscriptions (id, cabinet_id, plan, status, stripe_customer_id, stripe_subscription_id, current_period_end, is_ambassador, created_at, updated_at)
    VALUES (?, ?, 'pro', 'active', 'cus_demo_francois', 'sub_demo_francois', ?, 1, ?, ?)
  `, [randomId(), cabinetId, daysAgo(-365), daysAgo(120), daysAgo(1)]);
  console.log(`  ✅ Subscription Pro activée`);

  // 5. Patients + lectures + heartbeats + réactions
  const patients = [];
  for (let i = 0; i < 20; i++) {
    const first = FIRST_NAMES[i];
    const last = LAST_NAMES[i];
    const email = `${first.toLowerCase()}.${last.toLowerCase()}@example.com`;
    const emailHash = hashEmail(email);
    const patientId = randomId();
    const optInDaysAgo = 5 + Math.floor(Math.random() * 75);
    const confirmedDaysAgo = Math.max(0, optInDaysAgo - 1);

    await run(`
      INSERT INTO patient_consents (
        id, cabinet_id, email_hash, email_encrypted, opt_in_version,
        cgu_accepted, newsletter_optin, ip, user_agent, invite_token_id,
        created_at, confirmed_at, consent_newsletter, consent_analytics, consent_reactions,
        consent_version, consent_timestamp
      ) VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?, NULL, ?, ?, 1, 1, 1, '1.0', ?)
    `, [patientId, cabinetId, emailHash, null, '1.0', '127.0.0.1', 'Démo François', daysAgo(optInDaysAgo), daysAgo(confirmedDaysAgo), daysAgo(confirmedDaysAgo)]);


    // 1-4 lectures par patient
    const nbLectures = 1 + Math.floor(Math.random() * 4);
    for (let j = 0; j < nbLectures; j++) {
      const sessionId = randomId();
      const articleSlug = ARTICLE_SLUGS[Math.floor(Math.random() * ARTICLE_SLUGS.length)];
      const startedDaysAgo = Math.max(0, confirmedDaysAgo - Math.floor(Math.random() * 30));
      const duration = 30 + Math.floor(Math.random() * 120);
      const completed = Math.random() > 0.4 ? 1 : 0;
      const startTs = daysAgo(startedDaysAgo);

      await run(`
        INSERT INTO reading_sessions (id, cabinet_id, patient_email_hash, article_slug, started_at, ended_at, duration_seconds, max_scroll_pct, completed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [sessionId, cabinetId, emailHash, articleSlug, startTs, startTs, duration, 100, completed]);

      const nbHb = 3 + Math.floor(Math.random() * 4);
      for (let k = 0; k < nbHb; k++) {
        await run(`
          INSERT INTO article_heartbeats (id, reading_session_id, cabinet_id, ts, scroll_pct, tab_visible)
          VALUES (?, ?, ?, ?, ?, 1)
        `, [randomId(), sessionId, cabinetId, startTs + k * 15, Math.min(100, Math.floor((k + 1) * 100 / nbHb))]);
      }
    }

    // Réaction (60% like)
    if (Math.random() > 0.4) {
      try {
        await run(`
          INSERT INTO patient_reactions (id, article_id, cabinet_id, patient_email_hash, reaction, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [randomId(), ARTICLE_SLUGS[Math.floor(Math.random() * ARTICLE_SLUGS.length)], cabinetId, emailHash, Math.random() > 0.2 ? 'like' : 'dislike', daysAgo(Math.floor(Math.random() * 60))]);
      } catch (e) {
        // doublon, on ignore
      }
    }

    patients.push({ id: patientId, email, emailHash });
  }
  console.log(`  ✅ 20 patients opt-in créés (lectures + heartbeats + réactions)`);

  // 6. 5 newsletters envoyées
  const tpl = await get("SELECT id FROM newsletter_templates WHERE is_active = 1 LIMIT 1");
  if (!tpl) throw new Error('Aucun template actif');

  for (let i = 0; i < 5; i++) {
    const sendId = randomId();
    const articleSlug = ARTICLE_SLUGS[i % ARTICLE_SLUGS.length];
    const subject = SUBJECTS[i];
    const sentAt = daysAgo(60 - i * 12);

    await run(`
      INSERT INTO newsletter_sends (id, cabinet_id, template_id, article_slug, subject, sent_at, status, total_recipients, practitioner_name, cabinet_name, custom_message, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, 'sent', ?, ?, ?, ?, ?, ?)
    `, [sendId, cabinetId, tpl.id, articleSlug, subject, sentAt, patients.length, PRACTITIONER_NAME, CABINET_NAME, `À l'attention de mes patients — sujet : ${subject}`, sentAt - 3600, practitionerId]);

    for (const p of patients) {
      const opened = Math.random() > 0.4;
      const clicked = opened && Math.random() > 0.7;
      const openedAt = opened ? sentAt + 3600 + Math.floor(Math.random() * 86400) : null;
      const clickedAt = clicked ? sentAt + 3600 + Math.floor(Math.random() * 86400 * 2) : null;

      await run(`
        INSERT INTO newsletter_recipients (id, send_id, cabinet_id, patient_email_hash, status, sent_at, opened_at, clicked_at, unsubscribed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `, [randomId(), sendId, cabinetId, p.emailHash, clicked ? 'clicked' : (opened ? 'opened' : 'sent'), sentAt, openedAt, clickedAt]);
    }
  }
  console.log(`  ✅ 5 newsletters envoyées (60 derniers jours)`);

  // 7. Audit
  await run(`
    INSERT INTO audit_logs (id, ts, actor_type, actor_id, cabinet_id, action, target_type, target_id, ip, user_agent, metadata)
    VALUES (?, unixepoch(), 'system', NULL, ?, 'seed_demo_francois', 'cabinet', ?, '127.0.0.1', 'script', ?)
  `, [randomId(), cabinetId, cabinetId, JSON.stringify({ source: 'seed-demo-francois-sqlite.mjs' })]);

  // 8. Cabinet library
  const articleRows = await all("SELECT slug FROM articles WHERE status = 'validated'");
  for (const a of articleRows) {
    const isPinned = ARTICLE_SLUGS.indexOf(a.slug) < 3 ? 1 : 0;
    const pinOrder = ARTICLE_SLUGS.indexOf(a.slug) < 3 ? ARTICLE_SLUGS.indexOf(a.slug) : 0;
    await run(`
      INSERT INTO cabinet_library_articles (id, cabinet_id, article_id, is_visible, is_pinned, pin_order, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?, unixepoch(), unixepoch())
    `, [randomId(), cabinetId, a.slug, isPinned, pinOrder]);
  }
  console.log(`  ✅ Bibliothèque cabinet configurée (${articleRows.length} articles, 3 épinglés)`);

  console.log(`\n  🎉 Démo François prête !`);
  console.log(`\n  👉 Ouvre http://localhost:3000/demo pour explorer`);
  console.log(`  👉 Ou clique sur "Voir la démo François" depuis la landing\n`);

  client.close();
}

main().catch((e) => {
  console.error('❌ Erreur seed :', e);
  process.exit(1);
});
