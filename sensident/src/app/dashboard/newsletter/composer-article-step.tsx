'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Article, Category } from './composer-types';

interface Props {
  articles: Article[];
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  selectedArticle: Article | null;
  onSelectArticle: (a: Article) => void;
  onNext: () => void;
}

/**
 * Étape 1 : Choix d'un article via la sidebar des catégories.
 * Catégories hiérarchiques (parent → enfants), filtres cumulatifs.
 */
export function ArticleStep({
  articles,
  categories,
  selectedCategoryId,
  onSelectCategory,
  selectedArticle,
  onSelectArticle,
  onNext,
}: Props) {
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  const roots = useMemo(() => categories.filter((c) => !c.parentId), [categories]);
  const childrenByParent = useMemo(() => {
    const m = new Map<string, Category[]>();
    for (const c of categories) {
      if (c.parentId) {
        const arr = m.get(c.parentId) ?? [];
        arr.push(c);
        m.set(c.parentId, arr);
      }
    }
    return m;
  }, [categories]);

  const filteredArticles = useMemo(() => {
    if (!selectedCategoryId) return articles;
    return articles.filter((a) => a.categoryIds.includes(selectedCategoryId));
  }, [articles, selectedCategoryId]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
      {/* Sidebar catégories */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Thèmes</h3>
        <button
          onClick={() => {
            onSelectCategory(null);
            onSelectArticle(null as any);
          }}
          className={`w-full text-left rounded-md px-3 py-2 text-sm ${
            !selectedCategoryId ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          }`}
        >
          Tous les articles ({articles.length})
        </button>
        {roots.map((root) => {
          const children = childrenByParent.get(root.id) ?? [];
          const expanded = expandedParents.has(root.id);
          return (
            <div key={root.id}>
              <button
                onClick={() => {
                  const ns = new Set(expandedParents);
                  if (ns.has(root.id)) ns.delete(root.id);
                  else ns.add(root.id);
                  setExpandedParents(ns);
                }}
                className="w-full flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-semibold hover:bg-muted"
              >
                {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <div className="h-3 w-1 rounded" style={{ backgroundColor: root.color ?? '#3B82F6' }} />
                {root.name}
                <span className="ml-auto text-xs text-muted-foreground">{children.length}</span>
              </button>
              {expanded && (
                <div className="ml-4 mt-1 space-y-0.5">
                  {children.map((c) => {
                    const count = articles.filter((a) => a.categoryIds.includes(c.id)).length;
                    const active = selectedCategoryId === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          onSelectCategory(c.id);
                          onSelectArticle(null as any);
                        }}
                        className={`w-full flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm ${
                          active
                            ? 'bg-accent/15 text-foreground'
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <div
                          className="h-2 w-1 rounded"
                          style={{ backgroundColor: c.color ?? root.color ?? '#3B82F6' }}
                        />
                        <span className="truncate">{c.name}</span>
                        <span className="ml-auto text-xs">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Liste articles filtrés */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">
          {selectedCategoryId
            ? categories.find((c) => c.id === selectedCategoryId)?.name
            : 'Tous les articles'}{' '}
          <span className="text-xs text-muted-foreground">({filteredArticles.length})</span>
        </h3>
        {filteredArticles.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun article dans cette catégorie pour le moment.</p>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {filteredArticles.map((a) => (
              <button
                key={a.slug}
                onClick={() => onSelectArticle(a)}
                className={`w-full text-left rounded-md border p-3 ${
                  selectedArticle?.slug === a.slug
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <p className="font-medium">{a.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{a.excerpt}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {a.categoryIds.slice(0, 3).map((cid) => {
                    const cat = categories.find((c) => c.id === cid);
                    return cat ? (
                      <span
                        key={cid}
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: (cat.color ?? '#3B82F6') + '20',
                          color: cat.color ?? '#3B82F6',
                        }}
                      >
                        {cat.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </button>
            ))}
          </div>
        )}
        {selectedArticle && (
          <button
            onClick={onNext}
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Suivant : choisir un look
          </button>
        )}
      </div>
    </div>
  );
}
