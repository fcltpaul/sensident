/**
 * Patch Neon schema pour matcher ce que le code applicatif utilise réellement.
 *
 * Le code applicatif tape sur schema.sqlite.ts (re-export depuis schema.ts).
 * schema.pg.ts est une reference differente, non utilisee par le code applicatif.
 * On patch Neon pour aligner avec schema.sqlite.ts.
 */
import postgres from 'postgres';

const url = process.env.DATABASE_URL!;
const sql = postgres(url, { max: 1, connect_timeout: 10 });

const PATCHES = [
  // practitioners : schema.sqlite.ts a 'name' et 'last_login_at', role enum large
  `ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ`,
  `ALTER TABLE practitioners DROP CONSTRAINT IF EXISTS practitioners_role_check`,
  `ALTER TABLE practitioners ADD CONSTRAINT practitioners_role_check CHECK (role IN ('owner', 'associate', 'assistant'))`,

  // admins : idem
  `ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ`,
  // role enum check pour admins (deja conforme)

  // articles : schema.sqlite.ts a 'id' (UUID), 'body_markdown', 'excerpt', 'status' enum
  // init-neon.ts a cree avec le meme modele
  // Pas de patch

  // newsletter_templates : pas de cabinet_id dans sqlite
  // init-neon.ts a cree avec cabinet_id, pas grave pour MVP

  // patient_consents : OK
  // patient_magic_links : OK
  // newsletter_sends : schema.sqlite.ts a 'subject', 'sent_at', 'recipient_count', 'template_id' (FK), 'article_slug'
  // init-neon.ts a cree la meme chose

  // cabinet_subscriptions : schema.sqlite.ts a 'plan', 'status' (actif/trialing), 'stripe_customer_id', 'stripe_subscription_id', 'current_period_end', pas de start
  // init-neon.ts : 'plan', 'status' (active/past_due/canceled/trialing), 'current_period_end'
  // pas grave pour MVP, on patchera au moment de la prod

  // admin_sessions : OK
  // practitioner_sessions : OK

  // 5 templates deja inseres
];

async function main() {
  console.log('Patch Neon schema (alignement schema.sqlite.ts)...');
  for (const stmt of PATCHES) {
    try {
      await sql.unsafe(stmt);
      console.log('  ✅', stmt.slice(0, 60));
    } catch (e: any) {
      console.log('  ⚠️', stmt.slice(0, 60), '->', e.message);
    }
  }
  await sql.end();
  console.log('\n✅ Patch terminé.');
}

main().catch((e) => { console.error(e); process.exit(1); });
