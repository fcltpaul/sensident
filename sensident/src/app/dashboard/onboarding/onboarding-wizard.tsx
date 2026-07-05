'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Palette,
  Users,
  Mail,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
} from 'lucide-react';
import { useInviteModal } from '@/components/dashboard/invite-modal-context';

interface SuggestedArticle {
  slug: string;
  title: string;
  excerpt: string;
  categoryCode: string;
  readingTimeMin: number;
}

interface Branding {
  logoUrl?: string;
  accentColor?: string;
  signature?: string;
  showLogo?: boolean;
}

const ACCENT_PRESETS: Array<{ label: string; value: string }> = [
  { label: 'Bleu confiance', value: '#2563eb' },
  { label: 'Vert santé', value: '#059669' },
  { label: 'Orange chaleureux', value: '#ea580c' },
  { label: 'Violet moderne', value: '#7c3aed' },
];

export function OnboardingWizard() {
  const router = useRouter();
  const invite = useInviteModal();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [savingBranding, setSavingBranding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyDone, setAlreadyDone] = useState(false);

  // Si l'onboarding est déjà terminé, on évite de re-afficher le wizard.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/practitioner/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.onboardingCompleted) {
          setAlreadyDone(true);
          router.replace('/dashboard');
        }
      })
      .catch(() => {
        /* silencieux */
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (alreadyDone) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <p className="text-sm text-muted-foreground">Redirection…</p>
      </div>
    );
  }

  // Step 1 state — branding
  const [accentColor, setAccentColor] = useState<string>('#2563eb');
  const [signature, setSignature] = useState<string>('');
  const [brandingLoaded, setBrandingLoaded] = useState(false);

  // Step 3 state — suggested articles
  const [articles, setArticles] = useState<SuggestedArticle[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // Charge le branding actuel à l'étape 1
  useEffect(() => {
    if (step !== 1 || brandingLoaded) return;
    let cancelled = false;
    fetch('/api/practitioner/newsletter-branding', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (typeof data.accentColor === 'string') setAccentColor(data.accentColor);
        if (typeof data.signature === 'string') setSignature(data.signature);
        setBrandingLoaded(true);
      })
      .catch(() => setBrandingLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [step, brandingLoaded]);

  // Charge 3 articles suggérés à l'étape 3
  useEffect(() => {
    if (step !== 3) return;
    let cancelled = false;
    setArticlesLoading(true);
    fetch('/api/library/suggestions', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !Array.isArray(data?.articles)) return;
        setArticles(data.articles.slice(0, 3));
      })
      .catch(() => {
        // silencieux : l'utilisateur peut skip l'étape
      })
      .finally(() => {
        if (!cancelled) setArticlesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [step]);

  const saveBranding = async () => {
    setSavingBranding(true);
    setError(null);
    try {
      const res = await fetch('/api/practitioner/newsletter-branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accentColor,
          signature,
          showLogo: false,
        }),
      });
      if (!res.ok) {
        setError('Impossible d\'enregistrer la personnalisation.');
        return false;
      }
      return true;
    } catch {
      setError('Erreur réseau.');
      return false;
    } finally {
      setSavingBranding(false);
    }
  };

  const goToStep2 = async () => {
    await saveBranding();
    setStep(2);
  };

  const finish = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/practitioner/complete-onboarding', { method: 'POST' });
      if (!res.ok) {
        setError('Impossible de finaliser la configuration.');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Erreur réseau.');
    } finally {
      setSubmitting(false);
    }
  };

  const skipAll = async () => {
    if (!confirm('Passer la configuration ? Vous pourrez tout configurer plus tard depuis Mon compte.')) {
      return;
    }
    await finish();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-8">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="h-6 w-6 text-primary" />
          Configurons votre cabinet
        </h1>
        <p className="text-sm text-muted-foreground">
          3 étapes rapides pour démarrer. Vous pouvez passer à tout moment.
        </p>
      </header>

      <Stepper step={step} />

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {step === 1 && (
        <Step1Branding
          accentColor={accentColor}
          setAccentColor={setAccentColor}
          signature={signature}
          setSignature={setSignature}
        />
      )}

      {step === 2 && <Step2Invite onOpenModal={() => invite.open()} />}

      {step === 3 && (
        <Step3Article
          articles={articles}
          loading={articlesLoading}
          selectedSlug={selectedSlug}
          setSelectedSlug={setSelectedSlug}
        />
      )}

      <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <button
          type="button"
          onClick={() => (step === 1 ? skipAll() : setStep((s) => (s === 3 ? 2 : 1)))}
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          {step === 1 ? 'Passer la configuration' : '← Étape précédente'}
        </button>

        <div className="flex items-center gap-2">
          {step === 1 && (
            <button
              type="button"
              onClick={goToStep2}
              disabled={savingBranding}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-95 disabled:opacity-60"
            >
              {savingBranding ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Continuer
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-95"
            >
              Continuer
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              onClick={finish}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-95 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Terminer
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const items = [
    { id: 1, label: 'Personnalisation', icon: Palette },
    { id: 2, label: 'Invitations', icon: Users },
    { id: 3, label: 'Première newsletter', icon: Mail },
  ] as const;

  return (
    <ol className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
      {items.map((it, idx) => {
        const active = step === it.id;
        const done = step > it.id;
        const Icon = it.icon;
        return (
          <li key={it.id} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                done
                  ? 'border-primary bg-primary text-primary-foreground'
                  : active
                  ? 'border-primary text-primary'
                  : 'border-border text-muted-foreground'
              }`}
              aria-current={active ? 'step' : undefined}
            >
              {done ? <Check className="h-4 w-4" /> : it.id}
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className={`truncate text-xs ${active ? 'font-semibold' : 'text-muted-foreground'}`}>
                {it.label}
              </p>
            </div>
            {idx < items.length - 1 && (
              <div className="mx-1 h-px flex-1 bg-border" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Step1Branding({
  accentColor,
  setAccentColor,
  signature,
  setSignature,
}: {
  accentColor: string;
  setAccentColor: (v: string) => void;
  signature: string;
  setSignature: (v: string) => void;
}) {
  return (
    <section className="space-y-5 rounded-lg border border-border bg-background p-6">
      <div>
        <h2 className="text-base font-semibold">Personnalisez vos newsletters</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Couleur d'accent et signature email. Vous pourrez ajouter un logo plus tard depuis Mon compte.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium">Couleur d'accent</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ACCENT_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setAccentColor(p.value)}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                accentColor === p.value
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-background hover:bg-muted'
              }`}
              aria-pressed={accentColor === p.value}
            >
              <span
                className="h-4 w-4 shrink-0 rounded-full border border-border"
                style={{ backgroundColor: p.value }}
                aria-hidden="true"
              />
              <span className="truncate">{p.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Couleur actuelle : <span className="font-mono">{accentColor}</span>
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="signature" className="text-xs font-medium">
          Signature email (optionnel)
        </label>
        <textarea
          id="signature"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          rows={3}
          maxLength={400}
          placeholder="Dr Dupont — Chirurgien-dentiste à Nantes"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground">
          Affichée en bas de chaque newsletter. 400 caractères max.
        </p>
      </div>
    </section>
  );
}

function Step2Invite({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <section className="space-y-5 rounded-lg border border-border bg-background p-6">
      <div>
        <h2 className="text-base font-semibold">Invitez vos premiers patients</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Générez un lien ou un QR code à afficher au fauteuil. Le patient scanne ou clique et rejoint votre
          programme en 30 secondes.
        </p>
      </div>

      <div className="rounded-md border border-dashed border-border bg-muted/30 p-5 text-center">
        <p className="text-sm">
          Vous pouvez le faire maintenant, ou plus tard depuis le bouton{' '}
          <span className="font-mono text-xs">Inviter</span> en haut de votre tableau de bord.
        </p>
        <button
          type="button"
          onClick={onOpenModal}
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95"
        >
          <Users className="h-4 w-4" />
          Ouvrir l'outil d'invitation
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        💡 Astuce : imprimez le QR code sur un flyer et déposez-le en salle d'attente.
      </p>
    </section>
  );
}

function Step3Article({
  articles,
  loading,
  selectedSlug,
  setSelectedSlug,
}: {
  articles: SuggestedArticle[];
  loading: boolean;
  selectedSlug: string | null;
  setSelectedSlug: (s: string | null) => void;
}) {
  if (loading) {
    return (
      <section className="rounded-lg border border-border bg-background p-6">
        <p className="text-sm text-muted-foreground">Chargement des suggestions…</p>
      </section>
    );
  }

  if (articles.length === 0) {
    return (
      <section className="space-y-3 rounded-lg border border-border bg-background p-6">
        <h2 className="text-base font-semibold">Première newsletter</h2>
        <p className="text-sm text-muted-foreground">
          Aucune suggestion disponible pour le moment. Vous pourrez choisir un article depuis{' '}
          <Link href="/dashboard/library" className="underline">
            Bibliothèque
          </Link>{' '}
          une fois la configuration terminée.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-background p-6">
      <div>
        <h2 className="text-base font-semibold">Choisissez votre premier article</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sélectionnez un article. Vous pourrez le personnaliser avant envoi à l'étape suivante.
        </p>
      </div>

      <ul className="space-y-2">
        {articles.map((a) => (
          <li key={a.slug}>
            <button
              type="button"
              onClick={() => setSelectedSlug(a.slug === selectedSlug ? null : a.slug)}
              className={`flex w-full items-start gap-3 rounded-md border p-4 text-left transition-colors ${
                selectedSlug === a.slug
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background hover:bg-muted'
              }`}
              aria-pressed={selectedSlug === a.slug}
            >
              <div
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  selectedSlug === a.slug ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                }`}
                aria-hidden="true"
              >
                {selectedSlug === a.slug && <Check className="h-3 w-3" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{a.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{a.excerpt}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {a.categoryCode} · {a.readingTimeMin} min
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {selectedSlug && (
        <Link
          href={`/dashboard/newsletter/compose?article=${selectedSlug}`}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          Aperçu dans le composer →
        </Link>
      )}
    </section>
  );
}