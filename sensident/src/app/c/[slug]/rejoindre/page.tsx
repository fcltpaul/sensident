import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { cabinets, inviteTokens } from '@/db/schema';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { SignupForm } from './signup-form';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';
import crypto from 'node:crypto';

interface PageProps {
  params: { slug: string };
  searchParams: { token?: string };
}

export default async function RejoindrePage({ params, searchParams }: PageProps) {
  const { slug } = params;
  const token = searchParams.token;

  // 1. Trouver le cabinet par slug
  const cabinet = await db
    .select()
    .from(cabinets)
    .where(eq(cabinets.slug, slug))
    .limit(1);

  if (cabinet.length === 0) notFound();
  const cab = cabinet[0];

  // 2. Verifier le token si fourni (token optionnel : on peut venir d'un QR code)
  let tokenValid = false;
  if (token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const validTokens = await db
      .select()
      .from(inviteTokens)
      .where(
        and(
          eq(inviteTokens.cabinetId, cab.id),
          eq(inviteTokens.tokenHash, tokenHash),
          gt(inviteTokens.expiresAt, new Date()),
          isNull(inviteTokens.revokedAt)
        )
      )
      .limit(1);

    if (validTokens.length > 0) {
      tokenValid = true;
    }
  }

  // 3. Rendu : landing R1 (au nom du cabinet, pas de branding Sensident)
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-6 py-12">
        <div className="space-y-6">
          <header className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">{cab.name}</h1>
            <p className="text-sm text-muted-foreground">
              vous accompagne dans votre prevention bucco-dentaire
            </p>
          </header>

          {!tokenValid ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <p className="font-semibold">Lien d'invitation requis</p>
              <p className="mt-1 text-xs">
                Pour acceder a votre espace, vous devez utiliser le lien qui vous a ete
                remis par votre dentiste (QR code au cabinet, ou lien dans un email).
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Recevez des informations de prevention validees par votre dentiste, et
                accedez aux articles d'education bucco-dentaire.
              </p>

              <SignupForm cabinetId={cab.id} cabinetName={cab.name} />
            </>
          )}

          <footer className="pt-8 text-center text-xs text-muted-foreground">
            <p>Service offert par {cab.name}</p>
            <p className="mt-1">Heberge en France · Donnees confidentielles</p>
          </footer>
        </div>
      </div>
      <PwaInstallPrompt cabinetSlug={slug} />
    </main>
  );
}
