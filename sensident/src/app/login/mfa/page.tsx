'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MfaPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/practitioner/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totpCode: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Code invalide');
        setLoading(false);
        return;
      }
      router.push('/dashboard');
    } catch {
      setError('Erreur reseau.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-6 py-12">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Verification MFA</h1>
          <p className="text-sm text-muted-foreground">
            Saisissez le code a 6 chiffres de votre application authenticator.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium">
                Code
              </label>
              <input
                id="code"
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-center text-lg tracking-widest"
                placeholder="000000"
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Verification...' : 'Valider'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
