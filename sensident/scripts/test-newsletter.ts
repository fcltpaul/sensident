/**
 * Test complet newsletter send (signup → invite → optin → send)
 * Lance avec : npx tsx scripts/test-newsletter.ts
 * Nécessite le serveur dev sur http://localhost:3001
 */
import { createClient } from '@libsql/client';
import path from 'path';
import crypto from 'crypto';

const BASE = process.env.TEST_URL || 'http://localhost:3001';
const DB_FILE = path.join(process.cwd(), 'dev.db');
const db = createClient({ url: `file:${DB_FILE}` });

function hashEmail(email: string, cabinetId: string): string {
  const salt = 'dev-only-cabinet-salt-replace-in-prod';
  return crypto.createHash('sha256').update(email + cabinetId + salt).digest('hex');
}

async function call(method: string, url: string, body?: any, cookie?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  const res = await fetch(BASE + url, { method, headers, body: body ? JSON.stringify(body) : undefined });

  let json: any = null;
  try { json = await res.json(); } catch {}
  const setCookie = res.headers.getSetCookie?.()?.[0] || res.headers.get('set-cookie') || '';
  const newCookie = setCookie ? setCookie.split(';')[0] : cookie || '';
  return { status: res.status, json, cookie: newCookie || cookie };
}

function parseSetCookie(res: any): string {
  const raw = res.headers.getSetCookie?.()?.[0] || '';
  if (!raw) return '';
  return raw.split(';')[0];
}

async function main() {
  console.log('=== Test newsletter send ===\n');

  // 1. Signup practitioner
  const email = `dr-newsletter-${Date.now()}@test.fr`;
  const slug = `dr-newsletter-${Date.now()}`;
  const s1 = await call('POST', '/api/practitioner/signup', {
    email, password: 'TestPassword123', cabinetName: 'Cabinet Newsletter Test', slug,
  });
  if (s1.status !== 200) { console.error('SIGNUP FAIL:', s1.json); process.exit(1); }
  console.log('1. Signup:', s1.status, '(TOTP QR code OK)');
  const cookie1 = s1.cookie;
  const totpSecret = s1.json.totpSecret;

  // 2. Verify MFA
  const { authenticator } = await import('otplib');
  authenticator.options = { window: 1 };
  const totpCode = authenticator.generate(totpSecret);
  const s2 = await call('POST', '/api/practitioner/verify-mfa', { totpCode }, cookie1);
  if (s2.status !== 200) { console.error('MFA FAIL:', s2.json); process.exit(1); }
  console.log('2. MFA verify:', s2.status);
  const cookie2 = s2.cookie;

  // 3. Login
  const s3 = await call('POST', '/api/practitioner/login', { email, password: 'TestPassword123' });
  if (s3.status !== 200) { console.error('LOGIN FAIL:', s3.json); process.exit(1); }
  console.log('3. Login:', s3.status);
  const cookie3 = s3.cookie;

  // 4. MFA post-login
  const totpCode2 = authenticator.generate(totpSecret);
  const s4 = await call('POST', '/api/practitioner/verify-mfa', { totpCode: totpCode2 }, cookie3);
  if (s4.status !== 200) { console.error('MFA2 FAIL:', s4.json); process.exit(1); }
  console.log('4. MFA post-login:', s4.status);
  const cookie4 = s4.cookie;

  // 5. Récupérer cabinet ID
  const cabRow = (await db.execute({ sql: "SELECT id, slug FROM cabinets WHERE slug = ?", args: [slug] })).rows[0];
  if (!cabRow) { console.error('Cabinet not found'); process.exit(1); }
  const cabinetId = (cabRow as any).id;
  console.log('5. Cabinet ID:', cabinetId);

  // 6. Create invite token
  const s6 = await call('POST', '/api/cabinet/invite-tokens', { maxUses: 100, durationDays: 30 }, cookie4);
  if (s6.status !== 200) { console.error('INVITE FAIL:', s6.json); process.exit(1); }
  console.log('6. Invite token:', s6.status, s6.json.url?.slice(0, 60));

  // 7. Patient optin
  const patientEmail = `patient-${Date.now()}@test.fr`;
  const s7 = await call('POST', '/api/patient/optin', {
    cabinetId, email: patientEmail, cguAccepted: true, newsletterOptin: true,
  });
  if (s7.status !== 200 && s7.status !== 409) { console.error('OPTIN FAIL:', s7.json); process.exit(1); }
  console.log('7. Patient optin:', s7.status, s7.json.message?.slice(0, 50));

  // 8. Vérifier email_encrypted en BDD
  const emailHash = hashEmail(patientEmail, cabinetId);
  const consentRow = (await db.execute({
    sql: "SELECT email_encrypted, confirmed_at FROM patient_consents WHERE email_hash = ?",
    args: [emailHash]
  })).rows[0];
  if (!consentRow) { console.error('Consent not found'); process.exit(1); }
  const encryptedEmail = (consentRow as any).email_encrypted;
  const decodedEmail = encryptedEmail ? Buffer.from(encryptedEmail, 'base64').toString('utf-8') : null;
  console.log('8. Email encrypted:', encryptedEmail?.slice(0, 20) + '...');
  console.log('   Decoded email:', decodedEmail);
  if (decodedEmail !== patientEmail) { console.error('EMAIL MISMATCH'); process.exit(1); }
  console.log('   ✅ Email encode/decode OK');

  // 9. Forcer confirmed_at (simule le clic email)
  await db.execute({ sql: "UPDATE patient_consents SET confirmed_at = unixepoch() WHERE email_hash = ?", args: [emailHash] });
  console.log('9. Patient confirmed (simule clic email)');

  // 10. Envoyer newsletter
  const articleSlug = 'brossage-dents-technique-bass';
  const templateId = 'tpl-moderne';  // ID from init-db template

  // Need the actual template ID from DB (it's a hex UUID, not 'tpl-moderne')
  // Just query the template id directly
  const tmplRow = (await db.execute({ sql: "SELECT id FROM newsletter_templates WHERE code = 'moderne' LIMIT 1" })).rows[0];
  const realTemplateId = (tmplRow as any).id;
  console.log('10. Template ID:', realTemplateId);

  const s10 = await call('POST', '/api/newsletter/send', {
    cabinetId,
    practitionerId: email,
    articleSlug,
    templateId: realTemplateId,
    subject: `Test prevention : ${articleSlug}`,
    customMessage: 'Message personnalise du Dr Dupont',
    scheduledAt: null,
  }, cookie4);
  if (s10.status !== 200) { console.error('SEND FAIL:', s10.json); process.exit(1); }
  console.log('   Send result:', s10.json.message);

  // 11. Vérifier send en BDD
  const sendRows = (await db.execute({
    sql: "SELECT status, total_recipients FROM newsletter_sends WHERE cabinet_id = ? ORDER BY created_at DESC LIMIT 1",
    args: [cabinetId]
  })).rows[0];
  if (sendRows) {
    console.log('11. Newsletter send status:', (sendRows as any).status, (sendRows as any).total_recipients, 'destinataires');
  }

  // 12. Vérifier recipients
  const recRows = (await db.execute({
    sql: "SELECT status FROM newsletter_recipients WHERE cabinet_id = ?",
    args: [cabinetId]
  })).rows;
  console.log('12. Recipients:', recRows.length, 'status:', (recRows[0] as any)?.status);

  console.log('\n✅ TEST REUSSI — Le send newsletter est fonctionnel !');
  process.exit(0);
}

main().catch(e => { console.error('TEST FAIL:', e); process.exit(1); });
