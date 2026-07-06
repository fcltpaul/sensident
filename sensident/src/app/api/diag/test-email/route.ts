/**
 * Endpoint de diagnostic : envoie un mail test et log tout dans email_logs.
 *
 * Usage (prod) :
 *   GET /api/diag/test-email?to=paul.fclt+diag@gmail.com
 *
 * - Appelle sendEmail() du code prod (meme chemin que /api/patient/optin)
 * - Affiche success/error/messageId
 * - Log visible ensuite dans Neon email_logs
 *
 * Pas d'auth : endpoint de diag, accessible publiquement. A retirer ou
 * proteger par un secret avant commercialisation.
 */
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get('to') || 'paul.fclt+diag@gmail.com';

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const result = await sendEmail({
    to,
    subject: 'Sensident — Mail test diagnostic',
    html: `
      <h1>Mail test Sensident</h1>
      <p>Si tu lis ceci, l'envoi Brevo fonctionne depuis l'infra Vercel.</p>
      <p>Envoye a : <strong>${to}</strong></p>
      <p>IP Vercel egress : <code>${ip}</code></p>
      <p>Timestamp : ${new Date().toISOString()}</p>
    `,
    text: `Mail test Sensident\nEnvoye a: ${to}\nIP Vercel: ${ip}\nTs: ${new Date().toISOString()}`,
    kind: 'diag_test',
    metadata: { source: '/api/diag/test-email', ip },
  });

  return NextResponse.json({
    input: { to, ip },
    env: {
      hasBrevoUser: !!process.env.BREVO_SMTP_USER,
      hasBrevoPass: !!process.env.BREVO_SMTP_PASS,
      emailFrom: process.env.EMAIL_FROM || null,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
      nodeEnv: process.env.NODE_ENV || null,
    },
    result,
  });
}