import { notFound } from 'next/navigation';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
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
  // NB : slug est en text() cote Drizzle ET cote Neon, pas de mismatch.
  let cab: { id: string; name: string };
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<Array<{ id: string; name: string }>>`
      SELECT id, name FROM cabinets WHERE slug = ${slug} LIMIT 1
    `;
    if (!rows[0]) notFound();
    cab = rows[0];
  } else {
    const rows = await db
      .select({ id: cabinets.id, name: cabinets.name })
      .from(cabinets)
      .where(eq(cabinets.slug, slug))
      .limit(1);
    if (rows.length === 0) notFound();
    cab = rows[0];
  }

  // 2. Verifier le token si fourni
  // Fix 06/07/2026 : Drizzle `eq(inviteTokens.cabinetId, ...)` crashait cote
  // Neon (uuid vs text). On aligne sur le pattern rawSqlClient + ::text.
  let tokenValid = false;
  if (token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    if (DB_DIALECT === 'postgresql') {
      const valid = await rawSqlClient<Array<{ id: string }>>`
        SELECT id FROM invite_tokens
        WHERE cabinet_id::text = ${cab.id}::text
          AND token_hash = ${tokenHash}
          AND expires_at > NOW()
          AND revoked_at IS NULL
        LIMIT 1
      `;
      tokenValid = valid.length > 0;
    } else {
      const valid = await db
        .select({ id: inviteTokens.id })
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
      tokenValid = valid.length > 0;
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
              <p className="font-semibold">Lien d&apos;invitation requis</p>
              <p className="mt-1 text-xs">
                Pour acceder a votre espace, vous devez utiliser le lien qui vous a ete
                remis par votre dentiste (QR code au cabinet, ou lien dans un email).
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Recevez des informations de prevention validees par votre dentiste, et
                accedez aux articles d&apos;education bucco-dentaire.
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
