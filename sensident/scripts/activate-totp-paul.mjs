// Active TOTP sur le compte Paul + genere le QR
import postgres from 'postgres';
import QRCode from 'qrcode';
import { authenticator } from 'otplib';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
for (const p of ['.env', '.env.local']) {
  const full = join(process.cwd(), p);
  if (existsSync(full)) {
    for (const line of readFileSync(full, 'utf-8').split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

const r = await sql`SELECT id, email, totp_enabled, totp_secret FROM practitioners WHERE email = 'fcltpaul@gmail.com' LIMIT 1`;
const paul = r[0];
if (!paul) { console.error('Paul introuvable'); process.exit(1); }

// Active TOTP (le secret est deja genere a l'inscription)
await sql`UPDATE practitioners SET totp_enabled = true WHERE id = ${paul.id}::text`;
console.log('TOTP active sur le compte Paul.');

// Genere l'URI otpauth et le QR
const uri = authenticator.keyuri(paul.email, 'Sensident', paul.totp_secret);
console.log('\n--- URI otpauth (a scanner dans Google Authenticator) ---');
console.log(uri);

const qrPath = join(process.cwd(), 'totp-paul-qr.png');
const qrDataUrl = await QRCode.toDataURL(uri, { width: 400 });
const base64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
writeFileSync(qrPath, Buffer.from(base64, 'base64'));
console.log(`\nQR code ecrit dans: ${qrPath}`);

// Test : verifie qu'un code genere est valide
const code = authenticator.generate(paul.totp_secret);
const valid = authenticator.verify({ token: code, secret: paul.totp_secret });
console.log(`\nTest du code actuel: ${code} -> ${valid ? 'VALIDE' : 'INVALIDE'}`);

console.log(`\n--- Infos pour Paul ---`);
console.log(`Email:    ${paul.email}`);
console.log(`Secret:   ${paul.totp_secret}`);
console.log(`Issuer:   Sensident`);
console.log(`Algorithm: SHA1, 6 digits, 30s`);

await sql.end();
