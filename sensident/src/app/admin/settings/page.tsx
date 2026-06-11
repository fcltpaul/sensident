import { getAdminSession } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';

export default async function AdminSettingsPage() {
  const session = await getAdminSession();
  if (!session || !session.mfaVerified) redirect('/admin-auth/login');

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">ParamÃ¨tres</h1>
        <p className="text-sm text-muted-foreground">Configuration du compte admin et de la plateforme.</p>
      </div>

      <div className="rounded-lg border border-border bg-background p-6 space-y-3">
        <h2 className="text-sm font-semibold">Mon compte</h2>
        <p className="text-xs text-muted-foreground">
          Role : <span className="font-mono">{session.role}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Pour modifier votre email, votre mot de passe ou votre secret MFA, contactez Paul Foucault.
        </p>
      </div>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900 dark:bg-amber-950/30">
        <p className="font-semibold">Bootstrap du premier admin</p>
        <p className="mt-1 text-xs">
          Pour creer le premier compte admin, executez en local :
          <code className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-xs font-mono">
            tsx scripts/create-admin.ts --email paul@sensident.fr --name "Paul Foucault" --role superadmin
          </code>
        </p>
      </div>
    </div>
  );
}
