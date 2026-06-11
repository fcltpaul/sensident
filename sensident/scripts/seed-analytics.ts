/**
 * Sensident — Seed données analytics pour la démo
 *
 * Crée des lectures factices, des envois newsletter et des ouvertures
 * pour remplir le dashboard analytics/engagement avec des données réalistes.
 *
 * Usage : npx tsx scripts/seed-analytics.ts
 * À exécuter APRÈS seed-full.ts (qui crée les articles/catégories).
 */
import { createClient } from '@libsql/client';
import crypto from 'node:crypto';
import path from 'node:path';

const dbFile = process.env.DATABASE_URL?.replace('file:', '') || path.join(process.cwd(), 'dev.db');
const db = createClient({ url: `file:${dbFile}` });

// Date de base : on génère des données sur les 45 derniers jours
const NOW = Date.now();
const DAY_MS = 86400000;

// Un cabinet existant pour lier les données
async function getFirstCabinet() {
  const rows = (await db.execute('SELECT id, name, slug FROM cabinets LIMIT 1'));
  if (rows.rows.length === 0) {
    throw new Error('Aucun cabinet en BDD. Exécute d\'abord init-db.ts et seed-full.ts.');
  }
  return rows.rows[0] as any;
}

// Articles validés
async function getValidatedArticles() {
  const rows = await db.execute("SELECT slug, title FROM articles WHERE status = 'validated'");
  return rows.rows as any[];
}

// Patients factices
const FAKE_PATIENTS = Array.from({ length: 24 }, (_, i) => ({
  email: `patient-demo-${i + 1}@exemple.fr`,
  hash: crypto.createHash('sha256').update(`patient-demo-${i + 1}@exemple.fr`).digest('hex').slice(0, 32),
}));

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(n: number): number {
  return Math.floor((NOW - n * DAY_MS) / 1000);
}

async function main() {
  console.log('=== Seed analytics demo data ===\n');

  const cabinet = await getFirstCabinet();
  const articles = await getValidatedArticles();
  if (articles.length === 0) throw new Error('Aucun article validé. Exécute seed-full.ts d\'abord.');

  console.log('Cabinet:', cabinet.name, `(${cabinet.id.slice(0, 8)}...)`);
  console.log('Articles validés:', articles.length);

  // 1. Insérer les patients factices (optin + confirmés)
  console.log('\n1. Patients factices (optin + confirmés)...');
  for (const p of FAKE_PATIENTS) {
    const existing = await db.execute({
      sql: 'SELECT id FROM patient_consents WHERE email_hash = ? AND cabinet_id = ?',
      args: [p.hash, cabinet.id],
    });
    if (existing.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO patient_consents (id, cabinet_id, email_hash, email_encrypted, opt_in_version, cgu_accepted, newsletter_optin, confirmed_at)
              VALUES (?, ?, ?, ?, ?, 1, 1, ?)`,
        args: [
          crypto.randomBytes(16).toString('hex'),
          cabinet.id,
          p.hash,
          Buffer.from(p.email).toString('base64'),
          'v1.0-2026-06-08',
          daysAgo(randomInt(10, 45)),
        ],
      });
    }
  }
  console.log(`  ${FAKE_PATIENTS.length} patients opt-in confirmés.`);

  // 2. Sessions de lecture sur les 30 derniers jours
  console.log('\n2. Sessions de lecture...');
  let sessionCount = 0;
  for (const p of FAKE_PATIENTS) {
    // Chaque patient a entre 1 et 6 lectures
    const nLectures = randomInt(1, 6);
    for (let i = 0; i < nLectures; i++) {
      const article = randomPick(articles);
      const startedAt = daysAgo(randomInt(0, 30));
      const duration = randomInt(30, 300); // 30s à 5 min
      const completed = Math.random() > 0.3; // 70% complétés
      const maxScroll = completed ? randomInt(85, 100) : randomInt(20, 80);
      const maxSlide = completed ? 5 : randomInt(2, 4);

      // Source : 60% newsletter, 30% direct, 10% site
      const sourceRoll = Math.random();
      const source = sourceRoll < 0.6 ? 'newsletter' : sourceRoll < 0.9 ? 'direct' : 'site';

      const sessionId = crypto.randomBytes(16).toString('hex');
      await db.execute({
        sql: `INSERT INTO reading_sessions (id, cabinet_id, patient_email_hash, article_slug, source, started_at, ended_at, duration_seconds, max_scroll_pct, max_slide_reached, completed)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          sessionId, cabinet.id, p.hash, article.slug,
          source, startedAt, startedAt + duration, duration,
          maxScroll, maxSlide, completed ? 1 : 0,
        ],
      });

      // Ajouter quelques heartbeats pour les sessions de >60s
      if (duration > 60) {
        const nBeats = randomInt(1, Math.min(5, Math.floor(duration / 15)));
        for (let b = 0; b < nBeats; b++) {
          const beatTs = startedAt + b * Math.floor(duration / nBeats);
          const scrollPct = Math.min(100, Math.round((b + 1) / nBeats * maxScroll));
          await db.execute({
            sql: `INSERT INTO article_heartbeats (id, reading_session_id, cabinet_id, ts, scroll_pct, tab_visible, slide_index)
                  VALUES (?, ?, ?, ?, ?, 1, ?)`,
            args: [
              crypto.randomBytes(16).toString('hex'),
              sessionId, cabinet.id, beatTs,
              scrollPct,
              source === 'slides' ? randomInt(1, maxSlide) : null,
            ],
          });
        }
      }

      sessionCount++;
    }
  }
  console.log(`  ${sessionCount} sessions de lecture.`);

  // 3. Newsletter sends du mois
  console.log('\n3. Newsletter sends...');
  const templates = (await db.execute("SELECT id, code FROM newsletter_templates LIMIT 1")).rows;
  const templateId = templates.length > 0 ? (templates[0] as any).id : '';
  const article = articles[0];

  const nSends = 3;
  for (let i = 0; i < nSends; i++) {
    const sendId = crypto.randomBytes(16).toString('hex');
    const sentAt = daysAgo(i * 10 + 2); // espacé de ~10 jours
    const recipientsCount = FAKE_PATIENTS.length;

    await db.execute({
      sql: `INSERT INTO newsletter_sends (id, cabinet_id, template_id, article_slug, subject, sent_at, status, total_recipients, practitioner_name, cabinet_name, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'sent', ?, 'Dr Dupont', ?, ?)`,
      args: [
        sendId, cabinet.id, templateId, article.slug,
        `Prévention : ${article.title}`,
        sentAt, recipientsCount, cabinet.name, sentAt,
      ],
    });

    // Recipients + traquer les ouvertures
    let openedCount = 0;
    let clickedCount = 0;
    for (const p of FAKE_PATIENTS) {
      const isOpened = Math.random() > 0.4; // 60% d'ouverture
      const isClicked = isOpened && Math.random() > 0.5; // 50% des ouverts cliquent

      const status = isClicked ? 'clicked' : isOpened ? 'opened' : 'sent';
      let openedAt = isOpened ? sentAt + randomInt(3600, 86400) : null;
      let clickedAt = isClicked ? (openedAt ?? sentAt) + randomInt(60, 3600) : null;
      if (isOpened) openedCount++;
      if (isClicked) clickedCount++;

      await db.execute({
        sql: `INSERT INTO newsletter_recipients (id, send_id, cabinet_id, patient_email_hash, status, sent_at, opened_at, clicked_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          crypto.randomBytes(16).toString('hex'),
          sendId, cabinet.id, p.hash,
          status, sentAt, openedAt, clickedAt,
        ],
      });
    }

    console.log(`  Envoi #${i + 1}: ${recipientsCount} destinataires, ${openedCount} ouverts, ${clickedCount} cliqués`);
  }

  // 4. Vérification
  console.log('\n4. Vérification...');
  const readingCount = (await db.execute("SELECT COUNT(*) as n FROM reading_sessions WHERE cabinet_id = ?", { args: [cabinet.id] })).rows[0] as any;
  const patientCount = (await db.execute("SELECT COUNT(*) as n FROM patient_consents WHERE cabinet_id = ? AND confirmed_at IS NOT NULL", { args: [cabinet.id] })).rows[0] as any;
  const sendCount = (await db.execute("SELECT COUNT(*) as n FROM newsletter_sends WHERE cabinet_id = ?", { args: [cabinet.id] })).rows[0] as any;
  const recipientCount = (await db.execute("SELECT COUNT(*) as n FROM newsletter_recipients WHERE cabinet_id = ?", { args: [cabinet.id] })).rows[0] as any;

  console.log(`  Patients opt-in confirmés : ${patientCount.n}`);
  console.log(`  Sessions de lecture        : ${readingCount.n}`);
  console.log(`  Sends newsletter           : ${sendCount.n}`);
  console.log(`  Recipients                 : ${recipientCount.n}`);

  console.log('\n✅ Done. Les dashboard analytics et engagement affichent maintenant des données.');
  console.log('   Connecte-toi sur http://localhost:3001/dashboard');
}

main().catch(e => { console.error(e); process.exit(1); });
