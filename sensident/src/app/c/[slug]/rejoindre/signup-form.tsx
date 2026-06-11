'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  cabinetId: string;
  cabinetName: string;
}

export function SignupForm({ cabinetId, cabinetName }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [cguAccepted, setCguAccepted] = useState(false);
  const [newsletterOptin, setNewsletterOptin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!cguAccepted) {
      setError('Vous devez accepter les CGU pour continuer.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/patient/optin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cabinetId, email, cguAccepted, newsletterOptin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur inconnue');
        setLoading(false);
        return;
      }
      setDone(true);
    } catch (err) {
      setError('Erreur reseau. Reessaie.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-900 dark:bg-green-950/30 dark:text-green-200">
        <p className="font-semibold">Verifiez votre boite mail</p>
        <p className="mt-1 text-xs">
          Nous vous avons envoye un email de confirmation. Cliquez sur le lien pour
          activer votre espace patient.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Votre email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="vous@exemple.fr"
        />
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
            <a href="/cgu" className="underline">
              conditions generales d'utilisation
            </a>{' '}
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
            J'accepte de recevoir les <strong>newssletters de prevention</strong> envoyees
            par {cabinetName} (1 a 2 emails par mois, lien de desabonnement dans chaque
            email).
          </span>
        </label>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !cguAccepted}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Envoi...' : "Je m'inscris"}
      </button>

      <p className="text-xs text-muted-foreground">
        Vous recevrez un email de confirmation. Aucun double opt-in requis pour valider.
      </p>
    </form>
  );
}
