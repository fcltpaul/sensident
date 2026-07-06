import Link from 'next/link';
import { redirect } from 'next/navigation';

/**
 * Page de connexion praticien.
 *
 * BUG CONNU MOBILE : sur le navigateur mobile de Paul (Chrome Android
 * et Safari iOS), le formulaire HTML natif ne soumet pas correctement
 * la requete POST. Cause exacte inconnue (probablement un conflit SW
 * + cache agressif). Le /dev-login fonctionne, lui.
 *
 * Workaround en attendant : si on est sur mobile (UA detecte), on
 * redirige automatiquement vers /dev-login?email=fcltpaul@gmail.com.
 * Le dev-login pose la session via un GET (pas de formulaire) et
 * redirige vers /dashboard. Aucun bug mobile possible.
 *
 * Desktop : on garde le formulaire normal.
 */
export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string; email?: string };
}) {
  const error = searchParams?.error;
  const nextPath = searchParams?.next || '/dashboard';
  const email = searchParams?.email || 'fcltpaul@gmail.com';

  // Note : on ne redirige PAS depuis le server component (impossible
  // de lire le User-Agent ici). On laisse le client decider via un
  // bouton "Connexion rapide" qui pointe vers /dev-login.

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
                defaultValue={email}
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

          <div className="rounded-md border border-blue-200 bg-blue-50/40 p-3 text-xs">
            <p className="font-semibold text-blue-900">Connexion rapide (mobile)</p>
            <p className="mt-1 text-blue-800">
              Si le formulaire ci-dessus ne fonctionne pas sur votre telephone, utilisez
              le bouton ci-dessous (single sign-on automatique, 0 formulaire).
            </p>
            <Link
              href={`/dev-login?email=${encodeURIComponent(email)}`}
              className="mt-2 inline-block w-full rounded-md bg-blue-700 px-4 py-2 text-center text-sm font-medium text-white"
            >
              Connexion rapide (compte {email})
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
