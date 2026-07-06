'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, KeyRound, Smartphone, ExternalLink, Shield, Sparkles, Check } from 'lucide-react';

interface Props {
  practitioner: { id: string; email: string; mfaEnabled: boolean; createdAt: Date };
  cabinet: { id: string; name: string; slug: string };
  subscription: {
    plan: string;
    status: string;
    isAmbassador: boolean;
    currentPeriodEnd: Date | null;
    hasStripeCustomer: boolean;
  } | null;
}

export function AccountForm({ practitioner, cabinet, subscription }: Props) {
  const router = useRouter();
  const [cabinetName, setCabinetName] = useState(cabinet.name);
  const [savingCabinet, setSavingCabinet] = useState(false);
  const [savedCabinet, setSavedCabinet] = useState(false);

  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingPwd, setSavingPwd] = useState(false);

  const [mfaMsg, setMfaMsg] = useState<string | null>(null);
  const [mfaQr, setMfaQr] = useState<{ qrCodeUrl: string; secret: string } | null>(null);

  const [brandingSignature, setBrandingSignature] = useState('');
  const [brandingMsg, setBrandingMsg] = useState<string | null>(null);

  const saveCabinetName = async () => {
    setSavingCabinet(true);
    try {
      const res = await fetch('/api/practitioner/cabinet-name', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cabinetName }),
      });
      if (res.ok) {
        setSavedCabinet(true);
        setTimeout(() => setSavedCabinet(false), 3000);
        router.refresh();
      }
    } finally {
      setSavingCabinet(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (newPwd.length < 12) {
      setPwdMsg({ ok: false, text: 'Le mot de passe doit faire au moins 12 caracteres.' });
      return;
    }
    setSavingPwd(true);
    try {
      const res = await fetch('/api/practitioner/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwdMsg({ ok: true, text: 'Mot de passe mis a jour.' });
        setOldPwd('');
        setNewPwd('');
      } else {
        setPwdMsg({ ok: false, text: data.error || 'Erreur' });
      }
    } finally {
      setSavingPwd(false);
    }
  };

  // Load existing branding on mount
  useEffect(() => {
    fetch('/api/practitioner/newsletter-branding')
      .then((r) => r.json())
      .then((data) => {
        if (data.signature) setBrandingSignature(data.signature);
      })
      .catch(() => {});
  }, []);

  const saveBranding = async () => {
    setBrandingMsg(null);
    try {
      const res = await fetch('/api/practitioner/newsletter-branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: brandingSignature }),
      });
      if (res.ok) {
        setBrandingMsg('Signature sauvegardee.');
        setTimeout(() => setBrandingMsg(null), 3000);
      } else {
        setBrandingMsg('Erreur lors de la sauvegarde.');
      }
    } catch {
      setBrandingMsg('Erreur reseau.');
    }
  };

  const resetMfa = async () => {
    if (!confirm('Reinitialiser le MFA ? Vous devrez re-scanner un QR code avec votre app authenticator.')) return;
    setMfaMsg(null);
    try {
      const res = await fetch('/api/practitioner/mfa-reset', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMfaQr({ qrCodeUrl: data.qrCodeUrl, secret: data.totpSecret });
        setMfaMsg('Scannez ce nouveau QR code avec votre application authenticator, puis saisissez le code ci-dessous.');
      } else {
        setMfaMsg(data.error || 'Erreur');
      }
    } catch {
      setMfaMsg('Erreur reseau.');
    }
  };

  const verifyMfaReset = async (code: string) => {
    try {
      const res = await fetch('/api/practitioner/mfa-verify-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totpCode: code }),
      });
      const data = await res.json();
      if (res.ok) {
        setMfaMsg('✓ MFA reconfigure avec succes.');
        setMfaQr(null);
        router.refresh();
      } else {
        setMfaMsg(data.error || 'Code invalide');
      }
    } catch {
      setMfaMsg('Erreur reseau.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Identité */}
      <div className="rounded-lg border border-border bg-background p-6">
        <h2 className="text-sm font-semibold">Identité</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <p className="mt-1 text-sm text-muted-foreground">{practitioner.email}</p>
            <p className="text-xs text-muted-foreground">Pour modifier votre email, contactez le support.</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Nom du cabinet</label>
            <div className="mt-1 flex gap-2">
              <input
                value={cabinetName}
                onChange={(e) => setCabinetName(e.target.value)}
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                onClick={saveCabinetName}
                disabled={savingCabinet || cabinetName === cabinet.name}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {savingCabinet ? '...' : 'Enregistrer'}
              </button>
            </div>
            {savedCabinet && <p className="mt-1 text-xs text-green-700">✓ Enregistré</p>}
          </div>
          <div>
            <p className="text-sm font-medium">URL publique</p>
            <p className="mt-1 text-sm font-mono text-muted-foreground">
              sensident.fr/c/{cabinet.slug}
            </p>
            <p className="text-xs text-muted-foreground">Le slug ne peut pas etre modifie apres creation.</p>
          </div>
        </div>
      </div>

      {/* Mot de passe */}
      <div className="rounded-lg border border-border bg-background p-6">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <KeyRound className="h-4 w-4" /> Mot de passe
        </h2>
        <form onSubmit={changePassword} className="mt-4 space-y-3">
          <div>
            <label className="block text-sm">Ancien mot de passe</label>
            <input
              type="password"
              value={oldPwd}
              onChange={(e) => setOldPwd(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm">Nouveau mot de passe</label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              minLength={12}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">12 caracteres min, 1 majuscule, 1 chiffre.</p>
          </div>
          {pwdMsg && (
            <p className={`text-xs ${pwdMsg.ok ? 'text-green-700' : 'text-red-700'}`}>{pwdMsg.text}</p>
          )}
          <button
            type="submit"
            disabled={savingPwd}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {savingPwd ? 'Modification...' : 'Modifier le mot de passe'}
          </button>
        </form>
      </div>

      {/* MFA */}
      <div className="rounded-lg border border-border bg-background p-6">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Smartphone className="h-4 w-4" /> Authentification a deux facteurs (MFA)
        </h2>
        <div className="mt-4">
          {practitioner.mfaEnabled ? (
            <p className="text-sm text-green-700">✓ MFA active. Pour reconfigurer (nouveau telephone par exemple), cliquez ci-dessous.</p>
          ) : (
            <p className="text-sm text-amber-700">⚠ MFA non active (ce cas ne devrait pas se presenter).</p>
          )}
          {mfaMsg && <p className="mt-2 text-sm">{mfaMsg}</p>}
          {mfaQr && (
            <div className="mt-4 rounded-md border border-border bg-muted/30 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mfaQr.qrCodeUrl} alt="QR code" className="mx-auto h-48 w-48" />
              <p className="mt-2 text-center text-xs">Secret : <code className="rounded bg-muted px-1">{mfaQr.secret}</code></p>
              <VerifyMfaInput onSubmit={verifyMfaReset} />
            </div>
          )}
          <button
            onClick={resetMfa}
            className="mt-3 inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            <Shield className="h-4 w-4" />
            {practitioner.mfaEnabled ? 'Reconfigurer le MFA (TOTP)' : 'Activer le MFA'}
          </button>

          {/* RGPD + UX : si praticien veut passer a email-code au lieu de TOTP,
              lien dedie. Meme niveau de securite, plus simple d'usage (pas
              d'app a installer). Le backend est deja pret (mfa-email/send +
              verify). Pour le MVP on documente juste le choix. */}
          <p className="mt-3 text-xs text-muted-foreground">
            Vous preferez recevoir un code par email a chaque connexion ?{' '}
            <a href="mailto:dpo@sensident.fr?subject=Bascule%20MFA%20vers%20email-code" className="underline">
              Demander la bascule
            </a>{' '}
            (nos equipes activent l&apos;option sur votre compte sous 24h).
          </p>
        </div>
      </div>

      {/* Look P2 — Branding newsletter */}
      <div className="rounded-lg border border-border bg-background p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Personnalisation newsletter</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Message de signature (optionnel)</label>
            <input
              type="text"
              value={brandingSignature}
              onChange={(e) => setBrandingSignature(e.target.value)}
              placeholder="Prenez soin de vous, Dr X"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground mt-0.5">Apparaît en bas de chaque newsletter. Max 120 caractères.</p>
          </div>
          {brandingMsg && (
            <p className={`text-sm ${brandingMsg.includes('sauvegardé') ? 'text-green-600' : 'text-red-500'}`}>{brandingMsg}</p>
          )}
          <button
            onClick={saveBranding}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Save size={14} />
            Sauvegarder
          </button>
        </div>
      </div>

      {/* Abonnement */}
      <SubscriptionSection subscription={subscription} />
    </div>
  );
}

/**
 * Section Abonnement avec integration Stripe Customer Portal.
 *
 * Cas :
 *  - subscription.hasStripeCustomer (cabinet deja client Stripe) :
 *      -> lien direct vers /api/billing/portal (Portal Stripe officiel)
 *  - sinon (free par defaut) :
 *      -> 3 cartes Free / Pro / Cabinet avec action 'Choisir' qui
 *         appelle /api/billing/checkout (cree le customer + checkout session)
 *  - query params geres : no_stripe_customer=1, stripe_success=1, stripe_cancelled=1
 */
function SubscriptionSection({ subscription }: { subscription: Props['subscription'] }) {
  return (
    <Suspense fallback={<div className="rounded-lg border border-border bg-background p-6 text-sm text-muted-foreground">Chargement...</div>}>
      <SubscriptionInner subscription={subscription} />
    </Suspense>
  );
}

const PLAN_CARDS = [
  {
    code: 'free',
    name: 'Free',
    price: '0 \u20AC',
    description: 'Pour demarrer.',
    features: ['Jusqu\'a 100 patients', '1 newsletter / mois', '1 template', 'Analytics basiques'],
    cta: 'Plan actuel',
  },
  {
    code: 'pro',
    name: 'Pro',
    price: '\u2014',
    description: 'Pour les praticiens actifs.',
    features: ['Jusqu\'a 1 000 patients', 'Newsletters illimitees*', 'Tous les templates', 'Analytics completes', 'Engagement patient'],
    cta: 'Choisir Pro',
  },
  {
    code: 'cabinet',
    name: 'Cabinet',
    price: '\u2014',
    description: 'Pour les structures multi-praticiens.',
    features: ['Jusqu\'a 10 000 patients', 'Tout Pro inclus', 'Support prioritaire', 'Personnalisation avancee'],
    cta: 'Choisir Cabinet',
  },
] as const;

function SubscriptionInner({ subscription }: { subscription: Props['subscription'] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const noCustomer = params.get('no_stripe_customer') === '1';
  const success = params.get('stripe_success') === '1';
  const cancelled = params.get('stripe_cancelled') === '1';

  // Efface le query param apres affichage (3s) pour eviter de re-trigger au refresh
  useEffect(() => {
    if (!noCustomer && !success && !cancelled) return;
    const t = setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete('no_stripe_customer');
      url.searchParams.delete('stripe_success');
      url.searchParams.delete('stripe_cancelled');
      router.replace(url.pathname + (url.search ? url.search : ''));
    }, 4000);
    return () => clearTimeout(t);
  }, [noCustomer, success, cancelled, router]);

  const choosePlan = async (plan: string) => {
    if (plan === 'free') {
      // Free = pas de checkout, on garde l'etat actuel
      return;
    }
    setLoadingPlan(plan);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError(data.error || 'Erreur lors de la creation du checkout.');
      }
    } catch {
      setCheckoutError('Erreur reseau.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const currentPlan = subscription?.plan ?? 'free';
  const isPaidCustomer = !!subscription?.hasStripeCustomer;

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h2 className="text-sm font-semibold">Abonnement</h2>

      {/* Bandesaux d'etat (query params) */}
      {success && (
        <div className="mt-4 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900">
          \u2713 Abonnement active. Bienvenue dans le plan {currentPlan.toUpperCase()}.
        </div>
      )}
      {cancelled && (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Checkout annule. Aucun changement applique.
        </div>
      )}
      {noCustomer && (
        <div className="mt-4 rounded-md border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
          Vous n'avez pas encore de compte client Stripe. Choisissez un plan ci-dessous pour en creer un.
        </div>
      )}
      {checkoutError && (
        <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          {checkoutError}
        </div>
      )}

      {/* Etat actuel */}
      {subscription && (
        <div className="mt-4 space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Plan actuel :</span>{' '}
            <span className="font-mono uppercase">{subscription.plan}</span>
            {subscription.isAmbassador && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                <Sparkles className="h-3 w-3" /> Ambassadeur
              </span>
            )}
          </p>
          <p>
            <span className="text-muted-foreground">Statut :</span>{' '}
            <span className={subscription.status === 'active' ? 'text-green-700' : 'text-amber-700'}>
              {subscription.status}
            </span>
          </p>
          {subscription.currentPeriodEnd && (
            <p>
              <span className="text-muted-foreground">Prochain renouvellement :</span>{' '}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString('fr-FR')}
            </p>
          )}

          {/* Acces Stripe Portal si deja client */}
          {isPaidCustomer && (
            <a
              href="/api/billing/portal"
              className="mt-3 inline-flex items-center gap-1 text-sm text-accent hover:underline"
            >
              Gerer mon abonnement (Stripe Portal) <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {/* Cartes de plans */}
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {PLAN_CARDS.map((p) => {
          const isCurrent = currentPlan === p.code;
          const isLoading = loadingPlan === p.code;
          return (
            <div
              key={p.code}
              className={`rounded-lg border p-4 ${
                isCurrent ? 'border-accent bg-accent/5' : 'border-border bg-background'
              }`}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold">{p.name}</h3>
                {isCurrent && (
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent-foreground">
                    Actuel
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
              <p className="mt-2 text-2xl font-bold">{p.price}<span className="text-xs text-muted-foreground"> / mois</span></p>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-1">
                    <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-accent" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => choosePlan(p.code)}
                disabled={isCurrent || isLoading}
                className="mt-4 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {isCurrent ? p.cta : isLoading ? 'Redirection...' : p.cta}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Le pricing exact sera affiche en phase commerciale. Le plan Free reste gratuit et sans limite de duree. Le coupon ambassadeur (100% offert 6 mois) est applicable sur Pro et Cabinet.
      </p>
    </div>
  );
}

function VerifyMfaInput({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [code, setCode] = useState('');
  return (
    <div className="mt-4 flex gap-2">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="000000"
        className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-center text-lg tracking-widest"
      />
      <button
        onClick={() => onSubmit(code)}
        disabled={code.length !== 6}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        Valider
      </button>
    </div>
  );
}
