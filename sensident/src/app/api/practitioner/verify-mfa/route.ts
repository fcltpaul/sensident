import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { practitioners, auditLogs, mfaEmailCodes } from '@/db/schema';
import { and, eq, isNull, gt } from 'drizzle-orm';
import { verifyTotpCode, getSessionFromCookie, setSessionCookie, createSession } from '@/lib/auth';

const MfaSchema = z.object({
  // Un des deux : TOTP (6 chiffres app authenticator) OU emailCode (6 chiffres envoye par mail)
  totpCode: z.string().regex(/^\d{6}$/).optional(),
  emailCode: z.string().regex(/^\d{6}$/).optional(),
}).refine((d) => d.totpCode || d.emailCode, { message: 'totpCode ou emailCode requis.' });

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  const parsed = MfaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Code invalide (6 chiffres requis).' }, { status: 400 });
  }

  // Recup session en cours
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: 'Session expiree. Reconnectez-vous.' }, { status: 401 });
  }

  // Charge le practitioner
  const result = await db
    .select()
    .from(practitioners)
    .where(eq(practitioners.id, session.practitionerId))
    .limit(1);

  if (result.length === 0) {
    return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 });
  }

  const practitioner = result[0];

  // Branche TOTP
  if (parsed.data.totpCode) {
    if (!practitioner.totpSecret) {
      return NextResponse.json({ error: 'MFA TOTP non initialise.' }, { status: 400 });
    }
    const ok = verifyTotpCode(practitioner.totpSecret, parsed.data.totpCode);
    if (!ok) {
      return NextResponse.json({ error: 'Code TOTP incorrect.' }, { status: 400 });
    }
    // Activer MFA si premiere fois
    if (!practitioner.totpEnabled) {
      await db
        .update(practitioners)
        .set({ totpEnabled: true })
        .where(eq(practitioners.id, practitioner.id));
    }
  }

  // Branche email code
  if (parsed.data.emailCode) {
    const codeHash = crypto.createHash('sha256').update(parsed.data.emailCode).digest('hex');
    let row: { id: string } | undefined;
    if (DB_DIALECT === 'postgresql') {
      const rows = await rawSqlClient<Array<{ id: string }>>`
        SELECT id FROM mfa_email_codes
        WHERE practitioner_id = ${practitioner.id}::text
          AND code_hash = ${codeHash}
          AND expires_at > NOW()
          AND used_at IS NULL
        LIMIT 1
      `;
      row = rows[0];
    } else {
      const rows = await db
        .select({ id: mfaEmailCodes.id })
        .from(mfaEmailCodes)
        .where(
          and(
            eq(mfaEmailCodes.practitionerId, practitioner.id),
            eq(mfaEmailCodes.codeHash, codeHash),
            gt(mfaEmailCodes.expiresAt, new Date()),
            isNull(mfaEmailCodes.usedAt),
          ),
        )
        .limit(1);
      row = rows[0];
    }
    if (!row) {
      return NextResponse.json({ error: 'Code email incorrect ou expire.' }, { status: 400 });
    }
    // Marquer le code comme utilise (idempotent)
    if (DB_DIALECT === 'postgresql') {
      await rawSqlClient`UPDATE mfa_email_codes SET used_at = NOW() WHERE id = ${row.id}`;
    } else {
      await db.update(mfaEmailCodes).set({ usedAt: new Date() }).where(eq(mfaEmailCodes.id, row.id));
    }
  }

  // Creer une nouvelle session avec mfaVerified = true
  const ip = req.headers.get('x-forwarded-for') || req.ip || undefined;
  const userAgent = req.headers.get('user-agent') || undefined;
  const { token, expiresAt } = await createSession({
    practitionerId: practitioner.id,
    cabinetId: practitioner.cabinetId,
    ip,
    userAgent,
    mfaVerified: true,
  });
  setSessionCookie(token, expiresAt);

  // Audit
  await db.insert(auditLogs).values({
    actorType: 'practitioner',
    actorId: practitioner.id,
    cabinetId: practitioner.cabinetId,
    action: parsed.data.emailCode ? 'mfa_email_verified' : 'mfa_enabled',
    ip: req.ip ?? null,
    userAgent: req.headers.get('user-agent'),
  });

  return NextResponse.json({ success: true });
}
