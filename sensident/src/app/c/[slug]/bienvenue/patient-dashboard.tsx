'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';

interface Props {
  cabinet: {
    name: string;
    slug: string;
    contactEmail: string | null;
  };
  articles: Array<{ slug: string; title: string; excerpt: string | null }>;
}

export function PatientDashboard({ cabinet, articles }: Props) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const requestMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setMsg(null);
    try {
      const res = await fetch('/api/patient/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, cabinetSlug: cabinet.slug }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ ok: true, text: 'Lien magique envoye par email. Verifiez votre boite mail.' });
      } else {
        setMsg({ ok: false, text: data.error || 'Erreur' });
      }
    } catch {
      setMsg({ ok: false, text: 'Erreur reseau.' });
    } finally {
      setSending(false);
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
        {msg && (
          <p className={`mt-2 text-xs ${msg.ok ? 'text-green-700' : 'text-red-700'}`}>{msg.text}</p>
        )}
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
          Service offert par {cabinet.name} · Heberge en France
        </p>
      </footer>
    </div>
  );
}
