'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Check, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/practitioner/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur reseau.');
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError('Erreur reseau.');
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-6 py-12 space-y-4">
          <Check className="h-12 w-12 text-green-600" aria-hidden={true} />
          <h1 className="text-2xl font-bold">Email envoye</h1>
          <p className="text-sm text-muted-foreground">
            Si un compte existe avec cette adresse, un email de reinitialisation a ete envoye.
            Le lien expire dans 1 heure.
          </p>
          <p className="text-xs text-muted-foreground">
            Pour votre securite, on ne vous dit pas si l&apos;email est inconnu (anti-enumeration).
          </p>
          <Link href="/login" className="text-sm text-primary underline">
            Retour a la connexion
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-6 py-12 space-y-6">
        <div>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            ← Connexion
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Mot de passe oublie ?</h1>
          <p className="text-sm text-muted-foreground">
            Saisissez votre email. Vous recevrez un lien pour reinitialiser votre mot de passe.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">Email</label>
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden={true} />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.fr"
                autoComplete="email"
                className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {error && (
            <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <><Loader2 className="inline h-4 w-4 animate-spin" /> Envoi...</> : 'Envoyer le lien de reinitialisation'}
          </button>
        </form>
      </div>
    </main>
  );
}
