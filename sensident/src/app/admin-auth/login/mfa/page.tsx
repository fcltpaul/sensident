'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminMfaPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/verify-mfa', {
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
      router.push('/admin');
    } catch {
      setError('Erreur reseau.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-background p-8 shadow-sm">
        <h1 className="text-2xl font-bold">MFA Admin</h1>
        <p className="text-sm text-muted-foreground">Saisissez le code a 6 chiffres.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            required
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-center text-lg tracking-widest"
            placeholder="000000"
          />
          {error && <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Verification...' : 'Valider'}
          </button>
        </form>
      </div>
    </main>
  );
}
