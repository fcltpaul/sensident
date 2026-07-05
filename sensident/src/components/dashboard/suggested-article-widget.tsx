'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, ChevronRight, RefreshCw } from 'lucide-react';

interface Suggested {
  slug: string;
  title: string;
  excerpt: string;
  readingTimeMin: number;
  categoryCode: string;
}

/**
 * Widget "Idée d'article du moment" sur le dashboard praticien.
 * Fetch /api/library/suggestions (déjà livrée par l'onboarding wizard),
 * affiche 1 article au hasard parmi le top 3.
 */
export function SuggestedArticleWidget() {
  const [items, setItems] = useState<Suggested[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/library/suggestions', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data?.articles)) {
          setItems(data.articles.slice(0, 3));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-gradient-to-br from-blue-50/40 to-background p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" aria-hidden={true} />
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700">
            Idee d&apos;article du moment
          </p>
        </div>
        <div className="mt-3 h-5 w-2/3 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (items.length === 0) return null;

  const current = items[idx] ?? items[0];

  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/40 to-background p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" aria-hidden={true} />
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700">
            Idee d&apos;article du moment
          </p>
        </div>
        {items.length > 1 && (
          <button
            type="button"
            onClick={() => setIdx((idx + 1) % items.length)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Voir une autre suggestion"
            title="Voir une autre suggestion"
          >
            <RefreshCw className="h-3 w-3" aria-hidden={true} />
            Autre
          </button>
        )}
      </div>

      <p className="mt-2 text-sm font-semibold text-foreground">{current.title}</p>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">{current.excerpt}</p>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-800">
          {current.categoryCode} · {current.readingTimeMin} min
        </span>
        <Link
          href={`/dashboard/newsletter/compose?article=${current.slug}`}
          className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
        >
          Composer avec
          <ChevronRight className="h-3 w-3" aria-hidden={true} />
        </Link>
      </div>
    </div>
  );
}