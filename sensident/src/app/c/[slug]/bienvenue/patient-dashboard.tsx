'use client';

import { useState } from 'react';
import { Mail, Save, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  cabinet: {
    name: string;
    slug: string;
    contactEmail: string | null;
  };
  articles: Array<{ slug: string; title: string; excerpt: string | null }>;
}

type Finalite = 'newsletter' | 'analytics' | 'reactions';

interface ConsentItem {
  finalite: Finalite;
  consenti: boolean;
}

export function PatientDashboard({ cabinet, articles }: Props) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [magicMsg, setMagicMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Consentement granulaire
  const [consents, setConsents] = useState<Record<Finalite, boolean>>({
    newsletter: false,
    analytics: false,
    reactions: false,
  });
  const [savingConsent, setSavingConsent] = useState(false);
  const [consentMsg, setConsentMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const requestMagicLink = async (e: React.FormEvent) => {
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
        setMagicMsg({ ok: true, text: 'Lien magique envoye par email. Verifiez votre boite mail.' });
      } else {
        setMagicMsg({ ok: false, text: data.error || 'Erreur' });
      }
    } catch {
      setMagicMsg({ ok: false, text: 'Erreur reseau.' });
    } finally {
      setSending(false);
    }
  };

  const handleConsentChange = (finalite: Finalite, value: boolean) => {
    setConsents((prev) => ({ ...prev, [finalite]: value }));
    setConsentMsg(null);
  };

  const saveConsents = async () => {
    setSavingConsent(true);
    setConsentMsg(null);
    try {
      const finalites: ConsentItem[] = (
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
          text: 'Vos preferences ont ete enregistrees. Redirection vers la bibliotheque...',
        });

        // Rediriger vers la bibliotheque apres 2 secondes
        setTimeout(() => {
          window.location.href = `/c/${cabinet.slug}/bibliotheque`;
        }, 2000);
      } else if (res.status === 401) {
        setConsentMsg({
          ok: false,
          text: 'Session expiree. Veuillez vous reconnecter avec votre lien magique ci-dessous.',
        });
      } else {
        setConsentMsg({ ok: false, text: data.error || 'Erreur lors de l\'enregistrement.' });
      }
    } catch {
      setConsentMsg({ ok: false, text: 'Erreur reseau.' });
    } finally {
      setSavingConsent(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Acces a mon espace */}
      <section className="rounded-lg border border-border bg-background p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Mail className="h-4 w-4" />
          Acceder a mon espace
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Pour revenir consulter votre historique, saisissez votre email. Vous recevrez un lien magique valable 24h.
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
          <p className={`mt-2 text-xs ${magicMsg.ok ? 'text-green-700' : 'text-red-700'}`}>{magicMsg.text}</p>
        )}
      </section>

      {/* Preferences de consentement */}
      <section className="rounded-lg border border-border bg-background p-6">
        <h2 className="text-sm font-semibold">Mes preferences de consentement</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Vous pouvez choisir librement les finalites pour lesquelles vous consentez.
          Votre choix est enregistre et vous pouvez le modifier a tout moment.
        </p>

        <div className="mt-4 space-y-4">
          {/* Newsletter */}
          <label className="flex items-start gap-3 cursor-pointer rounded-md border border-border p-3 hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={consents.newsletter}
              onChange={(e) => handleConsentChange('newsletter', e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <div className="flex-1">
              <p className="text-sm font-medium">Newsletter</p>
              <p className="text-xs text-muted-foreground">
                J'accepte de recevoir par email les newsletters de prevention du Dr {cabinet.name}{' '}
                (1 a 2 par mois maximum). Je peux me desabonner a tout moment.
              </p>
            </div>
          </label>

          {/* Analytics */}
          <label className="flex items-start gap-3 cursor-pointer rounded-md border border-border p-3 hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={consents.analytics}
              onChange={(e) => handleConsentChange('analytics', e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <div className="flex-1">
              <p className="text-sm font-medium">Analytics (suivi de lecture)</p>
              <p className="text-xs text-muted-foreground">
                J'accepte que ma lecture des articles soit suivie de maniere anonyme
                (duree de lecture, scroll) pour permettre au cabinet d'ameliorer le contenu.
                Aucune donnee nominative n'est partagee.
              </p>
            </div>
          </label>

          {/* Reactions */}
          <label className="flex items-start gap-3 cursor-pointer rounded-md border border-border p-3 hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={consents.reactions}
              onChange={(e) => handleConsentChange('reactions', e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <div className="flex-1">
              <p className="text-sm font-medium">Reactions</p>
              <p className="text-xs text-muted-foreground">
                J'accepte que mes reactions (pouce 👍/👎) sur les articles soient enregistrees
                de maniere anonyme pour aider le cabinet a choisir les sujets qui m'interessent.
              </p>
            </div>
          </label>
        </div>

        {/* Bouton Enregistrer */}
        <button
          onClick={saveConsents}
          disabled={savingConsent}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          {savingConsent ? (
            '...'
          ) : (
            <>
              <Save className="h-4 w-4" />
              Enregistrer mes preferences
            </>
          )}
        </button>

        {/* Messages */}
        {consentMsg && (
          <div
            className={`mt-3 flex items-start gap-2 rounded-md p-3 text-xs ${
              consentMsg.ok
                ? 'border border-green-300 bg-green-50 text-green-900 dark:bg-green-950/30'
                : 'border border-red-300 bg-red-50 text-red-900 dark:bg-red-950/30'
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

      {/* Informations legales */}
      <section className="rounded-lg border border-border bg-background p-4">
        <p className="text-xs text-muted-foreground">
          Vous pouvez retirer votre consentement a tout moment depuis votre espace patient
          ou via le lien de desabonnement dans chaque email.{' '}
          <a href="/politique-de-confidentialite" className="underline hover:text-foreground">
            Politique de confidentialite
          </a>
        </p>
      </section>

      {/* Articles disponibles */}
      <section>
        <h2 className="text-sm font-semibold">Articles a decouvrir</h2>
        <div className="mt-3 space-y-3">
          {articles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun article publie pour le moment.</p>
          ) : (
            articles.map((a) => (
              <a
                key={a.slug}
                href={`/articles/${a.slug}?from=site&c=${cabinet.slug}`}
                className="block rounded-lg border border-border bg-background p-4 transition hover:border-primary hover:shadow-sm"
              >
                <h3 className="font-semibold">{a.title}</h3>
                {a.excerpt && <p className="mt-1 text-sm text-muted-foreground">{a.excerpt}</p>}
              </a>
            ))
          )}
        </div>
      </section>

      {/* Bloc contact minimal */}
      {cabinet.contactEmail && (
        <section className="rounded-lg border border-border bg-background p-6">
          <h2 className="text-sm font-semibold">{cabinet.name}</h2>
          <div className="mt-3 space-y-2 text-sm">
            <p>
              <strong>Email :</strong>{' '}
              <a href={`mailto:${cabinet.contactEmail}`} className="text-accent underline">
                {cabinet.contactEmail}
              </a>
            </p>
          </div>
        </section>
      )}

      <footer className="pt-4 text-center text-xs text-muted-foreground">
        <p>
          <a href="/desabonnement" className="underline">Se desabonner</a>
          {' · '}
          <a href={`/c/${cabinet.slug}/bienvenue`} className="underline">Gerer mes preferences</a>
          {' · '}
          Service offert par {cabinet.name} · Heberge en France
        </p>
      </footer>
    </div>
  );
}
