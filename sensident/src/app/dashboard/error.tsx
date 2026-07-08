'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Error boundary segment-level pour /dashboard/*.
 *
 * 08/07/2026 : remplace l'erreur generique Next.js (digest masque) par
 * un POST /api/debug/error qui ecrit la stack trace complete dans
 * audit_logs Neon. On peut ensuite lire la trace via le Neon Studio ou
 * un script /scripts/_audit-neon-routes.mjs.
 *
 * En local : la stack trace est visible directement dans la console
 * navigateur (devtools).
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log console (toujours, pour le dev)
    console.error('[dashboard error]', error);

    // Log serveur via audit_logs (prod aussi)
    const digest = error.digest ?? '';
    const payload = {
      context: typeof window !== 'undefined' ? window.location.pathname : 'dashboard',
      message: error.message ?? '',
      stack: error.stack ?? '',
      digest,
    };
    fetch('/api/debug/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Si le POST echoue (session expiree par ex.), on n'affiche rien
      // de plus -> le message ci-dessous reste genique.
    });
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-destructive">Erreur</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Une erreur est survenue sur cette page
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Le detail a ete enregistre cote serveur pour diagnostic.
        </p>
        {error.digest && (
          <p className="mt-2 text-[10px] text-muted-foreground">
            Reference : {error.digest}
          </p>
        )}
        {/* Affiche le message uniquement en dev pour aider le dev local */}
        {process.env.NODE_ENV !== 'production' && error.message && (
          <pre className="mt-3 max-h-40 overflow-auto rounded border border-amber-300 bg-amber-50 p-2 text-left text-[11px] text-amber-900">
            {error.message}
          </pre>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Reessayer
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Retour au dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
