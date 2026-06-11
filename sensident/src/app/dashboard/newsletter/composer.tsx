'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';
import { ArticleStep } from './composer-article-step';
import { TemplateStep } from './composer-template-step';
import { PreviewStep } from './composer-preview-step';
import { SendStep } from './composer-send-step';
import type { Article, Category, Template, WizardStep } from './composer-types';

interface Props {
  cabinetId: string;
  practitionerId: string;
  cabinetName: string;
  practitionerName: string;
  articles: Article[];
  categories: Category[];
  templates: Template[];
}

const WIZARD_STEPS: WizardStep[] = ['article', 'template', 'preview', 'send'];

/**
 * Orchestrateur du composer newsletter.
 * Wizard 4 étapes : article → template → preview → send.
 * Chaque étape a son propre composant (cf. fichiers composer-*-step.tsx).
 */
export function NewsletterComposer({
  cabinetId,
  practitionerId,
  cabinetName,
  practitionerName,
  articles,
  categories,
  templates,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>('article');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(templates[0]);
  const [customMessage, setCustomMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  if (articles.length === 0) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900 dark:bg-amber-950/30">
        <p className="font-semibold">Aucun article validé dans le catalogue.</p>
        <p className="mt-1 text-xs">
          Pour envoyer une newsletter, il faut qu'un article soit validé par le comité scientifique.
        </p>
      </div>
    );
  }

  const handlePreview = async () => {
    if (!selectedArticle || !selectedTemplate) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/newsletter/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleSlug: selectedArticle.slug,
          templateId: selectedTemplate.id,
          customMessage,
          cabinetName,
          practitionerName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur');
        setSending(false);
        return;
      }
      setPreviewHtml(data.html);
      setSubject(data.subject);
      setStep('preview');
    } catch {
      setError('Erreur réseau.');
    } finally {
      setSending(false);
    }
  };

  const handleSend = async (scheduled: 'now' | 'later', scheduledAt?: Date) => {
    if (!selectedArticle || !selectedTemplate) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabinetId,
          practitionerId,
          articleSlug: selectedArticle.slug,
          templateId: selectedTemplate.id,
          subject: subject || `Service de prévention : ${selectedArticle.title}`,
          customMessage,
          scheduledAt: scheduled === 'later' ? scheduledAt?.toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur');
        setSending(false);
        return;
      }
      router.refresh();
      setStep('article');
      setCustomMessage('');
      setSubject('');
      setPreviewHtml(null);
      setSelectedArticle(null);
      setSelectedCategoryId(null);
      alert(data.message || 'Newsletter planifiée / envoyée.');
    } catch {
      setError('Erreur réseau.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Composer une newsletter
          </h2>
          {step !== 'article' && (
            <button
              onClick={() => setStep('article')}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ↻ Recommencer
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-4">
        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>
        )}

        {step === 'article' && (
          <ArticleStep
            articles={articles}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            selectedArticle={selectedArticle}
            onSelectArticle={setSelectedArticle}
            onNext={() => setStep('template')}
          />
        )}

        {step === 'template' && selectedArticle && (
          <TemplateStep
            article={selectedArticle}
            templates={templates}
            selectedTemplate={selectedTemplate}
            onSelectTemplate={setSelectedTemplate}
            customMessage={customMessage}
            onChangeMessage={setCustomMessage}
            onPreview={handlePreview}
            onBack={() => setStep('article')}
            isLoading={sending}
          />
        )}

        {step === 'preview' && previewHtml && (
          <PreviewStep
            previewHtml={previewHtml}
            subject={subject}
            onChangeSubject={setSubject}
            onBack={() => setStep('template')}
            onNext={() => setStep('send')}
          />
        )}

        {step === 'send' && (
          <SendStep cabinetName={cabinetName} onSend={handleSend} isLoading={sending} />
        )}
      </div>
    </div>
  );
}

// Re-export des types pour les consommateurs
export type { Article, Category, Template, WizardStep } from './composer-types';
