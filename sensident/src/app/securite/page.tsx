import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Shield, Lock, Database, Server, Eye, FileCheck2, KeyRound, ScrollText } from 'lucide-react';

export const dynamic = 'force-static';
export const metadata = {
  title: 'Sécurité — Sensident',
  description:
    "Architecture de sécurité Sensident : hébergement HDS, chiffrement, isolation multi-tenant, audit logs, conformité RGPD.",
};

const PILLARS = [
  {
    icon: Database,
    title: 'Hébergement HDS',
    desc: "Toutes les données sont stockées chez un hébergeur certifié Hébergeur de Données de Santé (HDS), conformément à l'article L.1111-8 du Code de la santé publique et au référentiel de la HAS. Hébergement en France, sauvegardes chiffrées.",
  },
  {
    icon: Lock,
    title: 'Chiffrement de bout en bout',
    desc: "Chiffrement au repos (AES-256) et en transit (TLS 1.3). Les emails patients transitent par Brevo (notre routeur SMTP), lui-même conforme RGPD avec DPA signé.",
  },
  {
    icon: Server,
    title: 'Isolation multi-tenant',
    desc: "Chaque cabinet est isolé par un identifiant unique (cabinet_id). Toutes les requêtes SQL sont scopées par cabinet, à la fois côté applicatif et côté base (RLS PostgreSQL activé sur Neon).",
  },
  {
    icon: Eye,
    title: 'Audit logs immuables',
    desc: "Chaque action sensible (connexion praticien, envoi newsletter, modification d'un article, suppression patient) est tracée avec horodatage, acteur et cible. Aucune suppression possible côté utilisateur.",
  },
  {
    icon: KeyRound,
    title: 'Authentification forte',
    desc: "Les praticiens s'authentifient via un couple email/mot de passe + un second facteur TOTP (Google Authenticator, 1Password, etc.). Les patients ne créent pas de mot de passe : lien magique à durée de vie courte.",
  },
  {
    icon: ScrollText,
    title: 'AIPD & RGPD by design',
    desc: "Analyse d'Impact Relative à la Protection des Données réalisée en amont, validée par un juriste spécialisé. Privacy by design : opt-in granulaire, minimisation des données, durée de rétention documentée (cf. politique de confidentialité).",
  },
  {
    icon: FileCheck2,
    title: 'Pas de dépendance IA',
    desc: "Aucune API d'IA, aucun embedding, aucune décision automatisée. Articles rédigés par des humains, validés par un comité scientifique. Coût marginal 0 € par patient.",
  },
];

export default function SecuritePage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="sm" showText={false} />
            <span className="text-sm font-semibold text-foreground">Sensident</span>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition">
            ← Accueil
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <div className="text-center">
          <Shield className="mx-auto h-8 w-8 text-blue-700" aria-hidden={true} />
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.15em] text-blue-700">Architecture & sécurité</p>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
            Vos données sont traitées avec le niveau d&apos;exigence d&apos;un dossier médical.
          </h1>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            On a construit Sensident comme si c&apos;était pour nos propres données de santé.
            Voici les 7 piliers techniques qui protègent vos patients et votre cabinet.
          </p>
        </div>

        <div className="mt-10 space-y-4">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <article
                key={p.title}
                className="flex items-start gap-4 rounded-xl border border-border bg-card p-5"
              >
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <Icon className="h-5 w-5" aria-hidden={true} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-foreground">{p.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-10 rounded-lg border border-blue-200 bg-blue-50/30 p-5">
          <h2 className="text-base font-semibold">Pour aller plus loin</h2>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li>
              <Link href="/politique-confidentialite" className="underline">
                Politique de confidentialité
              </Link>{' '}
              — détail des traitements, durées de rétention, exercice des droits.
            </li>
            <li>
              <Link href="/mentions-legales" className="underline">
                Mentions légales
              </Link>{' '}
              — éditeur, hébergeur, contact DPO.
            </li>
            <li>
              <Link href="/faq" className="underline">
                FAQ
              </Link>{' '}
              — 12 réponses aux questions les plus fréquentes.
            </li>
          </ul>
        </div>

        <div className="mt-8 rounded-lg border border-border bg-muted/20 p-5 text-sm">
          <p className="font-medium text-foreground">Vous êtes juriste ou RSSI\u00a0?</p>
          <p className="mt-1 text-muted-foreground">
            L&apos;AIPD complète (30 pages), les DPA sous-traitants et le registre des traitements sont
            disponibles sur demande motivée à <a className="underline" href="mailto:dpo@sensident.fr">dpo@sensident.fr</a>.
          </p>
        </div>
      </section>
    </main>
  );
}