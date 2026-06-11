import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
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

  return NextResponse.json({ success: true });
}
