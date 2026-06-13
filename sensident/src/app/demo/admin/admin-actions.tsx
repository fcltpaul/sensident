'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AdminActions() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enterAdmin(target: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/demo/admin', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur démo');
      router.push(target);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  if (typeof document !== 'undefined') {
    document.querySelectorAll('[data-admin-target]').forEach((el) => {
      el.addEventListener('click', () => {
        const target = el.getAttribute('data-admin-target') || '/admin';
        enterAdmin(target);
      });
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {loading && (
        <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 text-sm text-accent">
          Connexion admin démo…
        </div>
      )}
    </div>
  );
}
