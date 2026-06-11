'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, Copy, Trash2, Plus, Check } from 'lucide-react';
import QRCode from 'qrcode';

interface Token {
  id: string;
  createdAt: string;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
}

interface Props {
  cabinetSlug: string;
  activeTokens: Token[];
}

export function InvitationPanel({ cabinetSlug, activeTokens }: Props) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const [newQr, setNewQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError('Erreur reseau.');
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
      // fallback
    }
  };

  const revoke = async (id: string) => {
    if (!confirm('Revoquer ce lien ? Les patients ne pourront plus s\'inscrire avec.')) return;
    await fetch(`/api/cabinet/invite-tokens/${id}/revoke`, { method: 'POST' });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {error && <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="rounded-lg border border-border bg-background p-6">
        <h2 className="text-sm font-semibold">Generer un nouveau lien</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Chaque lien est valable 90 jours et peut etre utilise jusqu'a 1000 fois.
          Affiche le QR code au cabinet, ou envoyez l'URL par email.
        </p>
        <button
          onClick={generate}
          disabled={generating}
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {generating ? 'Generation...' : 'Generer un lien'}
        </button>

        {newUrl && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 rounded-md border border-border bg-muted/30 p-4">
            {newQr && (
              <div className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={newQr} alt="QR code" className="mx-auto h-48 w-48 rounded" />
                <p className="mt-2 text-xs text-muted-foreground">
                  Imprimez et affichez au fauteuil
                </p>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs font-semibold">URL a partager :</p>
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
                  {copied ? 'Copie' : 'Copier'}
                </button>
              </div>
              <p className="mt-4 text-[10px] text-muted-foreground">
                <strong>⚠ Sauvegardez cette URL</strong> : elle ne sera plus affichee.
                Le QR code peut etre telecharge par clic droit.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-background">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-semibold">Liens actifs ({activeTokens.length})</h2>
        </div>
        {activeTokens.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Aucun lien actif. Generez-en un ci-dessus.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Cree le</th>
                <th className="px-4 py-3">Expire le</th>
                <th className="px-4 py-3">Utilisations</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {activeTokens.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(t.expiresAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    {t.usedCount} / {t.maxUses}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => revoke(t.id)}
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                    >
                      <Trash2 className="h-3 w-3" /> Revoquer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
