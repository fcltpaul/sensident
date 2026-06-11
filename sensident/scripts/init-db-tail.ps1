  for (const stmt of schema.split(';').map((s) => s.trim()).filter((s) => s.length > 0)) {
    await client.execute(stmt);
  }

  console.log('Insertion des templates newsletter (5 looks P2)...');

  const templates = [
    { id: 'tpl-moderne', name: 'Moderne', subject: '{{cabinet_name}} · {{article_title}}', bodyMarkdown: '# {{article_title}}\n\n{{article_excerpt}}\n\n[Lire l\'article]({{article_url}})' },
    { id: 'tpl-chaleureux', name: 'Chaleureux', subject: 'Votre conseil prévention du mois : {{article_title}}', bodyMarkdown: 'Bonjour,\n\n{{article_excerpt}}\n\n[Lire la suite]({{article_url}})' },
    { id: 'tpl-classique', name: 'Classique', subject: '{{article_title}} — Prévention par {{cabinet_name}}', bodyMarkdown: '{{article_excerpt}}\n\n[Lire l\'article complet]({{article_url}})' },
    { id: 'tpl-epure', name: 'Épuré', subject: '{{article_title}}', bodyMarkdown: '{{article_excerpt}}\n\n→ {{article_url}}' },
    { id: 'tpl-premium', name: 'Premium', subject: '{{cabinet_name}} — {{article_title}}', bodyMarkdown: '{{article_excerpt}}\n\n[Lire l\'article]({{article_url}})' },
  ];

  for (const t of templates) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO newsletter_templates (id, name, subject, body_markdown) VALUES (?, ?, ?, ?)`,
      args: [t.id, t.name, t.subject, t.bodyMarkdown],
    });
  }

  console.log(`✅ Base initialisée : ${dbFile}`);
  console.log(`✅ ${templates.length} templates insérés.`);
  console.log('\nProchaines étapes :');
  console.log('  npm run admin:create -- --email paul@sensident.fr --name "Paul Foucault" --role superadmin');
  console.log('  npm run dev');
  console.log('  -> http://localhost:3000/admin/login');
}

main().catch((e) => { console.error(e); process.exit(1); });
