'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Save, FileText } from 'lucide-react';
import { ArticleStep } from './composer-article-step';
import { TemplateStep } from './composer-template-step';
import { PreviewStep } from './composer-preview-step';
import { SendStep } from './composer-send-step';
import { ComposerStepper } from './composer-stepper';
import { showToast } from '@/components/toast';
import type { Article, Category, Template, WizardStep } from './composer-types';

interface Props {
  cabinetId: string;
  practitionerId: string;
  cabinetName: string;
  practitionerName: string;
  articles: Article[];
  categories: Category[];
  templates: Template[];
  preselectedArticleSlug?: string | null;
}

const WIZARD_STEPS: WizardStep[] = ['article', 'template', 'preview', 'send'];

/**
 * Orchestrateur du composer newsletter.
 * Wizard 4 étapes : article → template → preview → send.
 * Chaque étape a son propre composant (cf. fichiers composer-*-step.tsx).
 *
 * Si `preselectedArticleSlug` est fourni, l'article est pré-sélectionné
 * et l'utilisateur démarre directement à l'étape "template".
 */
export function NewsletterComposer({
  cabinetId,
  practitionerId,
  cabinetName,
  practitionerName,
  articles,
  categories,
  templates,
  preselectedArticleSlug,
}: Props) {
  const router = useRouter();
  const initialArticle = preselectedArticleSlug
    ? articles.find((a) => a.slug === preselectedArticleSlug) ?? null
    : null;
  const [step, setStep] = useState<WizardStep>(initialArticle ? 'template' : 'article');
  const [visited, setVisited] = useState<WizardStep[]>(initialArticle ? ['article', 'template'] : ['article']);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(initialArticle);
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(templates[0]);
  const [customMessage, setCustomMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Sauvegarde automatique du brouillon à chaque étape visitée.
  useEffect(() => {
    let cancelled = false;
    setSavingDraft(true);
    fetch('/api/newsletter/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        draftId,
        articleSlug: selectedArticle?.slug ?? null,
        templateId: selectedTemplate?.id ?? null,
        subject: subject || null,
        customMessage,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.draftId) return;
        setDraftId(data.draftId);
        setLastSavedAt(data.savedAt);
      })
      .catch(() => {
        /* silencieux : sauvegarde tolérante aux erreurs reseau */
      })
      .finally(() => {
        if (!cancelled) setSavingDraft(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedArticle?.slug, selectedTemplate?.id, customMessage, subject, step]);

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
    if (!selectedArticle) {
      setError('Sélectionnez un article avant de générer l\u2019aperçu.');
      return;
    }
    if (!selectedTemplate) {
      setError('Sélectionnez un template avant de générer l\u2019aperçu.');
      return;
    }
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
        setError(data.error || `Erreur API (${res.status}).`);
        setSending(false);
        return;
      }
      if (!data.html) {
        setError('Le serveur a renvoyé un aperçu vide.');
        setSending(false);
        return;
      }
      setPreviewHtml(data.html);
      setSubject(data.subject ?? '');
      setStep('preview');
      setVisited((v) => (v.includes('preview') ? v : [...v, 'preview']));
    } catch (err) {
      setError('Erreur réseau : impossible de contacter le serveur.');
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
      setVisited(['article']);
      setCustomMessage('');
      setSubject('');
      setPreviewHtml(null);
      setSelectedArticle(null);
      setSelectedCategoryId(null);
      setDraftId(null);
      setLastSavedAt(null);
      showToast(data.message || 'Newsletter planifiée / envoyée.', 'success');
    } catch {
      setError('Erreur réseau.');
      showToast('Erreur réseau, réessayez.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="border-b border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Composer une newsletter
          </h2>
          <div className="flex items-center gap-3 text-xs">
            {savingDraft ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Save className="h-3.5 w-3.5 animate-pulse" />
                Sauvegarde du brouillon…
              </span>
            ) : lastSavedAt ? (
              <span className="text-muted-foreground">
                Brouillon sauvegardé{' '}
                {new Date(lastSavedAt).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            ) : null}
            <Link
              href="/dashboard/newsletter/drafts"
              className="inline-flex items-center gap-1 text-blue-700 hover:underline"
            >
              <FileText className="h-3.5 w-3.5" />
              Mes brouillons
            </Link>
            {step !== 'article' && (
              <button
                onClick={() => {
                  setStep('article');
                  setVisited(['article']);
                  setSelectedArticle(null);
                  setSelectedCategoryId(null);
                  setSubject('');
                  setCustomMessage('');
                  setPreviewHtml(null);
                  setDraftId(null);
                  setLastSavedAt(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                ↻ Recommencer
              </button>
            )}
          </div>
        </div>
        <div className="mt-4">
          <ComposerStepper
            current={step}
            onJump={(s) => setStep(s)}
            visited={visited}
          />
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
            onNext={() => {
              setVisited((v) => (v.includes('template') ? v : [...v, 'template']));
              setStep('template');
            }}
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
            onNext={() => {
              setVisited((v) => (v.includes('send') ? v : [...v, 'send']));
              setStep('send');
            }}
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
