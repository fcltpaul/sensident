import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { cabinets, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';

const ContactSchema = z.object({
  name: z.string().min(1).max(100),
  rpps: z.string().max(20).nullable(),
  contactAddress: z.string().max(300).nullable(),
  contactPhone: z.string().max(40).nullable(),
  contactEmail: z.string().email().nullable().or(z.literal('')),
  contactRdvUrl: z.string().url().nullable().or(z.literal('')),
  contactMapUrl: z.string().url().nullable().or(z.literal('')),
  contactOpeningHours: z.record(z.string()).nullable(),
  contactFacadePhotoUrl: z.string().url().nullable().or(z.literal('')),
  contactOncdMention: z.boolean(),
});

/**
 * PUT /api/practitioner/contact
 *
 * Audit 2026-07-07 09h (fix P2 migration) :
 *  - 2026-07-07 09h : migration ALTER TABLE cabinets ajoute toutes les
 *    colonnes contact_* + updated_at en Neon prod. Avant, on persistait
 *    uniquement name + contact_email et tout le reste tombait en
 *    audit_logs metadata (perdu cote UI apres refresh).
 *  - Apres migration : le PUT Neon peut envoyer toutes les colonnes,
 *    identique a la branche SQLite.
 */
export async function PUT(req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }); }

  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides.', details: parsed.error.format() }, { status: 400 });
  }

  const contactEmailValue = parsed.data.contactEmail || null;
  const hoursJson = parsed.data.contactOpeningHours ? JSON.stringify(parsed.data.contactOpeningHours) : null;

  if (DB_DIALECT === 'postgresql') {
    // Neon prod : toutes les colonnes contact_* existent depuis migration 2026-07-07 09h.
    await rawSqlClient`
      UPDATE cabinets
      SET
        name = ${parsed.data.name},
        rpps = ${parsed.data.rpps || null},
        contact_address = ${parsed.data.contactAddress || null},
        contact_phone = ${parsed.data.contactPhone || null},
        contact_email = ${contactEmailValue},
        contact_rdv_url = ${parsed.data.contactRdvUrl || null},
        contact_opening_hours = ${hoursJson}::jsonb,
        contact_facade_photo_url = ${parsed.data.contactFacadePhotoUrl || null},
        contact_oncd_mention = ${parsed.data.contactOncdMention},
        contact_map_url = ${parsed.data.contactMapUrl || null},
        updated_at = NOW()
      WHERE id::text = ${session.cabinetId}::text
    `;

    try {
      await rawSqlClient`
        INSERT INTO audit_logs (id, ts, actor_type, actor_id, cabinet_id, action, target_type, target_id, user_agent, ip, metadata)
        VALUES (
          ${crypto.randomUUID()}::text,
          NOW(),
          'practitioner',
          ${session.practitionerId}::text,
          ${session.cabinetId}::text,
          'contact_updated',
          'cabinet',
          ${session.cabinetId}::text,
          ${req.headers.get('user-agent') ?? null},
          ${req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null},
          ${JSON.stringify({ note: 'all columns persisted (post 2026-07-07 migration)' })}::jsonb
        )
      `;
    } catch (auditErr) {
      console.error('[contact] audit insert failed:', auditErr);
    }
  } else {
    // SQLite (dev) : chemin Drizzle inchange
    await db
      .update(cabinets)
      .set({
        name: parsed.data.name,
        rpps: parsed.data.rpps || null,
        contactAddress: parsed.data.contactAddress || null,
        contactPhone: parsed.data.contactPhone || null,
        contactEmail: contactEmailValue,
        contactRdvUrl: parsed.data.contactRdvUrl || null,
        contactMapUrl: parsed.data.contactMapUrl || null,
        contactOpeningHours: parsed.data.contactOpeningHours,
        contactFacadePhotoUrl: parsed.data.contactFacadePhotoUrl || null,
        contactOncdMention: parsed.data.contactOncdMention,
        updatedAt: new Date(),
      })
      .where(eq(cabinets.id, session.cabinetId));

    await db.insert(auditLogs).values({
      actorType: 'practitioner',
      actorId: session.practitionerId,
      cabinetId: session.cabinetId,
      action: 'contact_updated',
      targetType: 'cabinet',
      targetId: session.cabinetId,
      ip: req.ip ?? null,
      userAgent: req.headers.get('user-agent'),
    });
  }

  return NextResponse.json({ success: true });
}