'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Plus, Trash2 } from 'lucide-react';

interface Slide {
  title: string;
  body: string;
  visual?: string;
  takeaway?: string;
}

interface ArticleData {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  bodyMd: string;
  slidesJson: Slide[];
  readingTimeMin: number;
  status: 'draft' | 'validated' | 'archived';
}

interface Props {
  article?: ArticleData;
}

const CATEGORIES = ['hygiene', 'prevention', 'patho', 'enfant', 'orthodontie', 'esthetique', 'nutrition'];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export function ArticleEditor({ article }: Props) {
  const router = useRouter();
  const isNew = !article;

  const [title, setTitle] = useState(article?.title ?? '');
  const [slug, setSlug] = useState(article?.slug ?? '');
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? '');
  const [category, setCategory] = useState(article?.category ?? 'hygiene');
  const [readingTimeMin, setReadingTimeMin] = useState(article?.readingTimeMin ?? 3);
  const [bodyMd, setBodyMd] = useState(article?.bodyMd ?? '');
  const [slides, setSlides] = useState<Slide[]>(
    article?.slidesJson ?? [
      { title: '', body: '', visual: '', takeaway: '' },
      { title: '', body: '', visual: '', takeaway: '' },
      { title: '', body: '', visual: '', takeaway: '' },
      { title: '', body: '', visual: '', takeaway: '' },
      { title: '', body: '', visual: '', takeaway: '' },
    ]
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleTitleChange = (v: string) => {
    setTitle(v);
    if (isNew) setSlug(slugify(v));
  };

  const save = async (submitStatus: 'draft' | 'validated' = 'draft') => {
    setError(null);
    setSaving(true);
    try {
      const payload = {
        slug,
        title,
        excerpt,
        category,
        bodyMd,
        readingTimeMin,
        slidesJson: slides.filter((s) => s.title && s.body),
        status: submitStatus,
      };

      const url = isNew ? '/api/admin/articles' : `/api/admin/articles/${article!.slug}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur');
        setSaving(false);
        return;
      }
      router.push('/admin/articles');
      router.refresh();
    } catch (e) {
      setError('Erreur reseau.');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}

      <div className="rounded-lg border border-border bg-background p-6 space-y-4">
        <h2 className="text-sm font-semibold">Métadonnées</h2>

        <div>
          <label className="block text-sm font-medium">Titre</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="Brossage des dents : la méthode BASS, en 5 slides"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Slug (URL)</label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
            />
            <p className="mt-1 text-xs text-muted-foreground">Visile dans /articles/{slug}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Catégorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Extrait (200 char max)</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            maxLength={200}
            rows={2}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="Affiché en preview et en intro de newsletter."
          />
          <p className="mt-1 text-xs text-muted-foreground">{excerpt.length} / 200</p>
        </div>

        <div>
          <label className="block text-sm font-medium">Temps de lecture estimé (min)</label>
          <input
            type="number"
            min={1}
            max={30}
            value={readingTimeMin}
            onChange={(e) => setReadingTimeMin(Number(e.target.value))}
            className="mt-1 w-32 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background p-6 space-y-4">
        <h2 className="text-sm font-semibold">5 slides (format newsletter)</h2>
        <p className="text-xs text-muted-foreground">Chaque slide = 1 écran mobile-first scannable. Le patient swipe ou clique "Suivant".</p>

        {slides.map((slide, i) => (
          <div key={i} className="rounded-md border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Slide {i + 1} / 5</span>
              {slides.length > 3 && (
                <button
                  type="button"
                  onClick={() => setSlides(slides.filter((_, j) => j !== i))}
                  className="text-xs text-red-600 hover:underline"
                >
                  <Trash2 className="inline h-3 w-3" /> Retirer
                </button>
              )}
            </div>
            <input
              type="text"
              value={slide.title}
              onChange={(e) => {
                const ns = [...slides];
                ns[i] = { ...ns[i], title: e.target.value };
                setSlides(ns);
              }}
              placeholder="Titre de la slide"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <textarea
              value={slide.body}
              onChange={(e) => {
                const ns = [...slides];
                ns[i] = { ...ns[i], body: e.target.value };
                setSlides(ns);
              }}
              placeholder="Corps de la slide (court, 2-3 phrases)"
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={slide.takeaway ?? ''}
              onChange={(e) => {
                const ns = [...slides];
                ns[i] = { ...ns[i], takeaway: e.target.value };
                setSlides(ns);
              }}
              placeholder="💡 À retenir (1 phrase)"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={slide.visual ?? ''}
              onChange={(e) => {
                const ns = [...slides];
                ns[i] = { ...ns[i], visual: e.target.value };
                setSlides(ns);
              }}
              placeholder="Description du visuel (ex: Schéma gencive + dent + brosse 45°)"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs"
            />
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-background p-6 space-y-4">
        <h2 className="text-sm font-semibold">Article long (Markdown)</h2>
        <p className="text-xs text-muted-foreground">Format long, affiché sur le site pour les patients qui veulent creuser.</p>
        <textarea
          value={bodyMd}
          onChange={(e) => setBodyMd(e.target.value)}
          rows={20}
          className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
          placeholder="# Titre H1&#10;&#10;## Section H2&#10;&#10;Contenu en Markdown..."
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => save('draft')}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> Enregistrer en brouillon
        </button>
        {article?.status !== 'validated' && (
          <button
            onClick={() => save('validated')}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            ✓ Valider et publier
          </button>
        )}
      </div>
    </div>
  );
}
