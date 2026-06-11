import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { articles, auditLogs, admins } from '@/db/schema';
import { getAdminSession } from '@/lib/admin-auth';
import { eq } from 'drizzle-orm';

const CreateSchema = z.object({
  slug: z.string().min(3).max(80).regex(/^[a-z0-9-]+$/),
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

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  if (session.role === 'reader') {
    return NextResponse.json({ error: 'Permission insuffisante.' }, { status: 403 });
  }

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }); }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides.', details: parsed.error.format() }, { status: 400 });
  }

  // Un slug doit être unique
  const existing = await db.select({ slug: articles.slug }).from(articles).where(eq(articles.slug, parsed.data.slug)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: 'Ce slug est déjà utilisé.' }, { status: 409 });
  }

  const validatedAt = parsed.data.status === 'validated' ? new Date() : null;
  const nextReviewAt = validatedAt ? new Date(validatedAt.getTime() + 365 * 24 * 60 * 60 * 1000) : null;

  await db.insert(articles).values({
    slug: parsed.data.slug,
    title: parsed.data.title,
    excerpt: parsed.data.excerpt,
    category: parsed.data.category,
    bodyMd: parsed.data.bodyMd,
    slidesJson: parsed.data.slidesJson as any,
    readingTimeMin: parsed.data.readingTimeMin,
    status: parsed.data.status,
    validatedBy: parsed.data.status === 'validated' ? session.adminId : null,
    validatedAt,
    nextReviewAt,
  });

  await db.insert(auditLogs).values({
    actorType: 'admin',
    actorId: session.adminId,
    action: 'article_created',
    targetType: 'article',
    targetId: parsed.data.slug as any,
    metadata: { title: parsed.data.title, status: parsed.data.status },
  });

  return NextResponse.json({ success: true });
}
