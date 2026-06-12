/**
 * Sensident — Seed démo pour François
 *
 * Crée un cabinet "Dr François Thibault" avec :
 * - 1 praticien owner (MFA désactivé pour démo, login simple)
 * - 20 patients opt-in
 * - 5 newsletters envoyées sur les 60 derniers jours
 * - reading_sessions + article_heartbeats (engagement)
 * - audit_logs cohérents
 *
 * Usage : DATABASE_URL=file:./dev.db node scripts/seed-demo-data.mjs
 */

import { createClient } from '@libsql/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const dbFile = process.env.DATABASE_URL?.replace('file:', '') || 'dev.db';
const fullPath = path.isAbsolute(dbFile) ? dbFile : path.resolve(projectRoot, dbFile);
const db = createClient({ url: `file:${fullPath}` });

const cabinetId = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
const practitionerId = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
const sessionId = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
const sessionToken = randomBytes(32).toString('base64url');
const tokenHash = createHash('sha256').update(sessionToken).digest('hex');
const slug = 'demo-francois-thibault';

const ARTICLES = [
  'brossage-efficace', 'fil-brosse-interdentaire', 'bain-de-bouche', 'abcdaire-enfant',
  'sucre-invisible', 'gingivite-alerte', 'carie-tout-savoir', 'brossage-adulte-technique',
  'alimentation-acide', 'soins-prevention-reguliers',
];

const FIRST_NAMES = ['Marie', 'Jean', 'Sophie', 'Pierre', 'Camille', 'Lucas', 'Emma', 'Hugo', 'Léa', 'Nathan', 'Chloé', 'Maxime', 'Julie', 'Antoine', 'Sarah', 'Thomas', 'Laura', 'Nicolas', 'Marine', 'Alexandre'];
const LAST_NAMES = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier'];

function hashEmail(email) {
  return createHash('sha256').update(email + 'demo-salt-v1').digest('hex');
}

async function main() {
  console.log(`\n  \ud83c\udf1f Sensident — Seed démo François Thibault\n`);
  console.log(`  Base : ${fullPath}\n`);

  // 1. Cabinet
  await db.execute({
    sql: `INSERT INTO cabinets (id, slug, name, contact_email, contact_address, contact_phone, contact_rdv_url, contact_opening_hours, contact_oncd_mention, contact_map_url, newsletter_branding) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    args: [
      cabinetId, slug, 'Cabinet du Dr François Thibault',
      'demo@sensident.fr', '12 rue de la Prévention, 75001 Paris',
      '+33 1 23 45 67 89', 'https://dr-thibault.fr/rdv',
      'Lun-Ven 9h-19h, Sam 9h-13h',
      'https://maps.google.com/?q=12+rue+de+la+Pr%C3%A9vention+Paris',
      JSON.stringify({ showLogo: true, primaryColor: '#0d9488', accentColor: '#14b8a6' }),
    ],
  });
  console.log('  \u2705 Cabinet créé');

  // 2. Subscription Pro (ambassadeur)
  await db.execute({
    sql: `INSERT INTO cabinet_subscriptions (id, cabinet_id, plan, status, is_ambassador) VALUES (?, ?, 'pro', 'active', 1)`,
    args: [randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32), cabinetId],
  });
  console.log('  \u2705 Subscription Pro (ambassadeur) créée');

  // 3. Practitioner (MFA désactivé pour démo)
  const passwordHash = '$2b$10$ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01';
  await db.execute({
    sql: `INSERT INTO practitioners (id, cabinet_id, email, name, password_hash, totp_enabled, email_verified_at, role) VALUES (?, ?, ?, ?, ?, 0, unixepoch(), 'owner')`,
    args: [practitionerId, cabinetId, 'demo@sensident.fr', 'Dr François Thibault', passwordHash],
  });
  console.log('  \u2705 Practitioner créé');

  // 4. Session active (cookie)
  const expiresAt = Math.floor((Date.now() + 30 * 24 * 3600 * 1000) / 1000);
  await db.execute({
    sql: `INSERT INTO practitioner_sessions (id, practitioner_id, cabinet_id, token_hash, mfa_verified, expires_at) VALUES (?, ?, ?, ?, 1, ?)`,
    args: [sessionId, practitionerId, cabinetId, tokenHash, expiresAt],
  });
  console.log('  \u2705 Session active créée');

  // 5. 20 patients opt-in
  console.log('\n  [Patients opt-in]');
  const patientHashes = [];
  for (let i = 0; i < 20; i++) {
    const firstName = FIRST_NAMES[i];
    const lastName = LAST_NAMES[i];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}-${i}@example.com`;
    const emailHash = hashEmail(email);
    patientHashes.push(emailHash);
    const id = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
    await db.execute({
      sql: `INSERT INTO patient_consents (id, cabinet_id, email_hash, email_encrypted, opt_in_version, cgu_accepted, newsletter_optin, consent_newsletter, consent_version, consent_timestamp, confirmed_at) VALUES (?, ?, ?, ?, '1.0', 1, 1, 1, '1.0', unixepoch(), unixepoch() - ${Math.floor(Math.random() * 60 * 24 * 3600)})`,
      args: [id, cabinetId, emailHash, Buffer.from(email).toString('base64')],
    });
    console.log(`  \u2705 ${firstName} ${lastName}`);
  }

  // 6. 5 newsletters envoyées
  console.log('\n  [Newsletters envoyées]');
  const now = Math.floor(Date.now() / 1000);
  const templates = await db.execute('SELECT id, code, name FROM newsletter_templates ORDER BY code');
  if (templates.rows.length === 0) {
    console.error('  \u274C Templates absents. Lance d\'abord: node scripts/seed-articles-sqlite.mjs');
    process.exit(1);
  }
  const subjectForIdx = (i) => [
    'Les 5 gestes pour un brossage efficace',
    'Halte au sucre invisible',
    'Vos gencives vous parlent',
    'La carie : tout ce qu\'il faut savoir',
    'Vos visites chez le dentiste : votre meilleur investissement',
  ][i];
  const sends = [];
  for (let n = 0; n < 5; n++) {
    const sentAt = now - (n * 7 + 3) * 24 * 3600;
    const articleSlug = ARTICLES[(n * 2) % ARTICLES.length];
    const template = templates.rows[n % templates.rows.length];
    const id = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
    const total = 20;
    const opened = 12 + n;
    const clicked = 6 + n;
    await db.execute({
      sql: `INSERT INTO newsletter_sends (id, cabinet_id, template_id, article_slug, subject, custom_message, status, total_recipients, sent_at, practitioner_name, cabinet_name, created_by) VALUES (?, ?, ?, ?, ?, '', 'sent', ?, ?, 'Dr François Thibault', 'Cabinet du Dr François Thibault', ?)`,
      args: [id, cabinetId, template.id, articleSlug, subjectForIdx(n), total, sentAt, practitionerId],
    });
    for (let p = 0; p < total; p++) {
      const rid = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
      const isOpen = p < opened;
      const isClick = p < clicked;
      await db.execute({
        sql: `INSERT INTO newsletter_recipients (id, send_id, cabinet_id, patient_email_hash, status, sent_at, opened_at, clicked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [rid, id, cabinetId, patientHashes[p], 'sent', sentAt, isOpen ? sentAt + 3600 : null, isClick ? sentAt + 7200 : null],
      });
    }
    sends.push({ id, sentAt, articleSlug, opened, clicked, total });
    console.log(`  \u2705 #${n + 1} : ${subjectForIdx(n)} (${opened}/${total} ouvertures, ${clicked}/${total} clics)`);
  }

  // 7. Reading sessions + heartbeats
  console.log('\n  [Engagement]');
  let sessionCount = 0, heartbeatCount = 0;
  for (const send of sends) {
    for (let p = 0; p < (send.opened / 2 | 0); p++) {
      const sessionUuid = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
      const startTs = send.sentAt + 1800 + Math.floor(Math.random() * 7200);
      const duration = 30 + Math.floor(Math.random() * 240);
      const maxScroll = 0.4 + Math.random() * 0.6;
      const maxSlide = 1 + Math.floor(Math.random() * 5);
      const completed = maxScroll > 0.8 ? 1 : 0;
      const viewport = ['375x667', '414x896', '1920x1080'][Math.floor(Math.random() * 3)];
      await db.execute({
        sql: `INSERT INTO reading_sessions (id, cabinet_id, patient_email_hash, article_slug, source, newsletter_send_id, started_at, ended_at, duration_seconds, max_scroll_pct, max_slide_reached, completed, client_user_agent, client_viewport) VALUES (?, ?, ?, ?, 'newsletter', ?, ?, ?, ?, ?, ?, ?, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', ?)`,
        args: [sessionUuid, cabinetId, patientHashes[p % 20], send.articleSlug, send.id, startTs, startTs + duration, duration, maxScroll * 100, maxSlide, completed, viewport],
      });
      sessionCount++;
      // Heartbeats: 3-5 par session
      for (let h = 0; h < 3 + Math.floor(Math.random() * 3); h++) {
        const hUuid = randomUUID().replace(/-/g, '').padEnd(32, '0').slice(0, 32);
        await db.execute({
          sql: `INSERT INTO article_heartbeats (id, reading_session_id, cabinet_id, ts, scroll_pct, tab_visible, slide_index) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [hUuid, sessionUuid, cabinetId, startTs + h * 30, Math.min(maxScroll * 100, (h + 1) * 25), h > 0 ? 1 : 0, h % 5],
        });
        heartbeatCount++;
      }
    }
  }
  console.log(`  \u2705 ${sessionCount} reading_sessions`);
  console.log(`  \u2705 ${heartbeatCount} heartbeats`);

  // 8. Audit logs
  console.log('\n  [Audit logs]');
  for (const send of sends) {
    await db.execute({
      sql: `INSERT INTO audit_logs (ts, actor_type, actor_id, cabinet_id, action, target_type, target_id, ip, user_agent, metadata) VALUES (unixepoch(), 'system', 'cron', ?, 'newsletter_sent', 'newsletter_send', ?, '127.0.0.1', 'cron/1.0', ?)`,
      args: [cabinetId, send.id, JSON.stringify({ total: send.total, opened: send.opened, clicked: send.clicked })],
    });
  }
  await db.execute({
    sql: `INSERT INTO audit_logs (ts, actor_type, actor_id, cabinet_id, action, target_type, target_id, ip, user_agent, metadata) VALUES (unixepoch(), 'practitioner', ?, ?, 'login_success', 'session', ?, '127.0.0.1', 'Mozilla/5.0', ?)`,
    args: [practitionerId, cabinetId, sessionId, JSON.stringify({ method: 'password' })],
  });
  console.log(`  \u2705 ${sends.length + 1} audit logs`);

  // Résumé
  console.log(`\n  ${'='.repeat(60)}`);
  console.log(`  Cabinet démo créé avec succès !`);
  console.log(`  ${'='.repeat(60)}\n`);
  console.log(`  Cabinet ID    : ${cabinetId}`);
  console.log(`  Slug          : ${slug}`);
  console.log(`  Practitioner  : demo@sensident.fr`);
  console.log(`  Session token : ${sessionToken}`);
  console.log(`  Cookie        : sensident_session=${sessionToken}`);
  console.log(`\n  Stats seedees :`);
  console.log(`    - 20 patients opt-in`);
  console.log(`    - 5 newsletters envoyees (60 derniers jours)`);
  console.log(`    - ${sessionCount} lectures d'articles`);
  console.log(`    - ${heartbeatCount} heartbeats (scroll depth)`);
  console.log(`    - ${sends.length + 1} audit logs\n`);
  console.log(`  Pour tester : http://localhost:3001/dashboard\n`);

  await db.close();
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
