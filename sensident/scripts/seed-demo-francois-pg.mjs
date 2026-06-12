/**
 * Sensident — Seed démo Dr François Thibault sur PostgreSQL (Neon)
 *
 * Idempotent : efface les anciennes données du cabinet demo avant d'insérer.
 * Crée :
 *   - Cabinet "Cabinet du Dr François Thibault" (slug: demo-francois-thibault)
 *   - Praticien owner (MFA désactivé pour démo, login simple)
 *   - Subscription Pro ambassadeur
 *   - 20 patients opt-in
 *   - 5 newsletters envoyées (60 derniers jours)
 *   - reading_sessions + article_heartbeats (engagement)
 *   - audit_logs cohérents
 *
 * Usage :
 *   DATABASE_URL=postgresql://... node scripts/seed-demo-francois-pg.mjs
 *
 * Prérequis : avoir lancé `npx tsx scripts/init-pg.ts` ET seedé les articles
 * (`node scripts/seed-articles-pg.mjs`) au préalable.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Lecture .env (DATABASE_URL)
function loadEnv() {
  const envPath = resolve(projectRoot, '.env');
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
      }
    }
  } catch {
    /* .env absent, on s'appuie sur process.env */
  }
}
loadEnv();

const url = process.env.DATABASE_URL;
if (!url || !url.startsWith('postgres')) {
  console.error('❌ DATABASE_URL doit commencer par postgres://');
  process.exit(1);
}

const sql = postgres(url, { ssl: 'require', max: 1, connect_timeout: 10 });

// ============================================
// CONSTANTES DÉMO
// ============================================
const SLUG = 'demo-francois-thibault';
const CABINET_NAME = 'Cabinet du Dr François Thibault';
const PRACTITIONER_EMAIL = 'demo@sensident.fr';
const PRACTITIONER_NAME = 'Dr François Thibault';
const SALT = 'demo-salt-v1';  // pour hashEmail reproductible

// Articles à utiliser pour les newsletters (doivent être seedés au préalable)
const ARTICLE_SLUGS = [
  'brossage-efficace', 'fil-brosse-interdentaire', 'bain-de-bouche', 'abcdaire-enfant',
  'sucre-invisible', 'gingivite-alerte', 'carie-tout-savoir', 'brossage-adulte-technique',
  'alimentation-acide', 'soins-prevention-reguliers',
];

const FIRST_NAMES = ['Marie', 'Jean', 'Sophie', 'Pierre', 'Camille', 'Lucas', 'Emma', 'Hugo', 'Léa', 'Nathan', 'Chloé', 'Maxime', 'Julie', 'Antoine', 'Sarah', 'Thomas', 'Laura', 'Nicolas', 'Marine', 'Alexandre'];
const LAST_NAMES = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier'];

const SUBJECTS = [
  'Les 5 gestes pour un brossage efficace',
  'Halte au sucre invisible',
  'Vos gencives vous parlent',
  'La carie : tout ce qu\'il faut savoir',
  'Vos visites chez le dentiste : votre meilleur investissement',
];

function hashEmail(email) {
  return createHash('sha256').update(email + SALT).digest('hex');
}

async function main() {
  console.log(`\n  🌟 Sensident — Seed démo PostgreSQL (François Thibault)\n`);
  console.log(`  Base : ${url.replace(/:[^:@]+@/, ':***@').slice(0, 80)}…\n`);

  // 0. Vérification prérequis
  const articlesCount = await sql`SELECT COUNT(*) as c FROM articles WHERE status = 'validated'`;
  if (Number(articlesCount[0].c) === 0) {
    console.error('❌ Aucun article validé en BDD. Lance d\'abord :');
    console.error('   node scripts/seed-articles-pg.mjs');
    await sql.end();
    process.exit(1);
  }
  const tplCount = await sql`SELECT COUNT(*) as c FROM newsletter_templates`;
  if (Number(tplCount[0].c) === 0) {
    console.error('❌ Aucun template newsletter en BDD.');
    await sql.end();
    process.exit(1);
  }
  console.log(`  ✅ ${articlesCount[0].c} articles, ${tplCount[0].c} templates détectés`);

  // 1. Nettoyage du cabinet démo existant (idempotent)
  console.log('\n  [Nettoyage ancien cabinet démo]');
  const old = await sql`SELECT id FROM cabinets WHERE slug = ${SLUG}`;
  if (old.length > 0) {
    const oldId = old[0].id;
    // Cascade s'occupe des tables liées (FK ON DELETE CASCADE)
    await sql`DELETE FROM cabinets WHERE id = ${oldId}`;
    console.log(`  ✅ Ancien cabinet ${oldId} supprimé (cascade)`);
  } else {
    console.log('  Aucun cabinet à nettoyer');
  }

  // 2. Cabinet
  const cabinetId = randomUUID();
  await sql`
    INSERT INTO cabinets (
      id, slug, name, rpps,
      contact_address, contact_phone, contact_email, contact_rdv_url,
      contact_opening_hours, contact_facade_photo_url, contact_oncd_mention, contact_map_url,
      newsletter_branding
    ) VALUES (
      ${cabinetId}, ${SLUG}, ${CABINET_NAME}, ${'10001234567'},
      ${'12 rue de la Prévention, 75001 Paris'},
      ${'+33 1 23 45 67 89'},
      ${'demo@sensident.fr'},
      ${'https://dr-thibault.fr/rdv'},
      ${sql.json({ 'Lun-Ven': '9h-19h', 'Sam': '9h-13h' })},
      ${null}, ${true},
      ${'https://maps.google.com/?q=12+rue+de+la+Prevention+Paris'},
      ${sql.json({ showLogo: true, primaryColor: '#0d9488', accentColor: '#14b8a6' })}
    )
  `;
  console.log('  ✅ Cabinet créé');

  // 3. Subscription Pro ambassadeur
  await sql`
    INSERT INTO cabinet_subscriptions (id, cabinet_id, plan, status, is_ambassador)
    VALUES (${randomUUID()}, ${cabinetId}, 'pro', 'active', true)
  `;
  console.log('  ✅ Subscription Pro (ambassadeur) créée');

  // 4. Practitioner (MFA désactivé pour démo)
  // Hash factice : login réel désactivé en démo, François regarde sans se connecter
  // (l'app lui montre la session active injectée via cookie de seed)
  const passwordHash = '$2b$10$ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01';
  const practitionerId = randomUUID();
  await sql`
    INSERT INTO practitioners (id, cabinet_id, email, name, password_hash, totp_enabled, email_verified_at, role, last_login_at)
    VALUES (${practitionerId}, ${cabinetId}, ${PRACTITIONER_EMAIL}, ${PRACTITIONER_NAME}, ${passwordHash}, false, NOW(), 'owner', NOW())
  `;
  console.log('  ✅ Practitioner créé');

  // 5. Session active (cookie de démo - bypass login)
  const sessionToken = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(sessionToken).digest('hex');
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  await sql`
    INSERT INTO practitioner_sessions (id, practitioner_id, cabinet_id, token_hash, mfa_verified, expires_at)
    VALUES (${sessionId}, ${practitionerId}, ${cabinetId}, ${tokenHash}, true, ${expiresAt})
  `;
  console.log('  ✅ Session active créée (cookie pré-authentifié)');

  // 6. 20 patients opt-in
  console.log('\n  [Patients opt-in]');
  const patientHashes = [];
  for (let i = 0; i < 20; i++) {
    const firstName = FIRST_NAMES[i];
    const lastName = LAST_NAMES[i];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}-${i}@example.com`;
    const emailHash = hashEmail(email);
    patientHashes.push(emailHash);
    const confirmedAt = new Date(Date.now() - Math.floor(Math.random() * 60 * 24 * 3600 * 1000));
    await sql`
      INSERT INTO patient_consents (
        id, cabinet_id, email_hash, email_encrypted, opt_in_version,
        cgu_accepted, newsletter_optin, consent_newsletter, consent_version,
        consent_timestamp, confirmed_at
      ) VALUES (
        ${randomUUID()}, ${cabinetId}, ${emailHash},
        ${Buffer.from(email).toString('base64')}, '1.0',
        true, true, true, '1.0',
        ${confirmedAt}, ${confirmedAt}
      )
    `;
    console.log(`  ✅ ${firstName} ${lastName}`);
  }

  // 7. 5 newsletters envoyées
  console.log('\n  [Newsletters envoyées]');
  const templates = await sql`SELECT id, code, name FROM newsletter_templates ORDER BY code`;
  const sends = [];
  for (let n = 0; n < 5; n++) {
    const sentAt = new Date(Date.now() - (n * 7 + 3) * 24 * 3600 * 1000);
    const articleSlug = ARTICLE_SLUGS[(n * 2) % ARTICLE_SLUGS.length];
    const template = templates[n % templates.length];
    const sendId = randomUUID();
    const total = 20;
    const opened = 12 + n;
    const clicked = 6 + n;
    const subject = SUBJECTS[n];
    await sql`
      INSERT INTO newsletter_sends (
        id, cabinet_id, template_id, article_slug, subject, custom_message,
        status, total_recipients, sent_at, practitioner_name, cabinet_name, created_by
      ) VALUES (
        ${sendId}, ${cabinetId}, ${template.id}, ${articleSlug}, ${subject}, '',
        'sent', ${total}, ${sentAt}, ${PRACTITIONER_NAME}, ${CABINET_NAME}, ${practitionerId}
      )
    `;
    for (let p = 0; p < total; p++) {
      const isOpen = p < opened;
      const isClick = p < clicked;
      const openedAt = isOpen ? new Date(sentAt.getTime() + 3600 * 1000) : null;
      const clickedAt = isClick ? new Date(sentAt.getTime() + 7200 * 1000) : null;
      await sql`
        INSERT INTO newsletter_recipients (
          id, send_id, cabinet_id, patient_email_hash, status,
          sent_at, opened_at, clicked_at
        ) VALUES (
          ${randomUUID()}, ${sendId}, ${cabinetId}, ${patientHashes[p]}, 'sent',
          ${sentAt}, ${openedAt}, ${clickedAt}
        )
      `;
    }
    sends.push({ id: sendId, sentAt, articleSlug, opened, clicked, total });
    console.log(`  ✅ #${n + 1} : ${subject} (${opened}/${total} ouvertures, ${clicked}/${total} clics)`);
  }

  // 8. Reading sessions + heartbeats
  console.log('\n  [Engagement]');
  let sessionCount = 0, heartbeatCount = 0;
  for (const send of sends) {
    const sessionCountForSend = Math.floor(send.opened / 2);
    for (let p = 0; p < sessionCountForSend; p++) {
      const sessId = randomUUID();
      const startTs = new Date(send.sentAt.getTime() + (1800 + Math.floor(Math.random() * 7200)) * 1000);
      const duration = 30 + Math.floor(Math.random() * 240);
      const maxScroll = 0.4 + Math.random() * 0.6;
      const maxSlide = 1 + Math.floor(Math.random() * 5);
      const completed = maxScroll > 0.8;
      const viewport = ['375x667', '414x896', '1920x1080'][Math.floor(Math.random() * 3)];
      const endTs = new Date(startTs.getTime() + duration * 1000);
      await sql`
        INSERT INTO reading_sessions (
          id, cabinet_id, patient_email_hash, article_slug, source, newsletter_send_id,
          started_at, ended_at, duration_seconds, max_scroll_pct, max_slide_reached,
          completed, client_user_agent, client_viewport
        ) VALUES (
          ${sessId}, ${cabinetId}, ${patientHashes[p % 20]}, ${send.articleSlug},
          'newsletter', ${send.id}, ${startTs}, ${endTs},
          ${duration}, ${Math.floor(maxScroll * 100)}, ${maxSlide},
          ${completed}, ${'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)'}, ${viewport}
        )
      `;
      sessionCount++;
      // 3-5 heartbeats par session
      const hbCount = 3 + Math.floor(Math.random() * 3);
      for (let h = 0; h < hbCount; h++) {
        await sql`
          INSERT INTO article_heartbeats (
            id, reading_session_id, cabinet_id, ts, scroll_pct, tab_visible, slide_index
          ) VALUES (
            ${randomUUID()}, ${sessId}, ${cabinetId},
            ${new Date(startTs.getTime() + h * 30 * 1000)},
            ${Math.min(Math.floor(maxScroll * 100), (h + 1) * 25)},
            ${h > 0}, ${h % 5}
          )
        `;
        heartbeatCount++;
      }
    }
  }
  console.log(`  ✅ ${sessionCount} reading_sessions, ${heartbeatCount} heartbeats`);

  // 9. Audit logs
  console.log('\n  [Audit logs]');
  for (const send of sends) {
    await sql`
      INSERT INTO audit_logs (ts, actor_type, actor_id, cabinet_id, action, target_type, target_id, ip, user_agent, metadata)
      VALUES (NOW(), 'system', 'cron', ${cabinetId}, 'newsletter_sent', 'newsletter_send', ${send.id}, ${'127.0.0.1'}::inet, 'cron/1.0',
              ${sql.json({ total: send.total, opened: send.opened, clicked: send.clicked })})
    `;
  }
  await sql`
    INSERT INTO audit_logs (ts, actor_type, actor_id, cabinet_id, action, target_type, target_id, ip, user_agent, metadata)
    VALUES (NOW(), 'practitioner', ${practitionerId}, ${cabinetId}, 'login_success', 'session', ${sessionId}, ${'127.0.0.1'}::inet,
            'Mozilla/5.0', ${sql.json({ method: 'password' })})
  `;
  console.log(`  ✅ ${sends.length + 1} audit logs`);

  // Résumé
  console.log(`\n  ${'='.repeat(60)}`);
  console.log(`  Cabinet démo créé avec succès sur PostgreSQL !`);
  console.log(`  ${'='.repeat(60)}\n`);
  console.log(`  Cabinet ID    : ${cabinetId}`);
  console.log(`  Slug          : ${SLUG}`);
  console.log(`  Practitioner  : ${PRACTITIONER_EMAIL}`);
  console.log(`  Session token : ${sessionToken}`);
  console.log(`  Cookie        : sensident_session=${sessionToken}`);
  console.log(`\n  Stats seedées :`);
  console.log(`    - 20 patients opt-in`);
  console.log(`    - 5 newsletters envoyées (60 derniers jours)`);
  console.log(`    - ${sessionCount} lectures d'articles`);
  console.log(`    - ${heartbeatCount} heartbeats (scroll depth)`);
  console.log(`    - ${sends.length + 1} audit logs\n`);
  console.log(`  URLs à tester :`);
  console.log(`    http://localhost:3000/`);
  console.log(`    http://localhost:3000/c/${SLUG}/rejoindre`);
  console.log(`    http://localhost:3000/c/${SLUG}/bienvenue`);
  console.log(`    http://localhost:3000/articles/${ARTICLE_SLUGS[0]}`);
  console.log(`    http://localhost:3000/dashboard  (avec cookie ci-dessus)\n`);

  await sql.end();
}

main().catch(async (e) => {
  console.error('FATAL:', e);
  try { await sql.end(); } catch {}
  process.exit(1);
});
