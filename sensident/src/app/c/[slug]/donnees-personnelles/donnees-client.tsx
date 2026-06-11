'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Shield,
  ShieldCheck,
  ToggleLeft,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Mail,
  Clock,
  Loader2,
} from 'lucide-react';

interface CabinetInfo {
  name: string;
  slug: string;
}

interface ConsentState {
  newsletter: boolean;
  analytics: boolean;
  reactions: boolean;
  version: string | null;
  timestamp: string | null;
}

interface Props {
  cabinet: CabinetInfo;
  consentState: ConsentState | null;
  sessionError: string | null;
}

type Finalite = 'newsletter' | 'analytics' | 'reactions';

const FINALITES_LABELS: Record<Finalite, string> = {
  newsletter: 'Newsletter',
  analytics: 'Mesure d\'audience',
  reactions: 'Reactions',
};

const FINALITES_DESC: Record<Finalite, string> = {
  newsletter:
    'Reception des newsletters de prevention (1 a 2 par mois) envoyees par votre praticien.',
  analytics:
    'Mesure anonyme de votre lecture des articles (duree, scroll) pour ameliorer le contenu.',
  reactions:
    'Enregistrement de vos reactions 👍/👎 sur les articles de maniere anonyme.',
};

const FINALITES_ICONS: Record<Finalite, React.ReactNode> = {
  newsletter: <Mail className="h-4 w-4" />,
  analytics: <Clock className="h-4 w-4" />,
  reactions: <ShieldCheck className="h-4 w-4" />,
};

export function DonneesPersonnellesClient({
  cabinet,
  consentState,
  sessionError,
}: Props) {
  // ---- Magic link (non-connecté) ----
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [magicMsg, setMagicMsg] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  // ---- Consentement : modification ----
  const [consents, setConsents] = useState<Record<Finalite, boolean>>(
    consentState
      ? {
          newsletter: consentState.newsletter,
          analytics: consentState.analytics,
          reactions: consentState.reactions,
        }
      : { newsletter: false, analytics: false, reactions: false }
  );
  const [savingConsent, setSavingConsent] = useState(false);
  const [consentMsg, setConsentMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  // ---- Export ----
  const [exportEmail, setExportEmail] = useState('');
  const [exportToken, setExportToken] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  // ---- Effacement ----
  const [forgetEmail, setForgetEmail] = useState('');
  const [forgetReason, setForgetReason] = useState('');
  const [forgetConfirmed, setForgetConfirmed] = useState(false);
  const [forgetting, setForgetting] = useState(false);
  const [forgetMsg, setForgetMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [buttonRed, setButtonRed] = useState(false);
  const forgetHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isConnected = !!consentState && !sessionError;

  // ============================================
  // Magic link
  // ============================================
  const requestMagicLink = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSending(true);
      setMagicMsg(null);
      try {
        const res = await fetch('/api/patient/magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, cabinetSlug: cabinet.slug }),
        });
        const data = await res.json();
        if (res.ok) {
          setMagicMsg({
            ok: true,
            text: 'Lien magique envoye par email. Verifiez votre boite mail et cliquez sur le lien pour acceder a cette page.',
          });
        } else {
          setMagicMsg({ ok: false, text: data.error || 'Erreur' });
        }
      } catch {
        setMagicMsg({ ok: false, text: 'Erreur reseau.' });
      } finally {
        setSending(false);
      }
    },
    [email, cabinet.slug]
  );

  // ============================================
  // Consentement : modification
  // ============================================
  const handleConsentChange = (finalite: Finalite, value: boolean) => {
    setConsents((prev) => ({ ...prev, [finalite]: value }));
    setConsentMsg(null);
  };

  const saveConsents = async () => {
    setSavingConsent(true);
    setConsentMsg(null);
    try {
      const finalites: Array<{ finalite: Finalite; consenti: boolean }> = (
        Object.entries(consents) as [Finalite, boolean][]
      ).map(([finalite, consenti]) => ({ finalite, consenti }));

      const res = await fetch('/api/patient/consent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalites, version: '1.0' }),
      });

      const data = await res.json();

      if (res.ok) {
        setConsentMsg({
          ok: true,
          text: 'Vos preferences ont ete enregistrees avec succes.',
        });
      } else if (res.status === 401) {
        setConsentMsg({
          ok: false,
          text: 'Session expiree. Veuillez vous reconnecter avec votre lien magique.',
        });
      } else {
        setConsentMsg({
          ok: false,
          text: data.error || "Erreur lors de l'enregistrement.",
        });
      }
    } catch {
      setConsentMsg({ ok: false, text: 'Erreur reseau.' });
    } finally {
      setSavingConsent(false);
    }
  };

  // ============================================
  // Export
  // ============================================
  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setExporting(true);
    setExportMsg(null);
    try {
      const res = await fetch('/api/patient/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: exportEmail,
          cabinetSlug: cabinet.slug,
          magicToken: exportToken,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setExportMsg({
          ok: false,
          text: data.error || 'Erreur lors de l\'export.',
        });
        setExporting(false);
        return;
      }

      // Telecharger le JSON
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sensident-export-${cabinet.slug}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportMsg({
        ok: true,
        text: 'Vos donnees ont ete telechargees avec succes.',
      });
    } catch {
      setExportMsg({ ok: false, text: 'Erreur reseau.' });
    } finally {
      setExporting(false);
    }
  };

  // ============================================
  // Effacement (droit a l'oubli)
  // ============================================
  const handleForgetHoverStart = () => {
    forgetHoverTimer.current = setTimeout(() => setButtonRed(true), 2000);
  };

  const handleForgetHoverEnd = () => {
    setButtonRed(false);
    if (forgetHoverTimer.current) {
      clearTimeout(forgetHoverTimer.current);
      forgetHoverTimer.current = null;
    }
  };

  const handleForget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgetConfirmed) return;
    setForgetting(true);
    setForgetMsg(null);
    try {
      const res = await fetch('/api/patient/forget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgetEmail,
          cabinetSlug: cabinet.slug,
          reason: forgetReason.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setForgetMsg({
          ok: true,
          text:
            data.message ||
            'Votre demande d\'effacement a bien ete prise en compte. Conformement a l\'article 12.3 du RGPD, elle sera traitee dans un delai maximal de 30 jours.',
        });
      } else {
        setForgetMsg({
          ok: false,
          text: data.error || "Erreur lors de l'effacement.",
        });
      }
    } catch {
      setForgetMsg({ ok: false, text: 'Erreur reseau.' });
    } finally {
      setForgetting(false);
    }
  };

  // ============================================
  // RENDER: Non connecté
  // ============================================
  if (!isConnected) {
    return (
      <div className="space-y-6">
        {/* Message d'explication */}
        <section className="rounded-lg border border-border bg-background p-6">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">
                Acces securise a vos donnees
              </h2>
              <p className="text-xs text-muted-foreground">
                Pour consulter ou gerer vos donnees personnelles, vous devez vous
                identifier via votre lien magique. Cette verification est exigee
                par le RGPD pour proteger vos informations.
              </p>
              {sessionError === 'session_expired' && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  Votre session a expire. Veuillez vous reconnecter pour acceder a
                  vos donnees.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Formulaire magic link */}
        <section className="rounded-lg border border-border bg-background p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Mail className="h-4 w-4" />
            Recevoir un lien magique
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Saisissez votre email. Vous recevrez un lien magique valable 24h pour
            acceder a vos donnees personnelles.
          </p>
          <form onSubmit={requestMagicLink} className="mt-3 flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={sending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {sending ? '...' : 'Recevoir le lien'}
            </button>
          </form>
          {magicMsg && (
            <p
              className={`mt-2 text-xs ${
                magicMsg.ok ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {magicMsg.text}
            </p>
          )}
        </section>

        {/* Lien retour */}
        <section className="text-center">
          <a
            href={`/c/${cabinet.slug}/bienvenue`}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            ← Retour a l&apos;espace patient
          </a>
        </section>
      </div>
    );
  }

  // ============================================
  // RENDER: Connecté
  // ============================================
  return (
    <div className="space-y-6">
      {/* ===== Section 1 : Consulter mes consentements ===== */}
      <section className="rounded-lg border border-border bg-background p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4" />
          Mes consentements actuels
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Voici l&apos;etat actuel de vos consentements. Vous pouvez les modifier
          dans la section ci-dessous.
        </p>

        <div className="mt-4 space-y-3">
          {(['newsletter', 'analytics', 'reactions'] as Finalite[]).map(
            (finalite) => (
              <div
                key={finalite}
                className="flex items-start gap-3 rounded-md border border-border p-3"
              >
                <span className="mt-0.5">
                  {FINALITES_ICONS[finalite]}
                </span>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {FINALITES_LABELS[finalite]}
                    </p>
                    {consentState?.[
                      finalite as keyof ConsentState
                    ] ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-950/30 dark:text-green-300">
                        <CheckCircle2 className="h-3 w-3" />
                        Consenti
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        <XCircle className="h-3 w-3" />
                        Non consenti
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {FINALITES_DESC[finalite]}
                  </p>
                </div>
              </div>
            )
          )}
        </div>

        {consentState?.timestamp && (
          <p className="mt-3 text-xs text-muted-foreground">
            Derniere mise a jour :{' '}
            {new Date(consentState.timestamp).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {consentState.version && ` (v${consentState.version})`}
          </p>
        )}
      </section>

      {/* ===== Section 2 : Modifier mes consentements ===== */}
      <section className="rounded-lg border border-border bg-background p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <ToggleLeft className="h-4 w-4" />
          Modifier mes consentements
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Vous pouvez modifier vos preferences a tout moment. Chaque modification
          est horodatee et conservee dans le registre des consentements.
        </p>

        <div className="mt-4 space-y-4">
          {(['newsletter', 'analytics', 'reactions'] as Finalite[]).map(
            (finalite) => (
              <label
                key={finalite}
                className="flex items-start gap-3 cursor-pointer rounded-md border border-border p-3 hover:bg-muted/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={consents[finalite]}
                  onChange={(e) =>
                    handleConsentChange(finalite, e.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {FINALITES_LABELS[finalite]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {FINALITES_DESC[finalite]}
                  </p>
                </div>
              </label>
            )
          )}
        </div>

        <button
          onClick={saveConsents}
          disabled={savingConsent}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {savingConsent ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              Enregistrer mes preferences
            </>
          )}
        </button>

        {consentMsg && (
          <div
            className={`mt-3 flex items-start gap-2 rounded-md p-3 text-xs ${
              consentMsg.ok
                ? 'border border-green-300 bg-green-50 text-green-900 dark:bg-green-950/30 dark:text-green-200'
                : 'border border-red-300 bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200'
            }`}
          >
            {consentMsg.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            )}
            <span>{consentMsg.text}</span>
          </div>
        )}
      </section>

      {/* ===== Section 3 : Exporter mes donnees ===== */}
      <section className="rounded-lg border border-border bg-background p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Download className="h-4 w-4" />
          Exporter mes donnees (droit a la portabilite)
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Conformement a l&apos;article 20 du RGPD, vous pouvez recevoir vos
          donnees dans un format structure (JSON). Pour confirmer votre identite,
          veuillez saisir votre email et un lien magique valide.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Vous pouvez obtenir un lien magique depuis la page d&apos;accueil de
          votre espace patient.
        </p>

        <form onSubmit={handleExport} className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="export-email"
              className="block text-xs font-medium"
            >
              Votre email
            </label>
            <input
              id="export-email"
              type="email"
              required
              value={exportEmail}
              onChange={(e) => setExportEmail(e.target.value)}
              placeholder="vous@exemple.fr"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="export-token"
              className="block text-xs font-medium"
            >
              Token du lien magique
            </label>
            <input
              id="export-token"
              type="text"
              required
              value={exportToken}
              onChange={(e) => setExportToken(e.target.value)}
              placeholder="Collez le token recu par email..."
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Collez l&apos;URL complete du lien magique ou uniquement le token.
            </p>
          </div>
          <button
            type="submit"
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Export en cours...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Telecharger mes donnees (JSON)
              </>
            )}
          </button>
        </form>

        {exportMsg && (
          <div
            className={`mt-3 flex items-start gap-2 rounded-md p-3 text-xs ${
              exportMsg.ok
                ? 'border border-green-300 bg-green-50 text-green-900 dark:bg-green-950/30 dark:text-green-200'
                : 'border border-red-300 bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200'
            }`}
          >
            {exportMsg.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            )}
            <span>{exportMsg.text}</span>
          </div>
        )}
      </section>

      {/* ===== Section 4 : Effacer mes donnees ===== */}
      <section className="rounded-lg border border-red-200 bg-background p-6 dark:border-red-900/50">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-red-800 dark:text-red-400">
          <Trash2 className="h-4 w-4" />
          Effacer mes donnees (droit a l&apos;oubli)
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Conformement a l&apos;article 17 du RGPD, vous pouvez demander
          l&apos;anonymisation de vos donnees personnelles. Cette action est
          irréversible : vos donnees seront anonymisees et vous ne recevrez plus
          aucun email de ce cabinet.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Conformement a l&apos;article 12.3 du RGPD, votre demande sera traitee
          dans un delai maximal de <strong>30 jours</strong>. Les preuves de
          consentement anterieur sont conservees 3 ans pour obligation legale
          (art. L.1110-4 CSP).
        </p>

        <form onSubmit={handleForget} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="forget-email"
              className="block text-xs font-medium"
            >
              Votre email
            </label>
            <input
              id="forget-email"
              type="email"
              required
              value={forgetEmail}
              onChange={(e) => setForgetEmail(e.target.value)}
              placeholder="vous@exemple.fr"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="forget-reason"
              className="block text-xs font-medium"
            >
              Raison (facultatif)
            </label>
            <input
              id="forget-reason"
              type="text"
              value={forgetReason}
              onChange={(e) => setForgetReason(e.target.value)}
              placeholder="Facultatif : pourquoi souhaitez-vous effacer vos donnees ?"
              maxLength={500}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Double confirmation : checkbox */}
          <label className="flex items-start gap-3 cursor-pointer rounded-md border border-red-200 p-3 dark:border-red-900/50">
            <input
              type="checkbox"
              checked={forgetConfirmed}
              onChange={(e) => setForgetConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
            />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-400">
                Je comprends que cette action est irreversible
              </p>
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
                <p className="text-xs text-red-700 dark:text-red-400">
                  En cochant cette case, je reconnais que mes donnees seront
                  definitivement anonymisees. Je ne pourrai plus recevoir de
                  newsletters ni acceder a mon espace patient avec cette adresse
                  email.
                </p>
              </div>
            </div>
          </label>

          {/* Bouton avec hover 2s → rouge */}
          <button
            type="submit"
            disabled={!forgetConfirmed || forgetting}
            onMouseEnter={handleForgetHoverStart}
            onMouseLeave={handleForgetHoverEnd}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-300 disabled:opacity-50 ${
              buttonRed && forgetConfirmed
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50'
            }`}
          >
            {forgetting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Anonymisation en cours...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                {buttonRed
                  ? 'Confirmer l\'effacement definitif de mes donnees'
                  : 'Effacer mes donnees'}
              </>
            )}
          </button>
          {!buttonRed && forgetConfirmed && (
            <p className="text-xs text-muted-foreground">
              Survolez le bouton pendant 2 secondes pour confirmer.
            </p>
          )}
        </form>

        {forgetMsg && (
          <div
            className={`mt-3 flex items-start gap-2 rounded-md p-3 text-xs ${
              forgetMsg.ok
                ? 'border border-green-300 bg-green-50 text-green-900 dark:bg-green-950/30 dark:text-green-200'
                : 'border border-red-300 bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200'
            }`}
          >
            {forgetMsg.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            )}
            <span>{forgetMsg.text}</span>
          </div>
        )}
      </section>

      {/* Note legale */}
      <section className="rounded-lg border border-border bg-background p-4">
        <p className="text-xs text-muted-foreground">
          Conformement au RGPD, vous disposez d&apos;un droit d&apos;acces,
          de rectification, d&apos;opposition, de portabilite et d&apos;effacement
          de vos donnees. Pour toute question, contactez le DPO a{' '}
          <a
            href="mailto:dpo@sensident.fr"
            className="underline hover:text-foreground"
          >
            dpo@sensident.fr
          </a>
          .
        </p>
      </section>
    </div>
  );
}
