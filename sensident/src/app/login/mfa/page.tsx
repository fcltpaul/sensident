'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MfaPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Nettoie la valeur : ne garde que les chiffres, max 6.
  // Gere le copier-coller depuis Authenticator qui peut ajouter des espaces
  // ou des caracteres invisibles sur mobile.
  const sanitize = (raw: string): string => raw.replace(/\D/g, '').slice(0, 6);

  // Auto-focus l'input a l'ouverture de la page (surtout utile mobile)
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-submit quand 6 chiffres sont saisis
  useEffect(() => {
    if (code.length === 6 && !loading) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanCode = sanitize(code);
    if (cleanCode.length !== 6) {
      setError('Le code doit contenir 6 chiffres.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/practitioner/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totpCode: cleanCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Code invalide');
        setCode(''); // reset pour resaisir
        setLoading(false);
        inputRef.current?.focus();
        return;
      }
      // Hard reload pour eviter tout cache d'etat React
      window.location.href = '/dashboard';
    } catch {
      setError('Erreur reseau. Verifiez votre connexion.');
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-6 py-12">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Verification MFA</h1>
          <p className="text-sm text-muted-foreground">
            Saisissez le code a 6 chiffres de votre application authenticator.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="code" className="block text-sm font-medium">
                Code
              </label>
              <input
                ref={inputRef}
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={code}
                onChange={(e) => setCode(sanitize(e.target.value))}
                onPaste={(e) => {
                  // Coller : on sanitize immediatement
                  e.preventDefault();
                  const pasted = e.clipboardData.getData('text');
                  setCode(sanitize(pasted));
                }}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-center text-lg tracking-widest"
                placeholder="000000"
                aria-invalid={!!error}
                aria-describedby={error ? 'mfa-error' : undefined}
                disabled={loading}
              />
              {code.length > 0 && code.length < 6 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {code.length}/6 chiffres
                </p>
              )}
            </div>

            {error && (
              <div
                id="mfa-error"
                role="alert"
                className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Verification...' : 'Valider'}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              Vous n'avez pas active MFA ?{' '}
              <a href="/login" className="underline">
                Retour a la connexion
              </a>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}