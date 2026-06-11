'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function MerciContent() {
  const params = useSearchParams();
  const slug = params.get('slug');

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md space-y-4 rounded-lg border border-border bg-background p-8 text-center">
        <h1 className="text-2xl font-bold">Desabonnement confirme</h1>
        <p className="text-sm text-muted-foreground">
          Vous etes desabonne. Vous pouvez vous reabonner a tout moment
          depuis votre espace patient.
        </p>
        <p className="text-xs text-muted-foreground">
          Vous ne recevrez plus de newsletters de ce cabinet.
          Les autres finalites (analytics anonymes, reactions) restent
          sous votre controle depuis votre espace patient.
        </p>
        <div className="flex flex-col gap-3 pt-2">
          {slug ? (
            <Link
              href={`/c/${slug}/bienvenue`}
              className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Gerer mes preferences
            </Link>
          ) : (
            <p className="text-xs text-muted-foreground">
              Connectez-vous a votre espace patient pour gerer vos preferences.
            </p>
          )}
          <a href="/" className="text-sm text-accent hover:underline">
            Retour a l'accueil
          </a>
        </div>
      </div>
    </main>
  );
}

export default function DesabonnementMerciPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement...</p>}>
      <MerciContent />
    </Suspense>
  );
}
