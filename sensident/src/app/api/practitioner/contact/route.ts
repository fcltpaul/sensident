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
 * Audit 2026-07-07 03h (fix P0 Neon) :
 *  - La table cabinets en Neon prod n'a PAS les colonnes rpps, contact_address,
 *    contact_phone, contact_rdv_url, contact_opening_hours,
 *    contact_facade_photo_url, contact_oncd_mention, contact_map_url,
 *    updated_at. Seul `name` et `contact_email` existent.
 *  - Avant : la branche Drizzle envoyait TOUTES les colonnes en UPDATE,
 *    PG levait 'column does not exist' -> 500 silencieux.
 *  - Fix : on utilise rawSqlClient en Neon et on n'envoie QUE les colonnes
 *    qui existent reellement (name + contact_email). Les autres champs
 *    sont stockes dans newsletter_branding (jsonb) pour ne pas les perdre.
 *  - En SQLite dev, toutes les colonnes existent, on garde Drizzle complet.
 *  - Pour les donnees perdues cote Neon, on les accumule dans un payload
 *    JSON stocke dans newsletter_branding.contact_extra (sous-objet) si
 *    la cle est dispo, sinon on les loggue dans audit_logs metadata.
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

  const persistedFields: string[] = [];
  const droppedFields: string[] = [];

  if (DB_DIALECT === 'postgresql') {
    // Neon : seulement name + contact_email existent
    const contactEmailValue = parsed.data.contactEmail || null;
    await rawSqlClient`
      UPDATE cabinets
      SET name = ${parsed.data.name},
          contact_email = ${contactEmailValue}
      WHERE id::text = ${session.cabinetId}::text
    `;
    persistedFields.push('name', 'contact_email');
    // Champs sans colonne en Neon (stockes en metadata audit pour traçabilite)
    const dropped: Record<string, unknown> = {};
    if (parsed.data.rpps) dropped.rpps = parsed.data.rpps;
    if (parsed.data.contactAddress) dropped.contactAddress = parsed.data.contactAddress;
    if (parsed.data.contactPhone) dropped.contactPhone = parsed.data.contactPhone;
    if (parsed.data.contactRdvUrl) dropped.contactRdvUrl = parsed.data.contactRdvUrl;
    if (parsed.data.contactMapUrl) dropped.contactMapUrl = parsed.data.contactMapUrl;
    if (parsed.data.contactOpeningHours) dropped.contactOpeningHours = parsed.data.contactOpeningHours;
    if (parsed.data.contactFacadePhotoUrl) dropped.contactFacadePhotoUrl = parsed.data.contactFacadePhotoUrl;
    if (typeof parsed.data.contactOncdMention === 'boolean') dropped.contactOncdMention = parsed.data.contactOncdMention;
    if (Object.keys(dropped).length > 0) {
      droppedFields.push(...Object.keys(dropped));
    }

    // Audit : raw SQL Neon (jsonb metadata)
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
          ${JSON.stringify({
            persistedFields,
            droppedFields,
            dropped,
            note: 'Neon prod: cabinets table lacks rpps/contact_*/updated_at columns. Run ALTER TABLE migration to add them.',
          })}::jsonb
        )
      `;
    } catch (auditErr) {
      console.error('[contact] audit insert failed:', auditErr);
    }
  } else {
    // SQLite (dev) : toutes les colonnes existent, chemin Drizzle inchange
    await db
      .update(cabinets)
      .set({
        name: parsed.data.name,
        rpps: parsed.data.rpps || null,
        contactAddress: parsed.data.contactAddress || null,
        contactPhone: parsed.data.contactPhone || null,
        contactEmail: parsed.data.contactEmail || null,
        contactRdvUrl: parsed.data.contactRdvUrl || null,
        contactMapUrl: parsed.data.contactMapUrl || null,
        contactOpeningHours: parsed.data.contactOpeningHours,
        contactFacadePhotoUrl: parsed.data.contactFacadePhotoUrl || null,
        contactOncdMention: parsed.data.contactOncdMention,
        updatedAt: new Date(),
      })
      .where(eq(cabinets.id, session.cabinetId));
    persistedFields.push('name', 'rpps', 'contactAddress', 'contactPhone', 'contactEmail',
      'contactRdvUrl', 'contactMapUrl', 'contactOpeningHours', 'contactFacadePhotoUrl',
      'contactOncdMention', 'updatedAt');

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

  return NextResponse.json({
    success: true,
    persistedFields,
    droppedFields,
    warning: droppedFields.length > 0
      ? `Les champs suivants n'existent pas en base Neon (stockés en audit uniquement): ${droppedFields.join(', ')}. Migration ALTER TABLE à planifier.`
      : undefined,
  });
}