import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { articles, auditLogs } from '@/db/schema';
import { getAdminSession } from '@/lib/admin-auth';
import { eq } from 'drizzle-orm';

const StatusSchema = z.object({
  status: z.enum(['draft', 'validated', 'archived']),
});

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getAdminSession();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  if (session.role === 'reader') {
    return NextResponse.json({ error: 'Permission insuffisante.' }, { status: 403 });
  }

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }); }
  const parsed = StatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 });
  }

  const existing = await db.select().from(articles).where(eq(articles.slug, params.slug)).limit(1);
  if (existing.length === 0) {
    return NextResponse.json({ error: 'Article introuvable.' }, { status: 404 });
  }

  const now = new Date();
  const validatedAt = parsed.data.status === 'validated' ? now : null;
  const nextReviewAt = validatedAt ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) : null;

  await db
    .update(articles)
    .set({
      status: parsed.data.status,
      validatedBy: parsed.data.status === 'validated' ? session.adminId : null,
      validatedAt,
      nextReviewAt,
      updatedAt: now,
    })
    .where(eq(articles.slug, params.slug));

  await db.insert(auditLogs).values({
    actorType: 'admin',
    actorId: session.adminId,
    action: `article_status_${parsed.data.status}`,
    targetType: 'article',
    targetId: params.slug as any,
    metadata: { from: existing[0].status, to: parsed.data.status },
  });

  return NextResponse.json({ success: true });
}
