'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Eye, Send, Save, X, ChevronDown, ChevronRight } from 'lucide-react';

interface Article {
  slug: string;
  title: string;
  excerpt: string;
  category: string;        // legacy
  categoryIds: string[];   // nouvelles categories
}

interface Category {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  color: string | null;
}

interface Props {
  cabinetId: string;
  practitionerId: string;
  cabinetName: string;
  practitionerName: string;
  articles: Article[];
  categories: Category[];
  templates: Array<{ id: string; code: string; name: string; description: string }>;
}

const WIZARD_STEPS = ['article', 'template', 'preview', 'send'] as const;

export function NewsletterComposer({ cabinetId, practitionerId, cabinetName, practitionerName, articles, categories, templates }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<typeof WIZARD_STEPS[number]>('article');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  const [customMessage, setCustomMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  // Hierarchie des categories
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

  // Articles filtres par categorie
  const filteredArticles = useMemo(() => {
    if (!selectedCategoryId) return articles;
    return articles.filter((a) => a.categoryIds.includes(selectedCategoryId));
  }, [articles, selectedCategoryId]);

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
      setError('Erreur reseau.');
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
          subject: subject || `Service de prevention : ${selectedArticle.title}`,
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
      setError('Erreur reseau.');
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
            <button onClick={() => setStep('article')} className="text-sm text-muted-foreground hover:text-foreground">
              ← Recommencer
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-4">
        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>
        )}

        {step === 'article' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
            {/* Sidebar categories */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Themes</h3>
              <button
                onClick={() => { setSelectedCategoryId(null); setSelectedArticle(null); }}
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
                              onClick={() => { setSelectedCategoryId(c.id); setSelectedArticle(null); }}
                              className={`w-full flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm ${
                                active ? 'bg-accent/15 text-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              <div className="h-2 w-1 rounded" style={{ backgroundColor: c.color ?? root.color ?? '#3B82F6' }} />
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

            {/* Liste articles filtres */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">
                {selectedCategoryId
                  ? categories.find((c) => c.id === selectedCategoryId)?.name
                  : 'Tous les articles'}
                {' '}
                <span className="text-xs text-muted-foreground">({filteredArticles.length})</span>
              </h3>
              {filteredArticles.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun article dans cette categorie pour le moment.</p>
              ) : (
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {filteredArticles.map((a) => (
                    <button
                      key={a.slug}
                      onClick={() => setSelectedArticle(a)}
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
                  onClick={() => setStep('template')}
                  className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Suivant : choisir un look
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'template' && (
          <>
            <p className="text-sm">Article selectionne : <strong>{selectedArticle?.title}</strong></p>
            <p className="text-sm">Choisissez le rendu visuel :</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
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
              <label className="block text-sm font-medium">Message personnalise (200 char max)</label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                maxLength={200}
                rows={2}
                placeholder="Un petit mot de votre part, en plus de l'article..."
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep('article')} className="rounded-md border border-border px-4 py-2 text-sm">
                Precedent
              </button>
              <button
                onClick={handlePreview}
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                <Eye className="h-4 w-4" />
                {sending ? 'Generation...' : 'Apercu'}
              </button>
            </div>
          </>
        )}

        {step === 'preview' && previewHtml && (
          <>
            <div>
              <label className="block text-sm font-medium">Sujet de l'email</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="rounded-md border border-border bg-white">
              <iframe srcDoc={previewHtml} className="h-96 w-full rounded-md" title="Apercu" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep('template')} className="rounded-md border border-border px-4 py-2 text-sm">
                Precedent
              </button>
              <button
                onClick={() => setStep('send')}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Continuer : envoi
              </button>
            </div>
          </>
        )}

        {step === 'send' && (
          <>
            <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
              <p>
                Vous allez envoyer cette newsletter a tous vos patients actifs opt-in.
                Aucun email nominatif ne part.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Wording type : "Service de prevention offert par {cabinetName}"
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleSend('now')}
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Envoi...' : 'Envoyer immediatement'}
              </button>
              <ScheduleDialog onSchedule={(date) => handleSend('later', date)} disabled={sending} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Step({ n, label, current }: { n: number; label: string; current: typeof WIZARD_STEPS[number] }) {
  const order: Record<typeof WIZARD_STEPS[number], number> = { article: 1, template: 2, preview: 3, send: 4 };
  const isActive = order[current] >= n;
  return <span className={isActive ? 'font-semibold text-foreground' : ''}>{n}. {label}</span>;
}

function ScheduleDialog({ onSchedule, disabled }: { onSchedule: (d: Date) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
      >
        Planifier...
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-background p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Planifier l'envoi</h3>
              <button onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium">Date et heure</label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-md border border-border px-3 py-1.5 text-sm">Annuler</button>
              <button
                onClick={() => {
                  if (!date) return alert('Choisissez une date.');
                  onSchedule(new Date(date));
                  setOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
              >
                <Save className="h-4 w-4" />
                Planifier
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
