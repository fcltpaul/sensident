import Link from 'next/link';
import { db } from '@/db/client';
import { articles, categories } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { ArticlesFilters } from './articles-filters';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Articles prévention bucco-dentaire — Sensident',
  description:
    "Catalogue d'articles de prévention dentaire validés par notre comité scientifique. Brossage, alimentation, caries, gencives, soins réguliers.",
  openGraph: {
    title: 'Articles prévention bucco-dentaire — Sensident',
    description: 'Articles validés par des chirurgiens-dentistes. Sans IA, fondés sur la science.',
    type: 'website',
  },
};

export const revalidate = 3600;

export default async function ArticlesIndexPage() {
  const validatedArticles = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      category: articles.category,
      readingTimeMin: articles.readingTimeMin,
    })
    .from(articles)
    .where(eq(articles.status, 'validated'))
    .orderBy(asc(articles.category), asc(articles.title));

  const allCategories = await db
    .select({ code: categories.code, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.position));

  return (
    <main className="min-h-screen bg-background">
      {/* === HERO === */}
      <section className="border-b border-border bg-gradient-to-b from-accent/5 to-background">
        <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">← Sensident</Link>
          </p>
          <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
            Articles de prévention
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            {validatedArticles.length} articles validés par notre comité
            scientifique de chirurgiens-dentistes. Fondés sur la science, sans
            IA, accessibles à tous vos patients.
          </p>
        </div>
      </section>

      {/* === FILTRES + RÉSULTATS === */}
      <section className="mx-auto max-w-5xl px-6 py-8 md:py-10">
        <ArticlesFilters articles={validatedArticles} categories={allCategories} />
      </section>

      {/* === CTA CABINET === */}
      <section className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-5xl px-6 py-10 text-center">
          <h2 className="text-xl font-semibold">Vous êtes chirurgien-dentiste ?</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
            Partagez ces articles avec vos patients en 3 minutes par mois, depuis
            votre dashboard Sensident. Newsletter personnalisée au nom de votre
            cabinet.
          </p>
          <div className="mt-5 flex justify-center gap-3 flex-wrap">
            <Link
              href="/signup"
              className="inline-flex items-center rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90 transition"
            >
              Créer mon compte praticien
            </Link>
            <Link
              href="/"
              className="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:border-foreground transition"
            >
              En savoir plus
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
