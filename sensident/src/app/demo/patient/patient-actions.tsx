'use client';

import { useState } from 'react';

export function PatientActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enterPatient() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/demo/patient', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur démo');
      window.open(data.redirect, '_blank');
      setLoading(false);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      <button
        onClick={enterPatient}
        disabled={loading}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? 'Connexion…' : '📚 Ouvrir l\'espace patient (nouvel onglet)'}
      </button>
      <p className="text-xs text-muted-foreground">
        Bypass du magic link : session patient directement active.
      </p>
    </div>
  );
}
