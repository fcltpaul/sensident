import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Re-implements optin route with a catch-all to surface real error
export async function POST(req: NextRequest) {
  const log: string[] = [];
  try {
    const { db, DB_DIALECT, rawSqlClient } = await import('@/db/client');
    const { cabinets, patientConsents, auditLogs, inviteTokens } = await import('@/db/schema');
    const { eq, and, gt, isNull } = await import('drizzle-orm');
    const { checkRateLimit, getClientIp } = await import('@/lib/rate-limit');
    const { enforceMaxPatients } = await import('@/lib/features');
    const crypto = await import('node:crypto');

    const ip = getClientIp(req);
    const rl = await checkRateLimit('patient_optin', ip);
    log.push(`step 1: rl=${rl.allowed}`);
    const body = await req.json();
    const { cabinetId, email, newsletterOptin } = body;
    log.push(`step 2: body parsed cab=${cabinetId} email=${email}`);

    const cabRows = await db.select().from(cabinets).where(eq(cabinets.id, cabinetId)).limit(1);
    log.push(`step 3: cabinet count=${cabRows.length}`);
    if (cabRows.length === 0) return NextResponse.json({ ok: false, log, err: 'no cabinet' }, { status: 404 });
    const cab = cabRows[0];

    const emailHash = crypto.createHash('sha256').update(email + cab.id + 'salt').digest('hex');
    log.push(`step 4: emailHash=${emailHash.substring(0,8)}`);

    const existing = await db.select({ id: patientConsents.id, confirmedAt: patientConsents.confirmedAt }).from(patientConsents).where(and(eq(patientConsents.cabinetId, cab.id), eq(patientConsents.emailHash, emailHash))).limit(1);
    log.push(`step 5: existing count=${existing.length}`);
    if (existing.length > 0 && existing[0].confirmedAt) {
      return NextResponse.json({ ok: false, log, err: 'already confirmed' }, { status: 409 });
    }

    // invite token via raw SQL (Date column crash)
    let inviteId: string | null = null;
    if (DB_DIALECT === 'postgresql') {
      const nowIso = new Date().toISOString();
      const inv = await rawSqlClient<{ id: string }[]>`
        SELECT id FROM invite_tokens
        WHERE cabinet_id = ${cab.id}::uuid
          AND expires_at > ${nowIso}::timestamptz
          AND revoked_at IS NULL
        ORDER BY created_at DESC LIMIT 1
      `;
      inviteId = inv[0]?.id || null;
    } else {
      const inv = await db.select({ id: inviteTokens.id }).from(inviteTokens).where(and(eq(inviteTokens.cabinetId, cab.id), gt(inviteTokens.expiresAt, new Date()), isNull(inviteTokens.revokedAt))).limit(1);
      inviteId = inv[0]?.id || null;
    }
    log.push(`step 6: inviteId=${inviteId}`);

    await enforceMaxPatients(cab.id);
    log.push(`step 7: enforceMaxPatients ok`);

    const emailEncrypted = Buffer.from(email).toString('base64');
    log.push(`step 8: db.insert(patientConsents)`);
    const [pc] = await db.insert(patientConsents).values({
      cabinetId: cab.id,
      emailHash,
      emailEncrypted,
      optInVersion: 'v1.0-2026-06-08',
      cguAccepted: true,
      newsletterOptin: !!newsletterOptin,
      ip: ip as any,
      userAgent: 'diag',
      inviteTokenId: inviteId,
    }).returning();
    log.push(`step 9: pc.id=${pc.id}`);

    log.push(`step 10: db.insert(auditLogs)`);
    await db.insert(auditLogs).values({
      actorType: 'patient',
      cabinetId: cab.id,
      action: 'optin_created',
      targetType: 'patient_consent',
      ip: ip as any,
      userAgent: 'diag',
      metadata: { newsletterOptin },
    });
    log.push(`step 11: audit ok`);

    return NextResponse.json({ ok: true, log });
  } catch (e: any) {
    log.push(`OUTER ERR: ${e.message}`);
    return NextResponse.json({ ok: false, log, error: e.message, stack: (e.stack||'').substring(0,2000) }, { status: 500 });
  }
}
