/**
 * Seed des newsletter_recipients (3 sends) pour le dashboard analytics
 * Exécuter APRÈS seed-analytics.ts (qui a déjà créé patients + sessions)
 */
import { createClient } from '@libsql/client';
import crypto from 'node:crypto';
import path from 'node:path';

const dbFile = process.env.DATABASE_URL?.replace('file:', '') || path.join(process.cwd(), 'dev.db');
const db = createClient({ url: `file:${dbFile}` });

const NOW = Date.now();
const DAY_MS = 86400000;

function daysAgo(n: number) { return Math.floor((NOW - n * DAY_MS) / 1000); }
function randomInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function main() {
  console.log('=== Seed newsletter recipients ===\n');

  const cab = (await db.execute('SELECT id, name FROM cabinets LIMIT 1')).rows[0] as any;
  if (!cab) { console.error('Aucun cabinet'); process.exit(1); }
  console.log('Cabinet:', cab.name);

  const tmpl = (await db.execute("SELECT id FROM newsletter_templates LIMIT 1")).rows[0] as any;
  const article = (await db.execute("SELECT slug, title FROM articles WHERE status = 'validated' LIMIT 1")).rows[0] as any;
  if (!article) { console.error('Aucun article valide'); process.exit(1); }

  // Patients confirmés
  const patients = (await db.execute({
    sql: 'SELECT email_hash FROM patient_consents WHERE cabinet_id = ? AND confirmed_at IS NOT NULL',
    args: [cab.id],
  })).rows as any[];

  if (patients.length === 0) { console.error('Aucun patient'); process.exit(1); }
  console.log('Patients confirmes:', patients.length);

  // 3 sends
  for (let s = 0; s < 3; s++) {
    const sendId = crypto.randomBytes(16).toString('hex');
    const sentAt = daysAgo(s * 10 + 2);

    await db.execute({
      sql: 'INSERT INTO newsletter_sends (id, cabinet_id, template_id, article_slug, subject, sent_at, status, total_recipients, practitioner_name, cabinet_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [sendId, cab.id, tmpl?.id ?? '', article.slug, `Prevention : ${article.title}`, sentAt, 'sent', patients.length, 'Dr Dupont', cab.name, sentAt],
    });

    let opened = 0, clicked = 0;
    for (const p of patients) {
      const isOpened = Math.random() > 0.4;
      const isClicked = isOpened && Math.random() > 0.5;
      opened += isOpened ? 1 : 0;
      clicked += isClicked ? 1 : 0;

      await db.execute({
        sql: 'INSERT INTO newsletter_recipients (id, send_id, cabinet_id, patient_email_hash, status, sent_at, opened_at, clicked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          crypto.randomBytes(16).toString('hex'),
          sendId, cab.id, p.email_hash,
          isClicked ? 'clicked' : isOpened ? 'opened' : 'sent',
          sentAt,
          isOpened ? sentAt + randomInt(3600, 86400) : null,
          isClicked ? sentAt + randomInt(3600, 86400 * 2) : null,
        ],
      });
    }
    console.log(`  Send ${s + 1}: ${patients.length} dest, ${opened} ouverts, ${clicked} cliques`);
  }

  console.log('\n✅ Newsletter recipients seeded.');
}

main().catch(e => { console.error(e); process.exit(1); });
