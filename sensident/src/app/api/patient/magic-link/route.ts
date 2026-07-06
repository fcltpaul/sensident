import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { db } from '@/db/client';
import { patientConsents, cabinets, patientMagicLinks, auditLogs } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { sendEmail } from '@/lib/email';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const Schema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  cabinetSlug: z.string(),
});

const CABINET_HASH_SALT = process.env.CABINET_HASH_SALT || 'dev-only-salt-replace-in-prod';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit('magic_link', ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: true, message: 'Si votre email est enregistre, vous recevrez un lien.' },
      { status: 200 }
    );
  }

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Email invalide.' }, { status: 400 });

  const cab = (await db.select().from(cabinets).where(eq(cabinets.slug, parsed.data.cabinetSlug)).limit(1))[0];
  if (!cab) return NextResponse.json({ error: 'Cabinet introuvable.' }, { status: 404 });

  const emailHash = crypto.createHash('sha256').update(parsed.data.email + cab.id + CABINET_HASH_SALT).digest('hex');

  // Verifier que le patient est bien inscrit + confirme
  const consent = (await db
    .select()
    .from(patientConsents)
    .where(
      and(
        eq(patientConsents.cabinetId, cab.id),
        eq(patientConsents.emailHash, emailHash),
        sql`${patientConsents.confirmedAt} IS NOT NULL`
      )
    )
    .limit(1))[0];

  // On renvoie toujours OK (anti-enumeration)
  if (!consent) {
    return NextResponse.json({ success: true, message: 'Si votre email est enregistre, vous recevrez un lien.' });
  }

  // Generer le magic link
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.insert(patientMagicLinks).values({
    cabinetId: cab.id,
    emailHash,
    tokenHash,
    expiresAt,
    ip: (req.headers.get('x-forwarded-for') || req.ip) as any,
  });

  // Audit
  await db.insert(auditLogs).values({
    actorType: 'patient',
    cabinetId: cab.id,
    action: 'magic_link_sent',
    targetType: 'patient_consent',
    targetId: consent.id,
  });

  // Envoyer l'email avec le lien
  const magicUrl = `${APP_URL}/api/patient/magic-link/verify?token=${token}&c=${cab.slug}`;
  await sendEmail({
    to: parsed.data.email,
    subject: `Accedez a votre espace prevention ${cab.name}`,
    kind: 'patient_magic_link',
    cabinetId: cab.id,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e293b;">${cab.name}</h2>
        <p>Cliquez sur le bouton ci-dessous pour acceder a votre espace personnel (lien valable 24h) :</p>
        <p style="margin: 24px 0;">
          <a href="${magicUrl}" style="background: #1e293b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Acceder a mon espace
          </a>
        </p>
        <p style="font-size: 12px; color: #64748b;">Si vous n'etes pas a l'origine de cette demande, ignorez cet email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="font-size: 11px; color: #94a3b8;">Service offert par ${cab.name} · Heberge en France</p>
      </div>
    `,
  });

  return NextResponse.json({ success: true, message: 'Lien envoye par email.' });
}
