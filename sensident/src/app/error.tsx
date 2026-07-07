'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Page d'erreur globale (Client Component requis par Next.js).
 *
 * Capture toutes les erreurs non gérées dans le rendu des Server Components
 * ou des Client Components. Affiche un message générique + bouton reset.
 *
 * En production, l'erreur est loggée côté serveur (Next.js la capture aussi).
 * Pas de PII exposée à l'utilisateur.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log minimal côté client (utile en dev, no-op en prod)
    if (process.env.NODE_ENV !== 'production') {
      console.error('App error:', error);
    }
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-destructive">Erreur</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Une erreur est survenue
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          L&apos;application a rencontre un probleme inattendu. Vous pouvez
          reessayer ou revenir a l&apos;accueil.
        </p>
        {error.digest && (
          <p className="mt-2 text-[10px] text-muted-foreground">
            Reference : {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Reessayer
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Retour a l&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  );
}