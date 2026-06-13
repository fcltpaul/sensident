'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function PractitionerActions() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enterDemo(target: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/demo/enter', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur démo');
      router.push(target);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  // Bind click on each entry card to enterDemo
  if (typeof document !== 'undefined') {
    document.querySelectorAll('[data-demo-target]').forEach((el) => {
      el.addEventListener('click', () => {
        const target = el.getAttribute('data-demo-target') || '/dashboard';
        enterDemo(target);
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
          Connexion au cabinet démo…
        </div>
      )}
    </div>
  );
}
