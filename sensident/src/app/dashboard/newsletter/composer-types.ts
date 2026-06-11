// Types partagés par les composants du composer newsletter.

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  category: string;        // legacy
  categoryIds: string[];   // nouvelles catégories
}

export interface Category {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  color: string | null;
}

export interface Template {
  id: string;
  code: string;
  name: string;
  description: string;
}

export type WizardStep = 'article' | 'template' | 'preview' | 'send';
