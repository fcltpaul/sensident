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
 */
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
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelectTemplate(t)}
            className={`text-left rounded-md border p-4 ${
              selectedTemplate?.id === t.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted/50'
            }`}
          >
            <p className="font-semibold">{t.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
          </button>
        ))}
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
          onClick={onBack}
          className="rounded-md border border-border px-4 py-2 text-sm"
        >
          Précédent
        </button>
        <button
          onClick={onPreview}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Eye className="h-4 w-4" />
          {isLoading ? 'Génération...' : 'Aperçu'}
        </button>
      </div>
    </>
  );
}
