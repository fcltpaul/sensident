'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, QrCode, Copy, Check, Plus } from 'lucide-react';
import QRCode from 'qrcode';
import { useInviteModal } from './invite-modal-context';

interface Token {
  id: string;
  createdAt: string;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
}

/**
 * Modale d'invitation globale. Génère un nouveau lien / QR code + liste tokens actifs.
 * Fetch initial côté client au mount (pas de query côté layout → safe pour SSR).
 */
export function InviteModal() {
  const invite = useInviteModal();
  const router = useRouter();
  const [cabinetSlug, setCabinetSlug] = useState<string | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [generating, setGenerating] = useState(false);
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const [newQr, setNewQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!invite.isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch('/api/practitioner/me', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('/api/cabinet/invite-tokens', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([me, list]) => {
        if (cancelled) return;
        if (me?.cabinetSlug) setCabinetSlug(me.cabinetSlug);
        if (Array.isArray(list?.tokens)) setTokens(list.tokens);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [invite.isOpen]);

  // Reset state à la fermeture
  useEffect(() => {
    if (invite.isOpen) return;
    setNewUrl(null);
    setNewQr(null);
    setCopied(false);
    setError(null);
  }, [invite.isOpen]);

  // Verrouillage scroll
  useEffect(() => {
    if (!invite.isOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [invite.isOpen]);

  // Fermeture ESC
  useEffect(() => {
    if (!invite.isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') invite.close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [invite]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    setNewUrl(null);
    setNewQr(null);
    try {
      const res = await fetch('/api/cabinet/invite-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxUses: 1000, durationDays: 90 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur');
        setGenerating(false);
        return;
      }
      setNewUrl(data.url);
      const qr = await QRCode.toDataURL(data.url, { width: 256 });
      setNewQr(qr);
      router.refresh();
    } catch {
      setError('Erreur réseau.');
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    if (!newUrl) return;
    try {
      await navigator.clipboard.writeText(newUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback noop */
    }
  };

  const revoke = async (id: string) => {
    if (!confirm('Révoquer ce lien ? Les patients ne pourront plus s\'inscrire avec.')) return;
    await fetch(`/api/cabinet/invite-tokens/${id}/revoke`, { method: 'POST' });
    router.refresh();
  };

  if (!invite.isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) invite.close();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-lg bg-background shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 id="invite-modal-title" className="text-base font-semibold">
            Inviter des patients
          </h2>
          <button
            type="button"
            onClick={() => invite.close()}
            className="rounded-md p-1 hover:bg-muted"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {loading && !cabinetSlug ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : error ? (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border bg-background p-5">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  Générer un lien d'invitation
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Valable 90 jours, utilisable jusqu'à 1000 fois. Affichez le QR au fauteuil ou
                  partagez l'URL par email.
                </p>
                <button
                  onClick={generate}
                  disabled={generating}
                  className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {generating ? 'Génération…' : 'Générer un lien'}
                </button>

                {newUrl && (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 rounded-md border border-border bg-muted/30 p-4">
                    {newQr && (
                      <div className="text-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={newQr} alt="QR code" className="mx-auto h-48 w-48 rounded" />
                        <p className="mt-2 text-xs text-muted-foreground">
                          À afficher au fauteuil
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold">URL à partager :</p>
                      <div className="flex gap-1">
                        <input
                          readOnly
                          value={newUrl}
                          className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-mono"
                        />
                        <button
                          onClick={copy}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                        >
                          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copied ? 'Copié' : 'Copier'}
                        </button>
                      </div>
                      <p className="mt-4 text-[10px] text-muted-foreground">
                        ⚠ Sauvegardez cette URL : elle ne sera plus affichée.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border bg-background">
                <div className="border-b border-border p-3">
                  <h3 className="text-sm font-semibold">Liens actifs ({tokens.length})</h3>
                </div>
                {tokens.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    Aucun lien actif. Générez-en un ci-dessus.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Créé le</th>
                        <th className="px-3 py-2">Expire le</th>
                        <th className="px-3 py-2">Utilisations</th>
                        <th className="px-3 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokens.map((t) => (
                        <tr key={t.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 text-muted-foreground">
                            {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {new Date(t.expiresAt).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-3 py-2">
                            {t.usedCount} / {t.maxUses}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => revoke(t.id)}
                              className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                            >
                              Révoquer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Pour plus d'options (limites personnalisées, durée, etc.), ouvrez la page{' '}
                <a
                  href="/dashboard/invitation"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  onClick={() => invite.close()}
                >
                  Invitations
                </a>{' '}
                dans un nouvel onglet.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
