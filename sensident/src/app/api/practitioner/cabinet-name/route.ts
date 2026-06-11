import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { cabinets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';

const Schema = z.object({ name: z.string().min(1).max(100) });

export async function PUT(req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Nom invalide.' }, { status: 400 });

  await db.update(cabinets).set({ name: parsed.data.name, updatedAt: new Date() }).where(eq(cabinets.id, session.cabinetId));
  return NextResponse.json({ success: true });
}
