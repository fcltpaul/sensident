/**
 * Sensident — Generateur de rendus HTML newsletter pour test mobile
 *
 * Genere 5 fichiers HTML (un par template) + 2 articles x 5 templates = 10 rendus.
 * Tu ouvres ces fichiers dans le browser de ton telephone pour voir ce que
 * le patient recevra dans sa boite mail.
 *
 * Usage : node scripts/render-newsletters.ts
 */
import { createClient } from '@libsql/client';
import { renderTemplate, generateSubject } from '../src/lib/email-templates';
import path from 'node:path';
import fs from 'node:fs';

const dbFile = process.env.DATABASE_URL?.replace('file:', '') || path.join(process.cwd(), 'dev.db');
const client = createClient({ url: `file:${dbFile}` });

const OUT_DIR = path.join(process.cwd(), 'newsletter-renders');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function main() {
  console.log(`Generation des rendus newsletter dans ${OUT_DIR}/\n`);

  // Recuperer tous les articles
  const articles = (await client.execute('SELECT * FROM articles')).rows as any[];
  const templates = (await client.execute('SELECT * FROM newsletter_templates WHERE is_active = 1')).rows as any[];

  if (articles.length === 0) {
    console.error('Aucun article en BDD. Lance d\'abord : npm run db:seed');
    process.exit(1);
  }

  let count = 0;
  for (const article of articles) {
    const slides = JSON.parse(article.slides_json);
    for (const tpl of templates) {
      const html = renderTemplate({
        templateCode: tpl.code,
        article: {
          slug: article.slug,
          title: article.title,
          excerpt: article.excerpt,
          bodyMd: article.body_md,
          slidesJson: slides,
        },
        cabinet: { name: 'Cabinet du Dr Dupont' },
        practitioner: { displayName: 'Dr Dupont' },
        customMessage: '',
        articleUrl: `https://sensident.fr/articles/${article.slug}?from=newsletter`,
        unsubscribeUrl: `https://sensident.fr/desabonnement?c=demo`,
      });

      const subject = generateSubject({
        templateCode: tpl.code,
        articleTitle: article.title,
        cabinetName: 'Cabinet du Dr Dupont',
      });

      // HTML standalone (avec <html><head><body>)
      const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;">
${html}
</body>
</html>`;

      const filename = `${article.slug}_${tpl.code}.html`;
      fs.writeFileSync(path.join(OUT_DIR, filename), fullHtml);
      count++;
      console.log(`  ${filename}`);
    }
  }

  // Index.html pour faciliter la navigation
  const indexHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sensident — Rendus newsletter (demo)</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; background: #f8fafc; }
  h1 { color: #0f172a; }
  .meta { color: #64748b; font-size: 14px; }
  .group { margin: 32px 0; }
  .group h2 { border-bottom: 2px solid #38bdf8; padding-bottom: 8px; }
  .file-list { display: grid; gap: 8px; }
  a { display: block; padding: 12px 16px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; text-decoration: none; color: #0f172a; }
  a:hover { border-color: #38bdf8; }
  .filename { font-family: monospace; font-size: 12px; color: #64748b; }
</style>
</head>
<body>
  <h1>📧 Sensident — Rendus newsletter</h1>
  <p class="meta">${articles.length} articles × ${templates.length} templates = ${count} rendus HTML</p>
  <p>Clique sur un rendu pour voir ce que le patient reçoit. Idéal pour tester sur mobile (responsive).</p>

  ${articles.map((a: any) => `
  <div class="group">
    <h2>${a.title}</h2>
    <div class="file-list">
      ${templates.map((t: any) => `
        <a href="${a.slug}_${t.code}.html" target="_blank">
          <strong>${t.name}</strong>
          <div class="filename">${a.slug}_${t.code}.html</div>
        </a>
      `).join('')}
    </div>
  </div>
  `).join('')}
</body>
</html>`;

  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), indexHtml);
  console.log(`\n  index.html`);
  console.log(`\n✅ ${count} rendus + index.html generes.`);
  console.log(`\nPour tester :`);
  console.log(`  - Ouvre ${OUT_DIR}\\index.html dans un browser`);
  console.log(`  - Ou transfere le dossier sur ton tel et ouvre les .html directement`);
  console.log(`  - Pour le serveur, lance un simple : cd ${OUT_DIR} ; python -m http.server 8080`);
}

main().catch((e) => { console.error(e); process.exit(1); });
