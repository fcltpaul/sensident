'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function DesabonnementContent() {
  const params = useSearchParams();
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleUnsubscribe = async () => {
    const token = params.get('t');
    const cabinetId = params.get('c');
    if (!token || !cabinetId) {
      alert('Lien invalide.');
      return;
    }
    const res = await fetch('/api/patient/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token, cabinet_id: cabinetId }),
    });
    if (res.redirected) {
      window.location.href = res.url;
    } else {
      setConfirmed(true);
    }
  };

  if (confirmed) {
    return (
      <div className="max-w-md space-y-4 rounded-lg border border-border bg-background p-8 text-center">
        <h1 className="text-2xl font-bold">✓ Désabonnement confirmé</h1>
        <p className="text-sm text-muted-foreground">
          Vous ne recevrez plus de newsletters de ce cabinet. Vous pouvez vous réinscrire à tout moment
          via le lien que vous a remis votre dentiste.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-4 rounded-lg border border-border bg-background p-8">
      <h1 className="text-2xl font-bold">Se désabonner</h1>
      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Cliquez sur le bouton ci-dessous pour confirmer votre désabonnement.
            Vous ne recevrez plus aucune newsletter.
          </p>
          <button
            onClick={handleUnsubscribe}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Confirmer le désabonnement
          </button>
          <a href="/" className="block text-center text-xs text-muted-foreground hover:text-foreground">
            Annuler et revenir
          </a>
        </>
      )}
    </div>
  );
}

export default function DesabonnementPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement...</p>}>
        <DesabonnementContent />
      </Suspense>
    </main>
  );
}
