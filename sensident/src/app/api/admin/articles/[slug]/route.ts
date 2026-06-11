import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { articles, auditLogs } from '@/db/schema';
import { getAdminSession } from '@/lib/admin-auth';
import { eq } from 'drizzle-orm';

const UpdateSchema = z.object({
  title: z.string().min(1).max(200),
  excerpt: z.string().min(1).max(200),
  category: z.string().min(1).max(40),
  bodyMd: z.string().min(1),
  readingTimeMin: z.number().int().min(1).max(30),
  slidesJson: z.array(z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    visual: z.string().optional(),
    takeaway: z.string().optional(),
  })).min(1).max(10),
  status: z.enum(['draft', 'validated', 'archived']).default('draft'),
});

export async function PUT(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getAdminSession();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  if (session.role === 'reader') {
    return NextResponse.json({ error: 'Permission insuffisante.' }, { status: 403 });
  }

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }); }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
  }

  const existing = await db.select().from(articles).where(eq(articles.slug, params.slug)).limit(1);
  if (existing.length === 0) {
    return NextResponse.json({ error: 'Article introuvable.' }, { status: 404 });
  }

  // Si on modifie un article validé, on le repasse en draft (à re-valider)
  const newStatus = existing[0].status === 'validated' ? 'draft' : parsed.data.status;
  const validatedAt = newStatus === 'validated' ? new Date() : null;
  const nextReviewAt = validatedAt ? new Date(validatedAt.getTime() + 365 * 24 * 60 * 60 * 1000) : null;

  await db
    .update(articles)
    .set({
      title: parsed.data.title,
      excerpt: parsed.data.excerpt,
      category: parsed.data.category,
      bodyMd: parsed.data.bodyMd,
      slidesJson: parsed.data.slidesJson as any,
      readingTimeMin: parsed.data.readingTimeMin,
      status: newStatus,
      validatedBy: newStatus === 'validated' ? session.adminId : null,
      validatedAt,
      nextReviewAt,
      updatedAt: new Date(),
    })
    .where(eq(articles.slug, params.slug));

  await db.insert(auditLogs).values({
    actorType: 'admin',
    actorId: session.adminId,
    action: 'article_updated',
    targetType: 'article',
    targetId: params.slug as any,
    metadata: { newStatus, wasStatus: existing[0].status },
  });

  return NextResponse.json({ success: true, status: newStatus });
}

export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getAdminSession();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  if (session.role !== 'superadmin') {
    return NextResponse.json({ error: 'Réservé aux superadmins.' }, { status: 403 });
  }

  const existing = await db.select().from(articles).where(eq(articles.slug, params.slug)).limit(1);
  if (existing.length === 0) {
    return NextResponse.json({ error: 'Article introuvable.' }, { status: 404 });
  }

  await db.delete(articles).where(eq(articles.slug, params.slug));

  await db.insert(auditLogs).values({
    actorType: 'admin',
    actorId: session.adminId,
    action: 'article_deleted',
    targetType: 'article',
    targetId: params.slug as any,
    metadata: { title: existing[0].title },
  });

  return NextResponse.json({ success: true });
}
