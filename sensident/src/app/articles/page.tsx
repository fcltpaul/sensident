import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/db/client';
import { articles, categories } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Articles prévention bucco-dentaire — Sensident',
  description:
    'Catalogue d\'articles de prévention dentaire validés par notre comité scientifique. Brossage, alimentation, caries, gencives, soins réguliers.',
  openGraph: {
    title: 'Articles prévention bucco-dentaire — Sensident',
    description:
      'Articles validés par des chirurgiens-dentistes. Sans IA, fondés sur la science.',
    type: 'website',
  },
};

// Cache 1h — revalidation ISR. Catalogue change rarement.
export const revalidate = 3600;

export default async function ArticlesIndexPage() {
  // Articles validés uniquement, triés par catégorie puis titre
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

  // Toutes les catégories (pour la nav latérale / tags)
  const allCategories = await db
    .select({
      code: categories.code,
      name: categories.name,
    })
    .from(categories)
    .orderBy(asc(categories.position));

  // Group articles by category
  const grouped: Record<string, typeof validatedArticles> = {};
  for (const a of validatedArticles) {
    if (!grouped[a.category]) grouped[a.category] = [];
    grouped[a.category].push(a);
  }

  const catName = (code: string) =>
    allCategories.find((c) => c.code === code)?.name ?? code;

  return (
    <main className="min-h-screen bg-background">
      {/* === HERO === */}
      <section className="border-b border-border bg-gradient-to-b from-accent/5 to-background">
        <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              ← Sensident
            </Link>
          </p>
          <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
            Articles de prévention
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            {validatedArticles.length} articles validés par notre comité
            scientifique de chirurgiens-dentistes. Fondés sur la science, sans
            IA, accessibles à tous vos patients.
          </p>

          {/* Catégories en chips */}
          <div className="mt-6 flex flex-wrap gap-2">
            {Object.keys(grouped).map((code) => (
              <a
                key={code}
                href={`#cat-${code}`}
                className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:border-foreground transition"
              >
                {catName(code)}
                <span className="ml-1.5 text-muted-foreground">
                  {grouped[code].length}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* === ARTICLES GROUPÉS PAR CATÉGORIE === */}
      <section className="mx-auto max-w-5xl px-6 py-10">
        {Object.keys(grouped).length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            Aucun article validé pour l'instant.
          </p>
        ) : (
          <div className="space-y-12">
            {Object.keys(grouped).map((code) => (
              <div key={code} id={`cat-${code}`} className="scroll-mt-20">
                <h2 className="text-xl md:text-2xl font-semibold mb-5">
                  {catName(code)}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {grouped[code].map((a) => (
                    <Link
                      key={a.id}
                      href={`/articles/${a.slug}`}
                      className="group block overflow-hidden rounded-xl border border-border bg-card transition hover:border-foreground/30 hover:shadow-sm"
                    >
                      <div className="relative aspect-square bg-muted">
                        <Image
                          src={`/images/article-${a.slug}.png`}
                          alt={a.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition group-hover:scale-[1.02]"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold leading-snug line-clamp-2 group-hover:text-foreground">
                          {a.title}
                        </h3>
                        <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                          {a.excerpt}
                        </p>
                        <p className="mt-3 text-xs text-muted-foreground">
                          {a.readingTimeMin} min de lecture
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* === CTA CABINET === */}
      <section className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-5xl px-6 py-10 text-center">
          <h2 className="text-xl font-semibold">
            Vous êtes chirurgien-dentiste ?
          </h2>
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
