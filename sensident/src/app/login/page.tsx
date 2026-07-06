import Link from 'next/link';
import { LoginForm } from './login-form';

/**
 * Page de connexion praticien.
 *
 * Fix 07/07/2026 : le formulaire HTML natif ne fonctionnait pas sur le
 * navigateur mobile de Paul (Chrome Android et Safari iOS). Cause probable :
 * interferences du Service Worker PWA avec la soumission de form HTML
 * classique. Remplace par un formulaire React client avec fetch JSON.
 * Cf. MEMORY 2026-07-06 - bug login mobile.
 */
export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  const error = searchParams?.error;
  const nextPath = searchParams?.next || '/dashboard';

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-6 py-12">
        <div className="space-y-6">
          <div>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              Sensident
            </Link>
            <h1 className="mt-2 text-2xl font-bold">Connexion praticien</h1>
          </div>

          <LoginForm initialError={error} nextPath={nextPath} />
        </div>
      </div>
    </main>
  );
}