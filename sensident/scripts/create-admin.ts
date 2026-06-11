/**
 * Sensident — Bootstrap du premier admin
 *
 * Usage :
 *   npm run admin:create -- --email paul@sensident.fr --name "Paul Foucault" --role superadmin
 */
import { createClient } from '@libsql/client';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const get = (key: string) => {
  const i = args.findIndex((a) => a === `--${key}` || a.startsWith(`--${key}=`));
  if (i === -1) return null;
  if (args[i].includes('=')) return args[i].split('=')[1];
  return args[i + 1];
};

const email = get('email')?.toLowerCase().trim();
const name = get('name');
const role = (get('role') ?? 'editor') as 'superadmin' | 'editor' | 'reader';

if (!email || !name) {
  console.error('Usage: npm run admin:create -- --email <email> --name <name> --role <superadmin|editor|reader>');
  process.exit(1);
}

async function main() {
const dbFile = process.env.DATABASE_URL?.replace('file:', '') || path.join(process.cwd(), 'dev.db');
const client = createClient({ url: `file:${dbFile}` });

const existing = await client.execute({ sql: 'SELECT id FROM admins WHERE email = ?', args: [email as string] });
if (existing.rows.length > 0) {
  console.error(`Un admin existe déjà avec l'email ${email}.`);
  process.exit(1);
}

const password = crypto.randomBytes(18).toString('base64url').slice(0, 24);
const passwordHash = await bcrypt.hash(password, 12);
const totpSecret = authenticator.generateSecret();
const totpUri = authenticator.keyuri(email as string, 'Sensident Admin', totpSecret);
const id = crypto.randomUUID();

await client.execute({
  sql: `INSERT INTO admins (id, email, name, password_hash, totp_secret, totp_enabled, role) VALUES (?, ?, ?, ?, ?, 0, ?)`,
  args: [id, email, name, passwordHash, totpSecret, role],
});

const qrCode = await QRCode.toString(totpUri, { type: 'utf8' });

console.log('\n=== Admin créé ===');
console.log(`Email:    ${email}`);
console.log(`Nom:      ${name}`);
console.log(`Role:     ${role}`);
console.log(`Password: ${password}`);
console.log(`\nTOTP Secret (saisie manuelle dans Google Authenticator / Authy / 1Password):`);
console.log(`  ${totpSecret}`);
console.log('\n=== QR Code ===');
console.log(qrCode);
console.log('\nProchaine étape : connectez-vous sur /admin/login avec email + password,');
console.log('puis saisissez le code MFA pour activer le 2FA.');
}

main().catch((e) => { console.error(e); process.exit(1); });
