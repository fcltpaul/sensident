import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { cabinets, practitioners, cabinetSubscriptions, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, passwordMeetsPolicy, generateTotpSecret, getTotpUri, generateQrCodeDataUrl, createSession, setSessionCookie } from '@/lib/auth';

const SignupSchema = z.object({
  email: z.string().email().max(255).transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1).max(128),
  cabinetName: z.string().min(1).max(100).transform((s) => s.trim()),
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9-]+$/)
    .transform((s) => s.toLowerCase().trim()),
});

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Donnees invalides.', details: parsed.error.format() }, { status: 400 });
  }

  const { email, password, cabinetName, slug } = parsed.data;

  // Politique password
  const policy = passwordMeetsPolicy(password);
  if (!policy.ok) {
    return NextResponse.json({ error: policy.reason }, { status: 400 });
  }

  // Verifier unicite email et slug
  const existingEmail = await db.select({ id: practitioners.id }).from(practitioners).where(eq(practitioners.email, email)).limit(1);
  if (existingEmail.length > 0) {
    return NextResponse.json({ error: 'Un compte existe deja avec cet email.' }, { status: 409 });
  }

  const existingSlug = await db.select({ id: cabinets.id }).from(cabinets).where(eq(cabinets.slug, slug)).limit(1);
  if (existingSlug.length > 0) {
    return NextResponse.json({ error: 'Cet identifiant public est deja pris. Choisissez-en un autre.' }, { status: 409 });
  }

  // Creer cabinet
  const [cabinet] = await db
    .insert(cabinets)
    .values({ name: cabinetName, slug })
    .returning();

  // Creer practitioner
  const passwordHash = await hashPassword(password);
  const totpSecret = generateTotpSecret();

  const [practitioner] = await db
    .insert(practitioners)
    .values({
      cabinetId: cabinet.id,
      email,
      name: email,  // Par defaut = email, modifiable ulterieurement
      passwordHash,
      totpSecret,
      totpEnabled: false,  // Sera active apres verification du 1er code
      // Note : lastLoginAt et emailVerifiedAt omis = NULL en BDD
      // (Drizzle + postgres-js ne supportent pas null explicite pour timestamp)
    })
    .returning();

  // Creer subscription gratuite par defaut
  await db.insert(cabinetSubscriptions).values({
    cabinetId: cabinet.id,
    plan: 'free',
    status: 'active',
  });

  // Audit log (ip omis si non disponible — Drizzle + postgres-js ne supportent pas null explicite pour inet)
  await db.insert(auditLogs).values({
    actorType: 'practitioner',
    actorId: practitioner.id,
    cabinetId: cabinet.id,
    action: 'signup',
    targetType: 'cabinet',
    targetId: cabinet.id,
  });

  // Creer session (MFA non encore verifie)
  const ip = req.headers.get('x-forwarded-for') || req.ip || undefined;
  const userAgent = req.headers.get('user-agent') || undefined;
  const { token, expiresAt } = await createSession({
    practitionerId: practitioner.id,
    cabinetId: cabinet.id,
    ip,
    userAgent,
    mfaVerified: false,
  });
  setSessionCookie(token, expiresAt);

  // Generer QR code TOTP
  const totpUri = getTotpUri(totpSecret, email);
  const qrCodeUrl = await generateQrCodeDataUrl(totpUri);

  return NextResponse.json({
    success: true,
    qrCodeUrl,
    totpSecret,  // Pour affichage texte en backup
  });
}
