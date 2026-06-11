import { createClient } from '@libsql/client';
import path from 'path';

async function main() {
  const c = createClient({ url: 'file:' + path.join(process.cwd(), 'dev.db') });
  const articles = await c.execute('SELECT COUNT(*) as n FROM articles');
  console.log('Total articles:', articles.rows[0].n);
  const validated = await c.execute("SELECT COUNT(*) as n FROM articles WHERE status = 'validated'");
  console.log('Validated:', validated.rows[0].n);
  const cats = await c.execute('SELECT COUNT(*) as n FROM categories');
  console.log('Categories:', cats.rows[0].n);
  const links = await c.execute('SELECT COUNT(*) as n FROM article_categories');
  console.log('Article-category links:', links.rows[0].n);
  const rows = await c.execute("SELECT slug, title FROM articles ORDER BY slug");
  for (const r of rows.rows) {
    console.log('  -', (r as any).slug, ':', (r as any).title?.slice(0, 60));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
