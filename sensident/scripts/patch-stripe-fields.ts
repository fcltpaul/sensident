/**
 * Sensident — Patch stripe fields (alignement schema PG/SQLite)
 *
 * Ajoute les colonnes manquantes du webhook Stripe sur les deux dialectes :
 * - current_period_start
 * - cancel_at_period_end
 * - is_ambassador
 *
 * Et aligne le status enum pour ajouter 'incomplete' (manquant en SQLite).
 */
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url || !url.startsWith('postgres')) {
  console.log('DATABASE_URL non PG, skip (le schema.pg.ts couvre la cible prod).');
  console.log('Note: la migration PG doit etre lancee en prod via ce script.');
  process.exit(0);
}

const sql = postgres(url, { max: 1, connect_timeout: 10 });

const PATCHES_PG = [
  // cabinet_subscriptions : deja OK si init-neon.ts a tout cree
  // Mais on securise avec IF NOT EXISTS au cas ou
  `ALTER TABLE cabinet_subscriptions ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ`,
  // current_period_end existe deja
  `ALTER TABLE cabinet_subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE cabinet_subscriptions ADD COLUMN IF NOT EXISTS is_ambassador BOOLEAN NOT NULL DEFAULT FALSE`,
  // status enum : etendre pour ajouter 'incomplete' (pas obligatoire, on peut le garder en string)
  // On relache le CHECK pour accepter 'incomplete' sans casser les anciens status
  `ALTER TABLE cabinet_subscriptions DROP CONSTRAINT IF EXISTS cabinet_subscriptions_status_check`,
  `ALTER TABLE cabinet_subscriptions ADD CONSTRAINT cabinet_subscriptions_status_check CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete', 'trialing'))`,
];

const PATCHES_SQLITE = [
  // Note: schema.sqlite.ts sera mis a jour a la main (cf. editeur de schema)
  // Pour le dev, le script init-db.ts doit aussi inclure ces colonnes
];

async function main() {
  console.log('Patch stripe fields sur Neon...');
  for (const stmt of PATCHES_PG) {
    try {
      await sql.unsafe(stmt);
      console.log('  OK:', stmt.slice(0, 60));
    } catch (e: any) {
      console.log('  WARN:', stmt.slice(0, 60), '->', e.message);
    }
  }

  // Verif
  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'cabinet_subscriptions'
    ORDER BY ordinal_position
  `;
  console.log('\nSchema cabinet_subscriptions :');
  for (const c of cols) console.log('  ', c.column_name, c.data_type, c.is_nullable);

  await sql.end();
  console.log('\nPatch termine.');
}

main().catch((e) => { console.error(e); process.exit(1); });
