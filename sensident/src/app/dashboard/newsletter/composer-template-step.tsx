'use client';

import { Eye } from 'lucide-react';
import type { Article, Template } from './composer-types';

interface Props {
  article: Article;
  templates: Template[];
  selectedTemplate: Template;
  onSelectTemplate: (t: Template) => void;
  customMessage: string;
  onChangeMessage: (s: string) => void;
  onPreview: () => void;
  onBack: () => void;
  isLoading: boolean;
}

/**
 * Étape 2 : choix du look (template HTML) + message personnalisé.
 * Déclenche handlePreview() qui appelle /api/newsletter/preview.
 *
 * Fix 2026-07-07 10h50 :
 *  - Aperçu visuel inline de chaque template (mockup simplifié : couleur
 *    d'accent + ratio slides + caractère) pour que le praticien puisse
 *    comparer les rendus avant de choisir.
 *  - Bouton "Aperçu" demontre le rendu reel via iframe (handlePreview).
 */

// Description visuelle (couleur + ratio) pour les templates connus.
// Couleur hexa base sur les defauts Drizzle du seed.
const TEMPLATE_VISUALS: Record<string, {
  accent: string;
  bg: string;
  ratio: 'compact' | 'spacious';
  font: 'sans' | 'serif';
  slides: number;
  description: string;
}> = {
  moderne: {
    accent: '#3B82F6',
    bg: '#EFF6FF',
    ratio: 'spacious',
    font: 'sans',
    slides: 5,
    description: 'Moderne, epure, professionnel',
  },
  chaleureux: {
    accent: '#F59E0B',
    bg: '#FFFBEB',
    ratio: 'compact',
    font: 'serif',
    slides: 5,
    description: 'Chaleureux, humain, proche du patient',
  },
  classique: {
    accent: '#1F2937',
    bg: '#F9FAFB',
    ratio: 'spacious',
    font: 'serif',
    slides: 5,
    description: 'Classique, sobre, tous publics',
  },
  epure: {
    accent: '#10B981',
    bg: '#ECFDF5',
    ratio: 'compact',
    font: 'sans',
    slides: 3,
    description: 'Minimaliste, direct, lecture rapide',
  },
  premium: {
    accent: '#8B5CF6',
    bg: '#F5F3FF',
    ratio: 'spacious',
    font: 'sans',
    slides: 5,
    description: 'Premium, premium cabinet haut de gamme',
  },
};

function getVisual(code: string) {
  return TEMPLATE_VISUALS[code] ?? {
    accent: '#3B82F6',
    bg: '#EFF6FF',
    ratio: 'spacious' as const,
    font: 'sans' as const,
    slides: 5,
    description: '',
  };
}

function TemplateMockup({ code }: { code: string }) {
  const v = getVisual(code);
  // Mini maquette d'un email : 5 barres de contenu stackees
  const bars = Array.from({ length: v.slides }, (_, i) => i);
  return (
    <div
      className="relative h-32 overflow-hidden rounded-md border"
      style={{ backgroundColor: v.bg, borderColor: v.accent + '40' }}
    >
      {/* Header simule */}
      <div
        className="h-6 w-full"
        style={{ backgroundColor: v.accent }}
      />
      {/* Contenu simule : barres espacees */}
      <div className={`flex flex-col gap-1.5 p-2 ${v.ratio === 'spacious' ? 'gap-2' : 'gap-1'}`}>
        {bars.map((i) => (
          <div
            key={i}
            className="h-2 rounded-full"
            style={{
              backgroundColor: v.accent + (i === 0 ? '60' : i === bars.length - 1 ? '40' : '25'),
              width: i === 0 ? '70%' : i === bars.length - 1 ? '40%' : '85%',
            }}
          />
        ))}
      </div>
      {/* Footer simule */}
      <div className="absolute bottom-0 left-0 right-0 h-3 bg-black/5" />
    </div>
  );
}

export function TemplateStep({
  article,
  templates,
  selectedTemplate,
  onSelectTemplate,
  customMessage,
  onChangeMessage,
  onPreview,
  onBack,
  isLoading,
}: Props) {
  return (
    <>
      <p className="text-sm">
        Article sélectionné : <strong>{article.title}</strong>
      </p>
      <p className="text-sm">Choisissez le rendu visuel :</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {templates.map((t) => {
          const v = getVisual(t.code);
          const isSelected = selectedTemplate?.id === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTemplate(t)}
              className={`text-left rounded-md border p-3 transition-colors ${
                isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                  : 'border-border hover:bg-muted/50'
              }`}
              aria-pressed={isSelected}
            >
              <TemplateMockup code={t.code} />
              <div className="mt-2 flex items-center justify-between">
                <p className="font-semibold">{t.name}</p>
                <span
                  className="inline-flex h-5 w-5 rounded-full border"
                  style={{ backgroundColor: v.accent }}
                  aria-label={`couleur accent ${v.accent}`}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{v.description}</p>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>{v.slides} slides</span>
                <span>·</span>
                <span>{v.font === 'serif' ? 'Serif' : 'Sans-serif'}</span>
                <span>·</span>
                <span>{v.ratio === 'spacious' ? 'Aéré' : 'Compact'}</span>
              </div>
            </button>
          );
        })}
      </div>
      <div>
        <label className="block text-sm font-medium">Message personnalisé (200 char max)</label>
        <textarea
          value={customMessage}
          onChange={(e) => onChangeMessage(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="Un petit mot de votre part, en plus de l'article..."
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-border px-4 py-2 text-sm"
        >
          Précédent
        </button>
        <button
          type="button"
          onClick={onPreview}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <Eye className="h-4 w-4" />
          {isLoading ? 'Génération...' : 'Aperçu'}
        </button>
      </div>
    </>
  );
}