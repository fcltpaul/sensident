'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export function EnterDemoButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function enter() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/demo/enter', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur démo');
      setSuccess(true);
      // Petit délai pour montrer le check, puis redirection
      setTimeout(() => router.push(data.redirect || '/dashboard'), 400);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white">
        <CheckCircle className="h-4 w-4" />
        Connecté, redirection…
      </div>
    );
  }

  return (
    <>
      <button
        onClick={enter}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Connexion…</>
        ) : (
          <>Entrer dans le cabinet démo <ArrowRight className="h-4 w-4" /></>
        )}
      </button>
      {error && (
        <div className="mt-3 inline-flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 text-left max-w-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Erreur</p>
            <p className="opacity-90">{error}</p>
          </div>
        </div>
      )}
    </>
  );
}
