/**
 * Sensident — Email (Brevo en prod, JSON en dev)
 *
 * En dev (NODE_ENV=development), on logge juste le JSON dans la console.
 * En prod, on appelle l'API Brevo via SMTP.
 *
 * Toute tentative d'envoi est tracee dans la table `email_logs` pour
 * diagnostic (succes, erreur, provider, etc.).
 */
import nodemailer from 'nodemailer';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import type { Cabinet } from '@/db/schema';

const isDev = process.env.NODE_ENV === 'development';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  kind?: string;
  cabinetId?: string;
  metadata?: Record<string, unknown>;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;
}

/**
 * Enregistre une tentative d'envoi dans la table `email_logs`.
 * En cas d'echec du log lui-meme (ex: table absente en SQLite), on swallow
 * pour ne pas casser l'envoi.
 */
async function logEmailAttempt(params: {
  kind: string;
  to: string;
  subject: string;
  success: boolean;
  error?: string;
  provider: string;
  providerMessageId?: string;
  cabinetId?: string;
  metadata?: Record<string, unknown>;
}) {
  const toHash = crypto
    .createHash('sha256')
    .update(params.to.toLowerCase().trim())
    .digest('hex');

  if (DB_DIALECT === 'postgresql') {
    try {
      await rawSqlClient`
        INSERT INTO email_logs (id, kind, to_hash, subject, success, error, provider, provider_message_id, cabinet_id, metadata)
        VALUES (
          ${crypto.randomUUID()}::text,
          ${params.kind},
          ${toHash},
          ${params.subject},
          ${params.success},
          ${params.error ?? null},
          ${params.provider},
          ${params.providerMessageId ?? null},
          ${params.cabinetId ? params.cabinetId : null}::text,
          ${params.metadata ? JSON.stringify(params.metadata) : null}::text
        )
      `;
    } catch (e) {
      console.error('[email-log] insert failed:', e);
    }
  } else {
    // En dev SQLite, on logge en console au lieu de creer la table.
    if (process.env.DEBUG_EMAIL) {
      console.log('[email-log]', JSON.stringify({
        kind: params.kind,
        toHash,
        subject: params.subject,
        success: params.success,
        error: params.error,
        provider: params.provider,
        cabinetId: params.cabinetId,
        ts: new Date().toISOString(),
      }, null, 2));
    }
  }
}

export async function sendEmail(params: EmailParams): Promise<SendResult> {
  const kind = params.kind ?? 'generic';

  if (isDev) {
    if (process.env.DEBUG_EMAIL) {
      console.log('\n========== EMAIL (DEV JSON) ==========');
      console.log('To:', params.to);
      console.log('Subject:', params.subject);
      console.log('--- HTML ---');
      console.log(params.html);
      if (params.text) {
        console.log('--- TEXT ---');
        console.log(params.text);
      }
      console.log('======================================\n');
    }
    await logEmailAttempt({
      kind,
      to: params.to,
      subject: params.subject,
      success: true,
      provider: 'dev',
      providerMessageId: `dev-${Date.now()}`,
      cabinetId: params.cabinetId,
      metadata: params.metadata,
    });
    return { success: true, messageId: `dev-${Date.now()}` };
  }

  // Production: Brevo SMTP
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASS) {
    const errorMsg = 'BREVO_SMTP_USER / BREVO_SMTP_PASS non definis (Vercel env vars manquantes)';
    console.error(`[email] ${errorMsg} -- to=${params.to} subject="${params.subject}"`);
    await logEmailAttempt({
      kind,
      to: params.to,
      subject: params.subject,
      success: false,
      error: errorMsg,
      provider: 'none',
      cabinetId: params.cabinetId,
      metadata: params.metadata,
    });
    return { success: false, error: errorMsg, skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Sensident <noreply@sensident.fr>',
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    await logEmailAttempt({
      kind,
      to: params.to,
      subject: params.subject,
      success: true,
      provider: 'brevo',
      providerMessageId: info.messageId,
      cabinetId: params.cabinetId,
      metadata: params.metadata,
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[email] sendMail failed -- to=${params.to} subject="${params.subject}":`, errMsg);
    await logEmailAttempt({
      kind,
      to: params.to,
      subject: params.subject,
      success: false,
      error: errMsg,
      provider: 'brevo',
      cabinetId: params.cabinetId,
      metadata: params.metadata,
    });
    return { success: false, error: errMsg };
  }
}

// ============================================
// Email templates specifiques
// ============================================

export async function sendConfirmationEmail({
  to,
  cabinet,
  confirmToken,
}: {
  to: string;
  cabinet: Cabinet;
  confirmToken?: string;
}) {
  // Generer le token de confirmation (double opt-in)
  const token = confirmToken ?? generateConfirmToken(to, cabinet.id);
  const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/patient/confirm?token=${token}`;

  const subject = `Confirmez votre inscription au service de prevention de ${cabinet.name}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1e293b; font-size: 20px;">${cabinet.name}</h1>
      <p>Bonjour,</p>
      <p>Vous avez demande a recevoir les informations de prevention en hygiene bucco-dentaire proposees par <strong>${cabinet.name}</strong>.</p>
      <p>Pour confirmer votre inscription et acceder a votre espace personnel, cliquez sur le bouton ci-dessous :</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${confirmUrl}" style="background: #1e293b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Confirmer mon inscription
        </a>
      </p>
      <p style="font-size: 12px; color: #64748b;">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br>
        <a href="${confirmUrl}">${confirmUrl}</a></p>
      <p style="font-size: 12px; color: #64748b;">Ce lien expire dans 24 heures. Si vous n'etes pas a l'origine de cette demande, ignorez simplement cet email.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      <p style="font-size: 11px; color: #94a3b8;">
        Service offert par ${cabinet.name} · Heberge en France · Conformite RGPD/HDS
      </p>
    </body>
    </html>
  `;
  const text = `
${cabinet.name} - Prevention bucco-dentaire

Bonjour,

Vous avez demande a recevoir les informations de prevention en hygiene bucco-dentaire proposees par ${cabinet.name}.

Pour confirmer votre inscription et acceder a votre espace personnel, cliquez sur ce lien :
${confirmUrl}

Ce lien expire dans 24 heures.

Si vous n'etes pas a l'origine de cette demande, ignorez cet email.

---
Service offert par ${cabinet.name}
  `.trim();

  return sendEmail({ to, subject, html, text, kind: 'patient_optin_confirm', cabinetId: cabinet.id });
}

export function generateConfirmToken(email: string, cabinetId: string): string {
  const payload = JSON.stringify({ email, cabinetId, ts: Date.now() });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const sig = crypto
    .createHmac('sha256', process.env.AUTH_SECRET || 'dev-secret')
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}
