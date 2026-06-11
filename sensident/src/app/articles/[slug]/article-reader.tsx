'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Slide {
  title: string;
  body: string;
  visual?: string;
  takeaway?: string;
}

interface Props {
  article: {
    slug: string;
    title: string;
    excerpt: string;
    bodyMd: string;
    slidesJson: Slide[];
    readingTimeMin: number;
    category: string;
  };
  sessionId: string;
  source: 'newsletter' | 'site' | 'direct';
  cabinetId: string | null;
}

export function ArticleReader({ article, sessionId, source, cabinetId }: Props) {
  const [mode, setMode] = useState<'slides' | 'long'>('slides');
  const [slideIndex, setSlideIndex] = useState(0);

  // Refs pour valeurs mutables dans l'intervalle heartbeat
  const slideRef = useRef(slideIndex);
  const modeRef = useRef(mode);
  const maxSlideRef = useRef(0);
  const maxScrollRef = useRef(0);
  const lastVisibleRef = useRef(typeof document === 'undefined' ? true : !document.hidden);
  const startTsRef = useRef(Date.now());

  // Synchro des refs
  slideRef.current = slideIndex;
  modeRef.current = mode;

  // ============================================
  // T1 — JS Heartbeat toutes les 15s
  // ============================================
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const startTs = startTsRef.current;

    // Heartbeat 15s
    const heartbeat = setInterval(async () => {
      if (!lastVisibleRef.current) return;

      const now = Date.now();
      const duration = Math.floor((now - startTs) / 1000);
      const currentSlide = slideRef.current;
      const currentMode = modeRef.current;

      const scrollPct = currentMode === 'slides'
        ? Math.round((currentSlide + 1) / article.slidesJson.length * 100)
        : maxScrollRef.current;

      const slideNum = currentMode === 'slides' ? currentSlide + 1 : null;

      maxSlideRef.current = Math.max(maxSlideRef.current, slideNum ?? 0);
      maxScrollRef.current = Math.max(maxScrollRef.current, scrollPct);

      try {
        await fetch('/api/track/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            articleSlug: article.slug,
            source,
            cabinetId,
            scrollPct,
            tabVisible: lastVisibleRef.current,
            slideIndex: slideNum,
            duration,
          }),
        });
      } catch {
        // Silencieux
      }
    }, 15000);

    // Visibilité onglet
    const onVisChange = () => { lastVisibleRef.current = !document.hidden; };
    document.addEventListener('visibilitychange', onVisChange);

    // Scroll tracking (mode long)
    const onScroll = () => {
      if (modeRef.current !== 'long') return;
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const max = h.scrollHeight - h.clientHeight;
      const pct = max > 0 ? Math.min(100, Math.round((scrolled / max) * 100)) : 0;
      maxScrollRef.current = Math.max(maxScrollRef.current, pct);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // Fin de session via sendBeacon
    const onUnload = () => {
      const duration = Math.floor((Date.now() - startTs) / 1000);
      const done = modeRef.current === 'slides'
        ? slideRef.current + 1 >= article.slidesJson.length
        : maxScrollRef.current >= 90;

      navigator.sendBeacon('/api/track/end', JSON.stringify({
        sessionId,
        articleSlug: article.slug,
        source,
        cabinetId,
        duration,
        maxScroll: maxScrollRef.current,
        maxSlide: maxSlideRef.current,
        completed: done,
      }));
    };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [article.slug, article.slidesJson.length, sessionId, source, cabinetId]); // plus de slideIndex/mode

  // ============================================
  // Rendu
  // ============================================
  if (mode === 'slides') {
    const slide = article.slidesJson[slideIndex];
    if (!slide) {
      setMode('long');
      return null;
    }

    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {article.category} · {article.readingTimeMin} min
          </p>
          <h1 className="mt-1 text-2xl font-bold">{article.title}</h1>
        </div>

        <div className="aspect-square w-full rounded-lg border border-border bg-muted/30 p-6 flex flex-col justify-center text-center">
          <h2 className="text-2xl font-bold leading-tight">{slide.title}</h2>
          <p className="mt-4 text-base leading-relaxed">{slide.body}</p>
          {slide.takeaway && (
            <p className="mt-6 rounded-md bg-accent/10 px-3 py-2 text-sm font-medium text-accent">
              💡 {slide.takeaway}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => setSlideIndex(Math.max(0, slideIndex - 1))}
            disabled={slideIndex === 0}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" /> Précédent
          </button>
          <span className="text-xs text-muted-foreground">
            {slideIndex + 1} / {article.slidesJson.length}
          </span>
          {slideIndex < article.slidesJson.length - 1 ? (
            <button
              onClick={() => setSlideIndex(slideIndex + 1)}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
            >
              Suivant <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => setMode('long')}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
            >
              Lire l&apos;article complet
            </button>
          )}
        </div>
      </div>
    );
  }

  // Mode long
  return (
    <div className="space-y-6">
      <button onClick={() => setMode('slides')} className="text-sm text-muted-foreground hover:text-foreground">
        ← Retour aux slides
      </button>
      <article className="prose prose-slate max-w-none">
        <h1>{article.title}</h1>
        <p className="text-muted-foreground">{article.excerpt}</p>
        <pre className="whitespace-pre-wrap text-sm leading-relaxed">{article.bodyMd}</pre>
      </article>
    </div>
  );
}
