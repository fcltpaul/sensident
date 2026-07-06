'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Props {
  cabinetId: string;
  cabinetName: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TRUST_LINES: Array<{ icon: string; text: string }> = [
  { icon: '🔒', text: 'Vos données restent entre vous et votre dentiste' },
  { icon: '📧', text: 'Vous pouvez vous désinscrire en 1 clic à tout moment' },
  { icon: '🇫🇷', text: 'Service conforme RGPD et hébergement données de santé (HDS)' },
  { icon: '🚫', text: 'Aucune publicité, aucun partage avec des tiers' },
];

function extractFirstNameFromCabinet(name: string): string {
  // "Cabinet du Dr Dupont" -> "Dr Dupont"
  // "Dr Jean Martin" -> "Dr Martin"
  return name.replace(/^Cabinet (du |de la |de l'|des )?/i, '').trim();
}

export function SignupForm({ cabinetId, cabinetName }: Props) {
  const router = useRouter();
  const emailInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [cguAccepted, setCguAccepted] = useState(false);
  const [newsletterOptin, setNewsletterOptin] = useState(false);
  // RGPD : consentement granulaire 3 finalités (analytics + reactions optionnels)
  const [analyticsOptin, setAnalyticsOptin] = useState(false);
  const [reactionsOptin, setReactionsOptin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  // Auto-focus champ email au mount
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  const emailValid = useMemo(() => EMAIL_REGEX.test(email.trim()), [email]);
  const canSubmitStep1 = emailValid && cguAccepted && !loading;

  const praticienLabel = extractFirstNameFromCabinet(cabinetName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!cguAccepted) {
      setError('Vous devez accepter les CGU pour continuer.');
      return;
    }
    if (!emailValid) {
      setError('Adresse email invalide.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/patient/optin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabinetId,
          email,
          firstName: firstName || undefined,
          birthYear: birthYear || undefined,
          cguAccepted,
          newsletterOptin,
          // RGPD 3 finalités granular : analytics et reactions separes
          analyticsOptin,
          reactionsOptin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur inconnue');
        setLoading(false);
        return;
      }
      setDone(true);
    } catch (err) {
      setError('Erreur réseau. Réessaie.');
    } finally {
      setLoading(false);
    }
  };

  // ---- Écran de succès émotionnel ----
  if (done) {
    return (
      <div className="space-y-6 rounded-lg border border-green-200 bg-green-50/60 p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 13l4 4L19 7" className="animate-[draw_500ms_ease-out_forwards]" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-semibold text-green-900">Bienvenue !</p>
          <p className="mt-1 text-sm text-green-800">
            On vous a envoyé un email à <strong>{email}</strong>. Cliquez sur le lien pour
            activer votre espace patient.
          </p>
        </div>
        <div className="rounded-md border border-green-200 bg-white/70 p-3 text-left text-xs text-green-900">
          <p className="font-semibold">En attendant la confirmation :</p>
          <p className="mt-1">
            Le saviez-vous ? <strong>80 % des caries sont évitables</strong> avec une bonne
            routine de prévention.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Pensez à vérifier votre dossier de courriers indésirables (spams).
        </p>
      </div>
    );
  }

  // ---- Formulaire 2 étapes ----
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Recevez des informations de prévention validées par votre dentiste, et accédez aux
        articles d'éducation bucco-dentaire.
      </p>

      {/* Étape 1 : email + CGU + NL */}
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Votre email
          </label>
          <div className="relative mt-1">
            <input
              ref={emailInputRef}
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              aria-invalid={emailTouched && !emailValid && email.length > 0}
              aria-describedby="email-help"
              className={`w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                emailTouched && email.length > 0 && !emailValid
                  ? 'border-red-400 focus:border-red-400'
                  : emailValid
                    ? 'border-green-500 focus:border-green-500'
                    : 'border-border focus:border-primary'
              }`}
              placeholder="vous@exemple.fr"
              autoComplete="email"
            />
            {emailValid && (
              <span
                aria-hidden="true"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600"
              >
                ✓
              </span>
            )}
          </div>
          {emailTouched && email.length > 0 && !emailValid && (
            <p id="email-help" className="mt-1 text-xs text-red-600">
              Adresse email invalide. Vérifiez le format (ex : nom@exemple.fr).
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              checked={cguAccepted}
              onChange={(e) => setCguAccepted(e.target.checked)}
              className="mt-0.5"
              required
            />
            <span>
              J'accepte les{' '}
              <Link href="/cgu" className="underline">
                conditions générales d'utilisation
              </Link>{' '}
              de {cabinetName} et de Sensident.
            </span>
          </label>
          <label className="flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              checked={newsletterOptin}
              onChange={(e) => setNewsletterOptin(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              J'accepte de recevoir les <strong>newsletters de prévention</strong> envoyées
              par {cabinetName} (1 à 2 emails par mois, lien de désabonnement dans chaque
              email).
            </span>
          </label>
        </div>

        <details className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
          <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
            Options avancées (optionnel)
          </summary>
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={analyticsOptin}
                onChange={(e) => setAnalyticsOptin(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                J'accepte que {cabinetName} collecte des <strong>statistiques anonymisées</strong> de lecture
                des articles (temps passé, scroll). Sans ce consentement, votre cabinet ne verra
                aucune donnée agrégée vous concernant.
              </span>
            </label>
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={reactionsOptin}
                onChange={(e) => setReactionsOptin(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                J'accepte d'envoyer des <strong>réactions</strong> (👍 / 👎) sur les articles
                pour aider {cabinetName} à améliorer ses contenus. Sans ce consentement, le bouton
                de réaction sera désactivé.
              </span>
            </label>
          </div>
        </details>

        <button
          type="button"
          onClick={() => setStep(2)}
          disabled={!canSubmitStep1}
          className="w-full rounded-md bg-primary px-4 py-3 text-base font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Personnaliser mes contenus (optionnel) →
        </button>
      </div>

      {/* Étape 2 : optionnel, révélé après step 1 */}
      {step === 2 && (
        <div className="space-y-4 rounded-lg border border-dashed border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Personnalisation (optionnel)</p>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              ← Retour
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Ces informations restent privées. Elles permettent à {praticienLabel} de mieux
            adapter les contenus à votre profil (ex. recommandations pour les adolescents).
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-xs font-medium">
                Prénom
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Marie"
                autoComplete="given-name"
              />
            </div>
            <div>
              <label htmlFor="birthYear" className="block text-xs font-medium">
                Année de naissance
              </label>
              <input
                id="birthYear"
                type="number"
                inputMode="numeric"
                min="1900"
                max={String(new Date().getFullYear())}
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="1990"
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmitStep1 || loading}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? 'Envoi en cours…'
          : `Je rejoins le programme de prévention de ${praticienLabel}`}
      </button>

      {/* Bandeau de réassurance */}
      <ul className="grid grid-cols-1 gap-1.5 border-t border-border pt-4 sm:grid-cols-2">
        {TRUST_LINES.map((line) => (
          <li
            key={line.text}
            className="flex items-start gap-2 text-xs text-muted-foreground"
          >
            <span aria-hidden="true">{line.icon}</span>
            <span>{line.text}</span>
          </li>
        ))}
      </ul>
    </form>
  );
}