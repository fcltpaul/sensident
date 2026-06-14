import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const log: string[] = [];
  try {
    const { db, rawSqlClient } = await import('@/db/client');
    const { cabinets, patientConsents, auditLogs, inviteTokens } = await import('@/db/schema');
    const { eq, and, gt, isNull } = await import('drizzle-orm');

    const body = await req.json();
    log.push(`step 1: body=${JSON.stringify(body)}`);

    // Get the cabinet
    const cabRows = await db.select().from(cabinets).where(eq(cabinets.id, body.cabinetId)).limit(1);
    log.push(`step 2: cabinet count=${cabRows.length}`);
    if (cabRows.length === 0) return NextResponse.json({ ok: false, log, err: 'no cabinet' }, { status: 404 });
    const cab = cabRows[0];

    // email hash
    const crypto = await import('node:crypto');
    const emailHash = crypto.createHash('sha256').update(body.email + cab.id + 'salt').digest('hex');
    log.push(`step 3: emailHash=${emailHash.substring(0,8)}...`);

    // existing
    const existing = await db.select({ id: patientConsents.id }).from(patientConsents).where(eq(patientConsents.emailHash, emailHash)).limit(1);
    log.push(`step 4: existing count=${existing.length}`);

    // invite token (might fail if none exists)
    let inviteId: string | null = null;
    try {
      const inv = await db.select({ id: inviteTokens.id }).from(inviteTokens).where(and(eq(inviteTokens.cabinetId, cab.id), gt(inviteTokens.expiresAt, new Date()), isNull(inviteTokens.revokedAt))).limit(1);
      inviteId = inv[0]?.id || null;
      log.push(`step 5: invite token id=${inviteId}`);
    } catch (e: any) {
      log.push(`step 5 ERR: ${e.message}`);
    }

    // enforce max patients
    const { enforceMaxPatients } = await import('@/lib/features');
    try {
      await enforceMaxPatients(cab.id);
      log.push(`step 6: enforceMaxPatients ok`);
    } catch (e: any) {
      log.push(`step 6 ERR: ${e.message}`);
    }

    // INSERT patientConsents
    log.push(`step 7: db.insert(patientConsents)`);
    const [pc] = await db.insert(patientConsents).values({
      cabinetId: cab.id,
      emailHash,
      emailEncrypted: Buffer.from(body.email).toString('base64'),
      optInVersion: 'v1.0-2026-06-08',
      cguAccepted: true,
      newsletterOptin: body.newsletterOptin || false,
      ip: '92.88.241.189' as any,
      userAgent: 'diag',
      inviteTokenId: inviteId,
    }).returning();
    log.push(`step 8: patientConsent inserted id=${pc.id}`);

    // INSERT auditLogs
    log.push(`step 9: db.insert(auditLogs)`);
    await db.insert(auditLogs).values({
      actorType: 'patient',
      cabinetId: cab.id,
      action: 'optin_created',
      targetType: 'patient_consent',
      ip: '92.88.241.189' as any,
      userAgent: 'diag',
      metadata: { newsletterOptin: body.newsletterOptin },
    });
    log.push(`step 10: audit inserted`);

    return NextResponse.json({ ok: true, log });
  } catch (e: any) {
    log.push(`OUTER ERR: ${e.message}`);
    log.push(`STACK: ${(e.stack||'').substring(0,1000)}`);
    return NextResponse.json({ ok: false, log, error: e.message, stack: (e.stack||'').substring(0,1500) }, { status: 500 });
  }
}
