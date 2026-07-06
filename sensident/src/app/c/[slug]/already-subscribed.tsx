'use client';

import { useState } from 'react';
import { Mail, Loader2, Check } from 'lucide-react';

interface Props {
  cabinetSlug: string;
  cabinetName: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AlreadySubscribed({ cabinetSlug, cabinetName }: Props) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Adresse email invalide.');
      return;
    }
    setState('sending');
    try {
      const res = await fetch('/api/patient/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), cabinetSlug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur reseau.');
        setState('error');
        return;
      }
      setState('sent');
    } catch {
      setError('Erreur reseau.');
      setState('error');
    }
  };

  return (
    <section className="border-t border-border bg-muted/20">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <h2 className="text-base font-semibold">Déjà inscrit·e ?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Saisissez l&apos;email avec lequel vous avez confirmé votre inscription. Vous
          recevrez un lien d&apos;accès valable 24h vers votre espace {cabinetName}.
        </p>

        {state === 'sent' ? (
          <div
            role="status"
            className="mt-4 flex items-start gap-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900"
          >
            <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden={true} />
            <div>
              <p className="font-semibold">Lien envoyé.</p>
              <p className="mt-1 text-xs">
                Consultez votre boîte mail (et vos spams). Le lien expire dans 24h.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden={true}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.fr"
                autoComplete="email"
                aria-label="Email d'inscription"
                className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <button
              type="submit"
              disabled={state === 'sending'}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {state === 'sending' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden={true} /> Envoi...
                </>
              ) : (
                'Recevoir mon lien'
              )}
            </button>
          </form>
        )}

        {error && (
          <p role="alert" className="mt-2 text-xs text-red-700">
            {error}
          </p>
        )}

        <p className="mt-3 text-[11px] text-muted-foreground">
          Pour votre sécurité, on ne vous dit pas si l&apos;email est inconnu (anti-énumération). Si
          vous ne recevez rien, vérifiez vos spams ou réessayez.
        </p>
      </div>
    </section>
  );
}
