'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function LoginForm({
  initialError,
  nextPath,
}: {
  initialError?: string;
  nextPath: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // POST JSON pour eviter les interferences du Service Worker PWA
      // avec la soumission de form HTML natif (rapporte par Paul sur mobile).
      const res = await fetch('/api/practitioner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Connexion impossible.');
        setLoading(false);
        return;
      }
      // MFA requis : on route vers /login/mfa qui gere TOTP ou email-code.
      if (data.requiresMfa) {
        router.push(`/login/mfa?next=${encodeURIComponent(nextPath)}`);
        return;
      }
      // Sinon dashboard direct.
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError('Erreur reseau. Reessaie.');
      setLoading(false);
    }
  };

  const errorMsg = error
    ? error === 'invalid_credentials'
      ? 'Email ou mot de passe incorrect.'
      : error === 'rate_limited'
        ? 'Trop de tentatives. Reessayez dans quelques minutes.'
        : error === 'session_expired'
          ? 'Votre session a expire. Reconnectez-vous.'
          : error
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Connexion...' : 'Se connecter'}
      </button>

      <div className="flex items-center justify-between text-xs">
        <Link href="/forgot-password" className="text-muted-foreground underline">
          Mot de passe oublie ?
        </Link>
        <Link href="/signup" className="text-muted-foreground underline">
          Creer un compte
        </Link>
      </div>
    </form>
  );
}