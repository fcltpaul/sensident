'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, Clock, Star } from 'lucide-react';

interface ArticleDetail {
  slug: string;
  title: string;
  excerpt: string;
  categoryCode: string;
  bodyMd: string;
  slidesJson: ArticleSlides;
  readingTimeMin: number;
  isPinned: boolean;
  publishedAt: string | null;
}

type ArticleSlides = Array<{
  title: string;
  body: string;
  takeaway?: string;
}>;

interface Props {
  cabinet: { name: string; slug: string };
  article: ArticleDetail;
  patientEmailHash: string;
  prevSlug: string | null;
  nextSlug: string | null;
}

export function ArticleReader({ cabinet, article, patientEmailHash, prevSlug, nextSlug }: Props) {
  const router = useRouter();
  const [slideIndex, setSlideIndex] = useState(0);
  const [showBody, setShowBody] = useState(false);
  const [reactions, setReactions] = useState({ up: 0, down: 0 });
  const [userReaction, setUserReaction] = useState<string | null>(null);

  const slides = article.slidesJson || [];
  const currentSlide = slides[slideIndex];

  // Load reactions
  useEffect(() => {
    fetchReactions();
  }, []);

  const fetchReactions = async () => {
    try {
      const res = await fetch(`/api/reactions?articleId=${article.slug}&cabinetId=${cabinet.slug}`);
      const data = await res.json();
      if (data.up !== undefined) setReactions({ up: data.up, down: data.down });
    } catch {}
  };

  const handleReaction = async (reaction: 'up' | 'down') => {
    const newReaction = userReaction === reaction ? null : reaction;
    setUserReaction(newReaction);
    // Optimistic update
    setReactions((prev) => ({
      up: prev.up + (newReaction === 'up' ? 1 : userReaction === 'up' ? -1 : 0),
      down: prev.down + (newReaction === 'down' ? 1 : userReaction === 'down' ? -1 : 0),
    }));
    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.slug,
          cabinetId: cabinet.slug,
          patientEmailHash,
          reaction: newReaction,
        }),
      });
      if (!res.ok) fetchReactions(); // Rollback on error
    } catch {
      fetchReactions();
    }
  };

  const renderMarkdown = (md: string) => {
    // Simple markdown rendering (headings, bold, lists)
    return md.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-semibold text-gray-900 mt-6 mb-3">{line.replace('## ', '')}</h2>;
      if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-gray-700 mt-4 mb-2">{line.replace(/\*\*/g, '')}</p>;
      if (line.startsWith('- ')) return <li key={i} className="text-gray-600 ml-4 list-disc text-sm">{line.replace('- ', '')}</li>;
      if (line.trim() === '') return <div key={i} className="h-2" />;
      if (line.startsWith('---')) return <hr key={i} className="my-6 border-gray-200" />;
      return <p key={i} className="text-gray-600 leading-relaxed mb-2">{line}</p>;
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push(`/c/${cabinet.slug}/bibliotheque`)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={16} />
            Retour
          </button>
          <div className="flex items-center gap-3">
            {prevSlug && (
              <button
                onClick={() => router.push(`/c/${cabinet.slug}/bibliotheque/${prevSlug}`)}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Precedent
              </button>
            )}
            {nextSlug && (
              <button
                onClick={() => router.push(`/c/${cabinet.slug}/bibliotheque/${nextSlug}`)}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                Suivant <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Category + badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            {article.categoryCode}
          </span>
          {article.isPinned && (
            <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
              <Star size={10} />
              Recommande
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{article.title}</h1>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-gray-400 mb-8">
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {article.readingTimeMin} min de lecture
          </span>
          <span>Dr. {cabinet.name.split(' ').pop() || cabinet.name}</span>
          {article.publishedAt && (
            <span>
              {new Date(article.publishedAt).toLocaleDateString('fr-FR', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          )}
        </div>

        {/* Slides carousel */}
        {slides.length > 0 && !showBody && (
          <div className="mb-8">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 sm:p-8 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 font-medium">
                  {slideIndex + 1} / {slides.length}
                </span>
              </div>

              {currentSlide && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{currentSlide.title}</h3>
                  <p className="text-gray-600 leading-relaxed text-sm">{currentSlide.body}</p>
                  {currentSlide.takeaway && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium mb-1">A retenir</p>
                      <p className="text-sm text-blue-800">{currentSlide.takeaway}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Slide nav */}
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setSlideIndex(Math.max(0, slideIndex - 1))}
                  disabled={slideIndex === 0}
                  className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft size={16} /> Precedent
                </button>

                <div className="flex items-center gap-1.5">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSlideIndex(i)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === slideIndex ? 'bg-blue-600 w-4' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => setSlideIndex(Math.min(slides.length - 1, slideIndex + 1))}
                  disabled={slideIndex === slides.length - 1}
                  className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Suivant <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="text-center mt-4">
              <button
                onClick={() => setShowBody(true)}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Lire l&apos;article complet
              </button>
            </div>
          </div>
        )}

        {/* Full article body */}
        {showBody && (
          <div className="prose prose-sm max-w-none mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-700">
                Vous avez parcouru les slides plus haut.{' '}
                <button
                  onClick={() => setShowBody(false)}
                  className="underline font-medium"
                >
                  Revoir les slides
                </button>
              </p>
            </div>
            {renderMarkdown(article.bodyMd)}
          </div>
        )}

        {/* Slides to body toggle when body is showing */}
        {!showBody && (
          <div className="prose prose-sm max-w-none mb-8">
            {renderMarkdown(article.bodyMd)}
          </div>
        )}

        {/* Reactions */}
        <div className="border-t border-gray-100 pt-6 mt-8">
          <p className="text-sm text-gray-500 mb-3 text-center">
            Cette information vous a ete utile ?
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => handleReaction('up')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                userReaction === 'up'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <ThumbsUp size={18} />
              <span className="text-sm font-medium">{reactions.up}</span>
            </button>
            <button
              onClick={() => handleReaction('down')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                userReaction === 'down'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <ThumbsDown size={18} />
              <span className="text-sm font-medium">{reactions.down}</span>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-6">
          {prevSlug ? (
            <button
              onClick={() => router.push(`/c/${cabinet.slug}/bibliotheque/${prevSlug}`)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft size={16} /> Article precedent
            </button>
          ) : <div />}
          {nextSlug ? (
            <button
              onClick={() => router.push(`/c/${cabinet.slug}/bibliotheque/${nextSlug}`)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              Article suivant <ChevronRight size={16} />
            </button>
          ) : <div />}
        </div>
      </main>
    </div>
  );
}
