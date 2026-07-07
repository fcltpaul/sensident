'use client';

import { useState } from 'react';
import { Send, Check, Mail, FileText } from 'lucide-react';
import { showToast } from '@/components/toast';

interface ArticleOpt {
  slug: string;
  title: string;
  excerpt: string;
}

interface Props {
  cabinetId: string;
  practitionerId: string;
  cabinetName: string;
  patientHash: string | null;
  patientEmail: string | null;
  patientFound: boolean;
  preselectedArticleSlug: string | null;
  articles: ArticleOpt[];
}

/**
 * Composer single-recipient pour newsletter.
 *
 * Flow :
 *  1. Praticien choisit un article (ou pre-selectionne via query param).
 *  2. Praticien saisit optionnellement un message court.
 *  3. Praticien clique "Envoyer" -> POST /api/newsletter/single-send
 *     -> email d'opt-in envoye via sendConfirmationEmail (magic link).
 *
 * Le patient recoit un lien d'opt-in (double opt-in legal). Quand il
 * confirme, il est redirige vers l'article.
 *
 * Pourquoi single-send et pas /api/library/quick-send :
 *  - quick-send envoie un magic link SANS opt-in confirmation (le patient
 *    est presume deja opt-in). Pour un envoi depuis /engagement, on veut
 *    le meme double opt-in que la newsletter classique pour etre RGPD-safe
 *    et tracer dans email_logs avec le bon kind.
 */
export function SingleRecipientComposer({
  cabinetId,
  practitionerId,
  cabinetName,
  patientHash: initialPatientHash,
  patientEmail: initialPatientEmail,
  patientFound: initialPatientFound,
  preselectedArticleSlug,
  articles,
}: Props) {
  const [patientHash, setPatientHash] = useState(initialPatientHash ?? '');
  const [patientEmail, setPatientEmail] = useState(initialPatientEmail ?? '');
  const [patientFound, setPatientFound] = useState(initialPatientFound);
  const [articleSlug, setArticleSlug] = useState(preselectedArticleSlug ?? '');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend =
    patientHash.trim().length > 0 &&
    patientEmail.trim().length > 0 &&
    articleSlug.trim().length > 0 &&
    !sending &&
    !sent;

  const lookupPatient = async () => {
    if (!patientHash.trim()) return;
    setError(null);
    setPatientFound(false);
    setPatientEmail('');
    try {
      const res = await fetch(`/api/practitioner/lookup-patient?emailHash=${encodeURIComponent(patientHash.trim())}`);
      const r = await res.json();
      if (!res.ok) {
        setError(r.error ?? 'Patient introuvable');
        return;
      }
      setPatientFound(true);
      setPatientEmail(r.email ?? '');
    } catch {
      setError('Erreur reseau.');
    }
  };

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/newsletter/single-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleSlug,
          patientEmailHash: patientHash,
          patientEmail,
          customMessage: customMessage.trim() || null,
        }),
      });
      const r = await res.json();
      if (!res.ok) {
        setError(r.error ?? 'Erreur envoi');
        showToast(r.error ?? 'Erreur envoi', 'error');
        return;
      }
      setSent(true);
      showToast(`Email envoye a ${patientEmail}`, 'success');
    } catch {
      setError('Erreur reseau.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 rounded-lg border border-border bg-background p-6">
      {/* Patient */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">1. Destinataire</h2>
        {initialPatientHash && initialPatientFound ? (
          <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-green-700" />
              <span className="font-medium">{patientEmail}</span>
              <span className="text-xs text-muted-foreground">(precharge depuis engagement)</span>
            </div>
          </div>
        ) : initialPatientHash && !initialPatientFound ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            Aucun patient trouve avec ce hash dans votre cabinet. Verifiez ou cherchez autrement.
          </div>
        ) : null}

        <div className="flex gap-2">
          <input
            type="text"
            value={patientHash}
            onChange={(e) => setPatientHash(e.target.value)}
            placeholder="Email hash du patient (SHA-256)"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          />
          <button
            type="button"
            onClick={lookupPatient}
            disabled={!patientHash.trim()}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            Charger
          </button>
        </div>
      </div>

      {/* Article */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">2. Article a recommander</h2>
        <select
          value={articleSlug}
          onChange={(e) => setArticleSlug(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">— Selectionnez un article —</option>
          {articles.map((a) => (
            <option key={a.slug} value={a.slug}>{a.title}</option>
          ))}
        </select>
        {articleSlug && (
          <p className="text-xs text-muted-foreground">
            {articles.find((a) => a.slug === articleSlug)?.excerpt}
          </p>
        )}
      </div>

      {/* Custom message */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">3. Message personnalisé (optionnel)</h2>
        <textarea
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          placeholder="Ex: Cet article pourrait vous interesser, je vous le recommande."
          rows={3}
          maxLength={500}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <p className="text-[10px] text-muted-foreground">{customMessage.length}/500</p>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}
      {sent && (
        <div className="flex items-center gap-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          <Check className="h-4 w-4" />
          Email envoye. Le patient doit confirmer via le lien pour acceder a l&apos;article.
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Service offert par {cabinetName} &middot; Double opt-in (RGPD)
        </p>
        <button
          onClick={send}
          disabled={!canSend}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {sending ? 'Envoi...' : sent ? 'Envoye' : 'Envoyer'}
        </button>
      </div>
    </div>
  );
}