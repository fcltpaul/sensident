'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

export function ArticleActions({ slug, status, role }: { slug: string; status: string; role: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const setStatus = async (newStatus: 'draft' | 'validated' | 'archived') => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/articles/${slug}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Erreur');
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm('Supprimer cet article ? Action irréversible.')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/articles/${slug}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      } else {
        alert('Erreur');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/admin/articles/${slug}`}
        className="text-xs text-accent hover:underline"
      >
        Editer
      </Link>
      {status !== 'validated' && role !== 'reader' && (
        <button
          onClick={() => setStatus('validated')}
          disabled={busy}
          className="text-xs text-green-700 hover:underline disabled:opacity-50"
        >
          Valider
        </button>
      )}
      {status === 'validated' && role !== 'reader' && (
        <button
          onClick={() => setStatus('archived')}
          disabled={busy}
          className="text-xs text-slate-600 hover:underline disabled:opacity-50"
        >
          Archiver
        </button>
      )}
      {role === 'superadmin' && (
        <button onClick={remove} disabled={busy} className="text-xs text-red-600 hover:underline disabled:opacity-50">
          Supprimer
        </button>
      )}
    </div>
  );
}
