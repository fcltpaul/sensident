import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { articles, newsletterTemplates } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { renderTemplate, generateSubject } from '@/lib/email-templates';

const PreviewSchema = z.object({
  articleSlug: z.string(),
  templateId: z.string(),
  customMessage: z.string().max(200).optional().default(''),
  cabinetName: z.string(),
  practitionerName: z.string(),
  cabinetSlug: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }); }

  const parsed = PreviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });

  const article = (await db.select().from(articles).where(eq(articles.slug, parsed.data.articleSlug)).limit(1))[0];
  if (!article) return NextResponse.json({ error: 'Article introuvable.' }, { status: 404 });

  const template = (await db.select().from(newsletterTemplates).where(eq(newsletterTemplates.id, parsed.data.templateId)).limit(1))[0];
  if (!template) return NextResponse.json({ error: 'Template introuvable.' }, { status: 404 });

  const html = renderTemplate({
    templateCode: template.code,
    article: {
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      bodyMd: article.bodyMd,
      slidesJson: article.slidesJson as any,
    },
    cabinet: { name: parsed.data.cabinetName },
    practitioner: { displayName: parsed.data.practitionerName },
    customMessage: parsed.data.customMessage,
    libraryUrl: parsed.data.cabinetSlug ? `/c/${parsed.data.cabinetSlug}/bibliotheque` : undefined,
  });

  const subject = generateSubject({
    templateCode: template.code,
    articleTitle: article.title,
    cabinetName: parsed.data.cabinetName,
  });

  return NextResponse.json({ html, subject });
}
