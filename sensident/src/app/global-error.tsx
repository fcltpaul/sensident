'use client';

/**
 * Page d'erreur GLOBALE (catch-all au-dessus du layout root).
 *
 * Doit etre un Client Component et definir ses propres <html>/<body>
 * car elle remplace le layout root en cas d'erreur fatale.
 *
 * Differenciation avec error.tsx :
 *  - error.tsx : erreur dans une page (layout racine intact)
 *  - global-error.tsx : erreur dans le layout racine lui-meme
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <p className="text-sm font-semibold text-destructive">Erreur critique</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Application indisponible
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Une erreur critique est survenue. Veuillez reessayer.
          </p>
          {error.digest && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              Reference : {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Reessayer
          </button>
        </div>
      </body>
    </html>
  );
}