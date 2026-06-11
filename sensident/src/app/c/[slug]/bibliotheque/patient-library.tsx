'use client';

import { useState, useEffect } from 'react';
import { Search, BookOpen, ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, ExternalLink, Clock, Star, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Category {
  id: string;
  code: string;
  name: string;
  icon: string;
  color: string;
}

interface LibraryArticle {
  slug: string;
  title: string;
  excerpt: string;
  categoryCode: string;
  readingTimeMin: number;
  createdAt: string;
  isPinned: boolean;
  isVisible: boolean;
  publishedAt: string | null;
}

interface Props {
  cabinet: {
    name: string;
    slug: string;
  };
  initialArticles: LibraryArticle[];
  initialCategories: Category[];
}

export function PatientLibrary({ cabinet, initialArticles, initialCategories }: Props) {
  const router = useRouter();
  const [articles, setArticles] = useState<LibraryArticle[]>(initialArticles);
  const [categories] = useState<Category[]>(initialCategories);
  const [activeTab, setActiveTab] = useState<'last' | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [publishedFilter, setPublishedFilter] = useState<'all' | 'sent' | 'unsent'>('all');
  const [search, setSearch] = useState('');
  const [lastNewsletterSlug, setLastNewsletterSlug] = useState<string | null>(null);

  // Find last sent newsletter article
  useEffect(() => {
    const sent = articles.filter(a => a.publishedAt);
    if (sent.length > 0) {
      const sorted = sent.sort((a, b) => new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime());
      setLastNewsletterSlug(sorted[0].slug);
    }
  }, [articles]);

  // Filter articles
  const filtered = articles.filter((a) => {
    if (filterCategory !== 'all' && a.categoryCode !== filterCategory) return false;
    if (publishedFilter === 'sent' && !a.publishedAt) return false;
    if (publishedFilter === 'unsent' && a.publishedAt) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !a.excerpt.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Sort: pinned first, then sent by date, then unsent by internal order
  const sorted = [...filtered].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    if (a.publishedAt && b.publishedAt) return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    if (a.publishedAt && !b.publishedAt) return -1;
    if (!a.publishedAt && b.publishedAt) return 1;
    return 0;
  });

  const lastArticle = lastNewsletterSlug
    ? articles.find((a) => a.slug === lastNewsletterSlug)
    : null;

  const getCategory = (code: string) => categories.find((c) => c.code === code || c.id === code);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-xl font-semibold text-gray-900">
            Cabinet du Dr. {cabinet.name.split(' ').pop() || cabinet.name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Votre espace prevention bucco-dentaire
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        <div className="flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('last')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'last'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Ma derniere newsletter
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Tous mes articles
          </button>
        </div>

        {/* Last newsletter tab */}
        {activeTab === 'last' && (
          <div className="mt-6">
            {lastArticle ? (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6">
                <div className="flex items-center gap-2 text-blue-600 text-sm font-medium mb-3">
                  <BookOpen size={16} />
                  <span>Derniere newsletter</span>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {lastArticle.title}
                </h2>
                {lastArticle.isPinned && (
                  <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full mb-3">
                    <Star size={12} />
                    Recommande
                  </span>
                )}
                <p className="text-sm text-gray-600 mb-4">{lastArticle.excerpt}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={12} />
                    {lastArticle.readingTimeMin} min
                  </span>
                  <button
                    onClick={() => router.push(`/c/${cabinet.slug}/bibliotheque/${lastArticle.slug}`)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Lire la newsletter
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <BookOpen size={48} className="mx-auto mb-3 opacity-50" />
                <p>Aucune newsletter recue pour le moment.</p>
                <p className="text-sm mt-1">Consultez la bibliotheque d&apos;articles ci-dessous.</p>
              </div>
            )}
            <div className="text-center mt-4">
              <button
                onClick={() => setActiveTab('all')}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Voir tous les articles disponibles
              </button>
            </div>
          </div>
        )}

        {/* All articles tab */}
        {activeTab === 'all' && (
          <div className="mt-6">
            {/* Search */}
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un article..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toutes les categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.code || cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>

              <select
                value={publishedFilter}
                onChange={(e) => setPublishedFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous les articles</option>
                <option value="sent">Publies (envoyes)</option>
                <option value="unsent">Non publies</option>
              </select>
            </div>

            {/* Articles grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {sorted.map((article) => {
                const cat = getCategory(article.categoryCode);
                return (
                  <button
                    key={article.slug}
                    onClick={() => router.push(`/c/${cabinet.slug}/bibliotheque/${article.slug}`)}
                    className="text-left bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all group"
                  >
                    {/* Category badge */}
                    <div className="flex items-center gap-2 mb-3">
                      {cat && (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: cat.color + '20', color: cat.color }}
                        >
                          {cat.icon} {cat.name}
                        </span>
                      )}
                      {article.isPinned && (
                        <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                          <Star size={10} />
                          Recommande
                        </span>
                      )}
                    </div>

                    <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                      {article.excerpt}
                    </p>

                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {article.readingTimeMin} min
                      </span>
                      {article.publishedAt && (
                        <span>
                          {new Date(article.publishedAt).toLocaleDateString('fr-FR', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {sorted.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p>Aucun article trouve.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
