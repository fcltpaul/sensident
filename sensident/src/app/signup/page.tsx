'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'mfa-setup'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cabinetName, setCabinetName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // MFA setup
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/practitioner/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, cabinetName, slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur inconnue');
        setLoading(false);
        return;
      }
      setQrCodeUrl(data.qrCodeUrl);
      setTotpSecret(data.totpSecret);
      setStep('mfa-setup');
    } catch (err) {
      setError('Erreur reseau. Reessaie.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/practitioner/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Code invalide');
        setLoading(false);
        return;
      }
      router.push('/dashboard');
    } catch (err) {
      setError('Erreur reseau. Reessaie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-6 py-12">
        <div className="space-y-6">
          <div>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Sensident
            </Link>
            <h1 className="mt-2 text-2xl font-bold">Creer un compte praticien</h1>
          </div>

          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="cabinetName" className="block text-sm font-medium">
                  Nom du cabinet
                </label>
                <input
                  id="cabinetName"
                  type="text"
                  required
                  value={cabinetName}
                  onChange={(e) => {
                    setCabinetName(e.target.value);
                    // Auto-generate slug
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-+|-+$/g, '')
                        .slice(0, 40)
                    );
                  }}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Cabinet du Dr Dupont"
                />
              </div>

              <div>
                <label htmlFor="slug" className="block text-sm font-medium">
                  Identifiant public (URL)
                </label>
                <div className="mt-1 flex items-center rounded-md border border-border bg-background px-3 text-sm">
                  <span className="text-muted-foreground">sensident.fr/c/</span>
                  <input
                    id="slug"
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="flex-1 bg-transparent py-2 outline-none"
                    pattern="[a-z0-9-]{3,40}"
                    placeholder="cabinet-dupont"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Lettres minuscules, chiffres et tirets. Visible par vos patients.
                </p>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium">
                  Email professionnel
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="dr.dupont@cabinet-dupont.fr"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium">
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  minLength={12}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  12 caracteres min., 1 majuscule, 1 chiffre.
                </p>
              </div>

              {error && (
                <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Creation...' : 'Creer le compte'}
              </button>

              <p className="text-center text-xs text-muted-foreground">
                Deja un compte ?{' '}
                <Link href="/login" className="underline">
                  Se connecter
                </Link>
              </p>
            </form>
          )}

          {step === 'mfa-setup' && (
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
                <p className="font-semibold">Configuration du MFA (obligatoire)</p>
                <p className="mt-1 text-muted-foreground">
                  Pour des raisons de conformite HDS et de protection des donnees patient,
                  l'authentification a deux facteurs est obligatoire.
                </p>
              </div>

              <div>
                <p className="text-sm">1. Scannez ce QR code avec votre application :</p>
                <ul className="ml-5 mt-1 list-disc text-xs text-muted-foreground">
                  <li>Google Authenticator</li>
                  <li>Authy</li>
                  <li>1Password</li>
                </ul>
                {qrCodeUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrCodeUrl}
                    alt="QR code TOTP"
                    className="mx-auto mt-3 h-48 w-48 rounded border border-border"
                  />
                )}
                {totpSecret && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Ou saisissez manuellement :{' '}
                    <code className="rounded bg-muted px-1 py-0.5">{totpSecret}</code>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="totpCode" className="block text-sm font-medium">
                  2. Code a 6 chiffres
                </label>
                <input
                  id="totpCode"
                  type="text"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-center text-lg tracking-widest"
                  placeholder="000000"
                />
              </div>

              {error && (
                <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Verification...' : 'Activer MFA et acceder au tableau de bord'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
