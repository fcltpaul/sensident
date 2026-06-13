/**
 * Sensident — Seed admin démo sur Neon
 *
 * Crée 1 admin superadmin : admin@sensident.fr (password 'demo1234', MFA désactivé)
 * Idempotent : efface l'existant avant d'insérer.
 */
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import postgres from 'postgres';
import fs from 'node:fs';

const env = fs.readFileSync('.env', 'utf-8');
const url = env.split('\n').find(l => l.startsWith('DATABASE_URL=')).split('=').slice(1).join('=');
const sql = postgres(url, { ssl: 'require', max: 1 });

const ADMIN_EMAIL = 'admin@sensident.fr';
const ADMIN_NAME = 'Admin Sensident (Démo)';
const PASSWORD = 'demo1234';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 10);

async function main() {
  console.log('🌱 Seed admin démo Neon\n');

  await sql`DELETE FROM admins WHERE email = ${ADMIN_EMAIL}`;

  const id = randomUUID();
  await sql`
    INSERT INTO admins (id, email, name, password_hash, totp_secret, totp_enabled, role, created_at)
    VALUES (${id}, ${ADMIN_EMAIL}, ${ADMIN_NAME}, ${PASSWORD_HASH}, NULL, false, 'superadmin', now())
  `;
  console.log(`  ✅ Admin créé : ${ADMIN_EMAIL}`);
  console.log(`     Password : ${PASSWORD}`);
  console.log(`     Role     : superadmin`);
  console.log(`     MFA      : désactivé (pour démo)`);

  await sql.end();
}

main().catch(async (e) => { console.error('❌', e.message); await sql.end(); process.exit(1); });
