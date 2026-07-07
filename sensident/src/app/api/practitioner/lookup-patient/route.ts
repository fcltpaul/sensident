import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { patientConsents } from '@/db/schema';
import { getSessionFromCookie } from '@/lib/auth';

/**
 * GET /api/practitioner/lookup-patient?emailHash=...
 *
 * Cherche un patient par email_hash (SHA-256) dans le cabinet du
 * praticien connecte. Renvoie l'email decode si le patient existe.
 *
 * Utilise depuis /dashboard/newsletter/compose (mode sans prefill)
 * pour verifier la validite d'un hash saisi manuellement.
 *
 * Audit 2026-07-07 09h (P3) : companion de single-send.
 */
export async function GET(request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
  }

  const emailHash = request.nextUrl.searchParams.get('emailHash')?.trim() ?? '';
  if (!emailHash) {
    return NextResponse.json({ error: 'emailHash requis' }, { status: 400 });
  }

  type PatientRow = { email_hash: string; email_encrypted: string | null };
  let row: PatientRow | null = null;

  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<PatientRow[]>`
      SELECT email_hash, email_encrypted FROM patient_consents
      WHERE cabinet_id::text = ${session.cabinetId}::text
        AND email_hash = ${emailHash}
      LIMIT 1
    `;
    row = rows[0] ?? null;
  } else {
    const r = await db
      .select({
        emailHash: patientConsents.emailHash,
        emailEncrypted: patientConsents.emailEncrypted,
      })
      .from(patientConsents)
      .where(
        and(
          eq(patientConsents.cabinetId, session.cabinetId),
          eq(patientConsents.emailHash, emailHash),
        ),
      )
      .limit(1);
    row = r[0]
      ? { email_hash: r[0].emailHash, email_encrypted: r[0].emailEncrypted }
      : null;
  }

  if (!row) {
    return NextResponse.json({ error: 'Patient introuvable' }, { status: 404 });
  }

  let email: string | null = null;
  if (row.email_encrypted) {
    try {
      email = Buffer.from(row.email_encrypted, 'base64').toString('utf-8').trim();
    } catch {
      email = null;
    }
  }

  if (!email || !email.includes('@')) {
    return NextResponse.json(
      { error: 'Email patient illisible (donnee corrompue ou chiffrement non supporte)' },
      { status: 422 },
    );
  }

  return NextResponse.json({ ok: true, email });
}