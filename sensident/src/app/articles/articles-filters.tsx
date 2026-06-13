'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, BookOpen, X } from 'lucide-react';

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readingTimeMin: number;
}

interface Category {
  code: string;
  name: string;
}

export function ArticlesFilters({ articles, categories }: { articles: Article[]; categories: Category[] }) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [maxTime, setMaxTime] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (activeCategory !== 'all' && a.category !== activeCategory) return false;
      if (maxTime !== null && a.readingTimeMin > maxTime) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!a.title.toLowerCase().includes(q) && !a.excerpt.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [articles, activeCategory, maxTime, search]);

  const grouped: Record<string, Article[]> = {};
  for (const a of filtered) {
    if (!grouped[a.category]) grouped[a.category] = [];
    grouped[a.category].push(a);
  }

  const catName = (code: string) => categories.find((c) => c.code === code)?.name ?? code;

  const reset = () => {
    setSearch('');
    setActiveCategory('all');
    setMaxTime(null);
  };

  const hasFilters = search || activeCategory !== 'all' || maxTime !== null;

  return (
    <>
      {/* Search bar + filters */}
      <div className="mt-6 space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Rechercher un article..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              activeCategory === 'all'
                ? 'border-accent bg-accent text-accent-foreground'
                : 'border-border bg-background text-foreground hover:border-foreground'
            }`}
          >
            Tous ({articles.length})
          </button>
          {categories.map((c) => {
            const count = articles.filter((a) => a.category === c.code).length;
            if (count === 0) return null;
            return (
              <button
                key={c.code}
                onClick={() => setActiveCategory(c.code)}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  activeCategory === c.code
                    ? 'border-accent bg-accent text-accent-foreground'
                    : 'border-border bg-background text-foreground hover:border-foreground'
                }`}
              >
                {c.name}
                <span className="ml-1.5 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-muted-foreground self-center">Durée max&nbsp;:</span>
          {[null, 5, 8, 12].map((t) => (
            <button
              key={String(t)}
              onClick={() => setMaxTime(t)}
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs transition ${
                maxTime === t
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-background text-foreground hover:border-foreground'
              }`}
            >
              {t === null ? 'Toutes' : `≤ ${t} min`}
            </button>
          ))}
          {hasFilters && (
            <button
              onClick={reset}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-auto"
            >
              <X size={12} /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Count + active filters */}
      <div className="mt-4 text-sm text-muted-foreground">
        {filtered.length === articles.length ? (
          <span>{articles.length} articles</span>
        ) : (
          <span>
            <strong className="text-foreground">{filtered.length}</strong> article{filtered.length > 1 ? 's' : ''} sur {articles.length}
          </span>
        )}
      </div>

      {/* Results grouped by category */}
      {filtered.length === 0 ? (
        <div className="mt-12 text-center py-12 text-muted-foreground">
          <BookOpen className="mx-auto h-10 w-10 opacity-40 mb-3" />
          <p>Aucun article ne correspond à vos critères.</p>
          <button onClick={reset} className="mt-2 text-sm text-accent underline">
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-12">
          {Object.keys(grouped).map((code) => (
            <div key={code} className="scroll-mt-20">
              <h2 className="text-xl md:text-2xl font-semibold mb-5">
                {catName(code)}{' '}
                <span className="text-sm text-muted-foreground font-normal">
                  ({grouped[code].length})
                </span>
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
    </>
  );
}
