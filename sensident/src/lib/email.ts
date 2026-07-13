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
import { Resend } from 'resend';
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
      // Cast id en uuid (colonne uuid en Neon) et cabinet_id en text (colonne text
      // malgré son nom, voir dette schema). postgres-js tagged template requiert
      // cast explicite côté PG quand le type ne peut pas être inféré.
      await rawSqlClient`
        INSERT INTO email_logs (id, kind, to_hash, subject, success, error, provider, provider_message_id, cabinet_id, metadata)
        VALUES (
          ${crypto.randomUUID()}::uuid,
          ${params.kind},
          ${toHash},
          ${params.subject},
          ${params.success},
          ${params.error ?? null},
          ${params.provider},
          ${params.providerMessageId ?? null},
          ${params.cabinetId ? params.cabinetId : null},
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

  // Production: provider selection
  // Priorite : RESEND_API_KEY > BREVO_SMTP_* > erreur
  //
  // Resend (free tier 3000/mois) est preferable a Brevo cote Vercel Hobby :
  //   - Pas de whitelist IP (vs Brevo qui exige d'approuver chaque IP Vercel)
  //   - Pas besoin de plan Vercel Pro (Static IPs)
  //   - Setup en 5 min
  // Brevo reste en fallback si on veut y revenir plus tard (compte
  // deja valide, DPA signe).

  // 1) Resend (HTTP API, pas de whitelist IP)
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      // 2026-07-07 18h25 (Tartrinator) : domaine sensident.fr verifie sur Resend
      // (DKIM + SPF + MX + DMARC OK). Le hack 'fcltpaul@gmail.com' est retire.
      //
      // EMAIL_FROM doit etre defini cote Vercel (Production env var) avec une
      // valeur du type 'Sensident <noreply@sensident.fr>'. Resend refusera
      // sinon l'envoi a des destinataires != owner (sauf en dev avec
      // onboarding@resend.dev).
      //
      // Defaut dev : 'onboarding@resend.dev' (Resend autorise uniquement
      // l'envoi au owner du compte en mode test depuis ce domaine).
      const defaultFrom =
        process.env.EMAIL_FROM ||
        (process.env.NODE_ENV === 'production'
          ? 'Sensident <noreply@sensident.fr>'
          : 'Sensident <onboarding@resend.dev>');
      const { data, error } = await resend.emails.send({
        from: defaultFrom,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      if (error) {
        throw new Error(error.message || JSON.stringify(error));
      }
      await logEmailAttempt({
        kind,
        to: params.to,
        subject: params.subject,
        success: true,
        provider: 'resend',
        providerMessageId: data?.id,
        cabinetId: params.cabinetId,
        metadata: params.metadata,
      });
      return { success: true, messageId: data?.id };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[email] resend send failed -- to=${params.to} subject="${params.subject}":`, errMsg);
      await logEmailAttempt({
        kind,
        to: params.to,
        subject: params.subject,
        success: false,
        error: errMsg,
        provider: 'resend',
        cabinetId: params.cabinetId,
        metadata: params.metadata,
      });
      return { success: false, error: errMsg };
    }
  }

  // 2) Brevo SMTP (fallback - necessite whitelist IP Vercel)
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASS) {
    const errorMsg = 'Aucun provider email configure. Set RESEND_API_KEY (recommande) ou BREVO_SMTP_USER + BREVO_SMTP_PASS (avec whitelist IP).';
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
  articleSlug,
}: {
  to: string;
  cabinet: Cabinet;
  confirmToken?: string;
  // 2026-07-13 (Tartrinator) : si le mail est declenche suite a l'envoi d'un
  // article/newsletter precis, on passe son slug pour que la route /api/patient/confirm
  // redirige le patient directement sur l'article apres confirmation (= UX Paul).
  // Si null/undefined : comportement legacy = redirect vers /bienvenue.
  articleSlug?: string;
}) {
  // Generer le token de confirmation (double opt-in)
  const token = confirmToken ?? generateConfirmToken(to, cabinet.id);
  // Sanity-check : meme regex cote envoi que cote route confirm (defense in depth).
  const safeSlug =
    articleSlug && /^[a-z0-9][a-z0-9-]{0,100}$/.test(articleSlug) ? articleSlug : null;
  const confirmUrl =
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/patient/confirm?token=${token}` +
    (safeSlug ? `&redirect=${encodeURIComponent(safeSlug)}` : '');

  const subject = `Confirmez votre inscription au service de prevention de ${cabinet.name}`;
  // Charte alignee sur template 'moderne' (email-templates.ts) : bleu nuit + accent sky.
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #0f172a; color: #f1f5f9; padding: 32px 24px;">
        <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin: 0 0 4px 0;">
          Service de prevention offert par
        </p>
        <h1 style="font-size: 22px; color: #38bdf8; margin: 0 0 24px 0; font-weight: 700;">${cabinet.name}</h1>

        <p style="font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">Bonjour,</p>

        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
          Vous avez demande a recevoir les informations de prevention en hygiene
          bucco-dentaire proposees par <strong>${cabinet.name}</strong>.
        </p>

        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 28px 0;">
          Pour confirmer votre inscription et acceder a votre espace personnel, cliquez sur le bouton ci-dessous :
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${confirmUrl}"
             style="background: #38bdf8; color: #0f172a; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 15px;">
            Confirmer mon inscription
          </a>
        </div>

        <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin: 24px 0; font-size: 13px; color: #cbd5e1;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #f1f5f9;">Vous pouvez a tout moment :</p>
          <ul style="margin: 0; padding-left: 20px; line-height: 1.7;">
            <li>Retirer votre consentement a recevoir ces emails</li>
            <li>Demander l'export de vos donnees (RGPD)</li>
            <li>Demander la suppression de votre compte</li>
          </ul>
        </div>

        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 24px 0 0 0;">
          Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br>
          <a href="${confirmUrl}" style="color: #38bdf8; word-break: break-all;">${confirmUrl}</a>
        </p>
        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
          Ce lien expire dans 24 heures. Si vous n'etes pas a l'origine de cette demande, ignorez simplement cet email.
        </p>

        <hr style="border: none; border-top: 1px solid #334155; margin: 32px 0 16px 0;">
        <p style="font-size: 11px; color: #64748b; line-height: 1.5; margin: 0;">
          Service offert par ${cabinet.name}<br>
          Heberge en France &middot; Conformite RGPD &middot; Aucune publicite, aucun partage tiers
        </p>
      </div>
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
