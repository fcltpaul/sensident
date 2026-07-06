'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, Copy, RefreshCw, Check, Download } from 'lucide-react';
import QRCode from 'qrcode';

interface Token {
  id: string;
  createdAt: string;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
  permanent?: boolean;
}

interface Props {
  cabinetSlug: string;
  activeTokens: Token[];
}

const SESSION_KEY = (cabinetSlug: string) => `sensident:invite-token:${cabinetSlug}`;

export function InvitationPanel({ cabinetSlug, activeTokens }: Props) {
  const router = useRouter();

  // Le token peut venir soit de la BDD (juste cree) soit du sessionStorage
  // (cache cote navigateur pour ne pas obliger le praticien a regenerer
  // apres chaque refresh).
  const [activeToken] = activeTokens; // 0 ou 1 token permanent
  const [plainToken, setPlainToken] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Charge le token en clair depuis sessionStorage au mount
  useEffect(() => {
    if (!activeToken) {
      setPlainToken(null);
      setQrDataUrl(null);
      return;
    }
    const cached = sessionStorage.getItem(SESSION_KEY(cabinetSlug));
    if (cached) {
      setPlainToken(cached);
    }
  }, [activeToken, cabinetSlug]);

  // Genere le QR code a partir du token en clair
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!activeToken || !plainToken) {
        setQrDataUrl(null);
        return;
      }
      const url = `${window.location.origin}/c/${cabinetSlug}/rejoindre?token=${encodeURIComponent(plainToken)}`;
      const qr = await QRCode.toDataURL(url, { width: 320, margin: 1 });
      if (!cancelled) setQrDataUrl(qr);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [activeToken, plainToken, cabinetSlug]);

  const handleReveal = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/cabinet/invite-tokens', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur');
        return;
      }
      if (data.token) {
        setPlainToken(data.token);
        sessionStorage.setItem(SESSION_KEY(cabinetSlug), data.token);
      } else {
        // Token existant -> on ne peut pas le reafficher cote serveur.
        // On propose la regeneration explicite.
        setError(
          "Le lien existe deja, mais le QR code n'est affiche qu'apres la creation initiale. Si tu l'as perdu, clique sur 'Regenerer le lien'.",
        );
      }
      router.refresh();
    } catch {
      setError('Erreur reseau.');
    } finally {
      setBusy(false);
    }
  };

  const handleRegenerate = async () => {
    if (!activeToken) return;
    if (
      !confirm(
        'Regenerer le lien va annuler le QR code actuel. Tous les QR codes imprimes devront etre reimprimes. Continuer ?',
      )
    )
      return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/cabinet/invite-tokens/${activeToken.id}/regenerate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur');
        return;
      }
      setPlainToken(data.token);
      sessionStorage.setItem(SESSION_KEY(cabinetSlug), data.token);
      router.refresh();
    } catch {
      setError('Erreur reseau.');
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback noop
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr-code-${cabinetSlug}.png`;
    a.click();
  };

  if (!activeToken) {
    return (
      <div className="space-y-6">
        {error && (
          <div
            role="alert"
            className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}
        <div className="rounded-lg border border-border bg-background p-6 text-center">
          <QrCode className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden={true} />
          <h2 className="mt-3 text-sm font-semibold">Aucun lien d&apos;invitation</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Cree ton lien permanent pour permettre a tes patients de s&apos;inscrire.
            Un seul QR code a afficher, identique pour tous les patients.
          </p>
          <button
            onClick={handleReveal}
            disabled={busy}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <QrCode className="h-4 w-4" />
            {busy ? 'Creation...' : 'Creer mon lien permanent'}
          </button>
        </div>
      </div>
    );
  }

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/c/${cabinetSlug}/rejoindre`;
  const tokenUrl = plainToken
    ? `${publicUrl}?token=${encodeURIComponent(plainToken)}`
    : '';

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {error}
        </div>
      )}

      <div className="rounded-lg border-2 border-blue-200 bg-blue-50/40 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-blue-900">
              Ton lien permanent
            </h2>
            <p className="mt-1 text-xs text-blue-800">
              Un seul QR code pour tous tes patients. Affiche-le au fauteuil, mets-le
              sur ta vitrine, ou envoie-le par email.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-blue-700 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
            Permanent
          </span>
        </div>

        {qrDataUrl ? (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr]">
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`QR code d'inscription pour ${cabinetSlug}`}
                className="h-64 w-64 rounded border border-border bg-white p-2"
              />
              <button
                onClick={handleDownload}
                className="mt-2 inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
              >
                <Download className="h-3 w-3" /> Telecharger en PNG
              </button>
            </div>
            <div className="space-y-3">
              {plainToken ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-900">
                    URL complete (avec token)
                  </p>
                  <div className="mt-1 flex gap-1">
                    <input
                      readOnly
                      value={tokenUrl}
                      aria-label="URL d'invitation avec token"
                      className="flex-1 rounded-md border border-border bg-white px-2 py-1.5 text-xs font-mono text-foreground"
                    />
                    <button
                      onClick={() => handleCopy(tokenUrl)}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1.5 text-xs text-foreground hover:bg-muted"
                      aria-label="Copier l'URL avec token"
                    >
                      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                      {copied ? 'Copie' : 'Copier'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
                  <p>
                    <strong>QR code en cache perdu.</strong> Le QR actuel pointe vers
                    l&apos;URL du cabinet seul (sans token). Pour reafficher un QR
                    complet avec token valide, reclique sur &quot;Regenerer le lien&quot;
                    ci-dessous.
                  </p>
                </div>
              )}

              <p className="text-[10px] text-blue-900">
                <strong>Astuce :</strong> imprime le QR code en A5 et plastifie-le. Il est
                valable 10 ans et peut etre scanne jusqu&apos;a 100 000 fois.
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">Generation du QR code...</p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-background p-4">
        <h3 className="text-xs font-semibold">Statistiques</h3>
        <dl className="mt-2 grid grid-cols-3 gap-3 text-center">
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Cree le
            </dt>
            <dd className="mt-1 text-sm font-semibold">
              {new Date(activeToken.createdAt).toLocaleDateString('fr-FR')}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Utilisations
            </dt>
            <dd className="mt-1 text-sm font-semibold">
              {activeToken.usedCount} <span className="text-xs font-normal text-muted-foreground">/ {activeToken.maxUses.toLocaleString('fr-FR')}</span>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Expire le
            </dt>
            <dd className="mt-1 text-sm font-semibold">
              {new Date(activeToken.expiresAt).toLocaleDateString('fr-FR')}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <h3 className="text-xs font-semibold">Regenerer le lien</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Action rare. A utiliser uniquement si le QR code a ete compromis (vole,
          perdu, capture d&apos;ecran publiee). Tous les QR codes anterieurs deviennent
          invalides.
        </p>
        <button
          onClick={handleRegenerate}
          disabled={busy}
          className="mt-2 inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          <RefreshCw className="h-3 w-3" />
          {busy ? 'Regeneration...' : 'Regenerer le lien (annule le precedent)'}
        </button>
      </div>

      <details className="rounded-lg border border-border bg-muted/10 p-4 text-xs">
        <summary className="cursor-pointer font-semibold text-foreground">
          Comment fonctionne la securite de ce lien ?
        </summary>
        <div className="mt-3 space-y-2 text-muted-foreground">
          <p>
            <strong className="text-foreground">Le token</strong> est une chaine
            aleatoire de 256 bits (43 caracteres). Elle n&apos;est pas devinable par
            brute force.
          </p>
          <p>
            <strong className="text-foreground">En BDD</strong>, on ne stocke que
            l&apos;empreinte (hash SHA-256) du token. Le token en clair n&apos;est
            visible qu&apos;une fois apres creation, et il est conserve dans le
            cache du navigateur du praticien.
          </p>
          <p>
            <strong className="text-foreground">Protection en cas de fuite</strong> :
            si quelqu&apos;un photographie le QR au cabinet, il peut s&apos;inscrire,
            mais il doit confirmer via <strong>double opt-in par email</strong>.
            L&apos;email de confirmation est envoye a l&apos;adresse saisie ; un
            fraudeur devrait donc aussi avoir acces a cette boite mail pour
            finaliser l&apos;inscription.
          </p>
          <p>
            <strong className="text-foreground">Limite du systeme</strong> : un
            patient A peut scaner le QR puis partager l&apos;URL avec un ami B
            non-patient. B ne pourra pas finaliser sans acces a la boite mail de
            A. Pour empecher ce cas, il faudrait un code TOTP affiche au fauteuil
            (non livre dans cette version).
          </p>
        </div>
      </details>
    </div>
  );
}
