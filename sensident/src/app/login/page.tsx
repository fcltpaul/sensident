import Link from 'next/link';

/**
 * Page de connexion praticien.
 *
 * BUG CONNU MOBILE : le formulaire HTML natif ne fonctionne pas
 * sur le navigateur mobile de Paul (Chrome Android et Safari iOS).
 * Cause exacte inconnue, le serveur repond bien (test curl OK).
 * Fonctionne normalement sur PC.
 *
 * Pas de bouton "Connexion rapide" avec email en dur : c'etait une
 * mesure provisoire a securiser (l'email etait expose publiquement).
 *
 * Resolution de fond : a investiguer cote client mobile (peut-etre
 * un conflit Service Worker / cache agressif).
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
              ← Sensident
            </Link>
            <h1 className="mt-2 text-2xl font-bold">Connexion praticien</h1>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
            >
              {error === 'invalid_credentials'
                ? 'Email ou mot de passe incorrect.'
                : error === 'rate_limited'
                  ? 'Trop de tentatives. Reessayez dans quelques minutes.'
                  : error === 'session_expired'
                    ? 'Votre session a expire. Reconnectez-vous.'
                    : decodeURIComponent(error)}
            </div>
          )}

          <form action="/api/practitioner/login-form" method="POST" className="space-y-4">
            <input type="hidden" name="next" value={nextPath} />
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Se connecter
            </button>

            <p className="text-center text-xs text-muted-foreground">
              Pas encore de compte ?{' '}
              <Link href="/signup" className="underline">
                Creer un compte
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
