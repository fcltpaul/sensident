import { Logo } from '@/components/logo';
import Link from 'next/link';
import { FaqList, type FaqItem } from './faq-list';

export const dynamic = 'force-static';
export const metadata = {
  title: 'FAQ — Sensident',
  description:
    "Questions fréquentes sur Sensident : pour les patients (inscription, désabonnement, données) et pour les praticiens (installation, conformité, coût).",
};

const ITEMS: FaqItem[] = [
  // PATIENT
  {
    audience: 'patient',
    q: 'Comment m\u2019inscris-je aux newsletters de mon dentiste\u00a0?',
    a: "Votre dentiste vous a partagé un QR code ou un lien. Scannez le QR code depuis votre fauteuil, ou cliquez sur le lien. Vous saisissez votre email, vous acceptez les CGU, et vous recevez le premier article. Pas de mot de passe \u00e0 cr\u00e9er.",
  },
  {
    audience: 'patient',
    q: 'Puis-je me d\u00e9sinscrire\u00a0?',
    a: "Oui, en un clic. Chaque newsletter contient un lien de d\u00e9sabonnement en bas du message. Vous pouvez aussi demander la suppression compl\u00e8te de vos donn\u00e9es via la page \"Donn\u00e9es personnelles\" de votre espace patient.",
  },
  {
    audience: 'patient',
    q: 'Qui voit mes donn\u00e9es\u00a0?',
    a: "Uniquement votre dentiste, et uniquement les statistiques agr\u00e9g\u00e9es (anonymis\u00e9es \u00e0 partir de 5 patients). Aucune donn\u00e9e n'est revendue, aucune publicit\u00e9 ne vous est adress\u00e9e, aucune IA ne lit vos \u00e9changes.",
  },
  {
    audience: 'patient',
    q: 'Comment supprimer mon compte\u00a0?',
    a: "Depuis votre espace patient, page \"Donn\u00e9es personnelles\", bouton \"Supprimer mes donn\u00e9es\". L'op\u00e9ration est imm\u00e9diate et irr\u00e9versible, conform\u00e9ment au RGPD.",
  },
  {
    audience: 'patient',
    q: 'Les articles sont-ils fiables\u00a0?',
    a: "Oui. Tous les articles sont r\u00e9dig\u00e9s par des chirurgiens-dentistes et valid\u00e9s par un comit\u00e9 scientifique avant publication. Aucune IA g\u00e9n\u00e9rative n'est utilis\u00e9e pour la r\u00e9daction.",
  },
  // PRATICIEN
  {
    audience: 'praticien',
    q: 'Combien de temps prend la mise en route\u00a0?',
    a: "L'inscription prend 2 minutes. Vous t\u00e9l\u00e9chargez un QR code \u00e0 imprimer, vous choisissez un premier article, vous cliquez envoyer. Le tout en moins de 5 minutes.",
  },
  {
    audience: 'praticien',
    q: 'Suis-je en conformit\u00e9 avec le RGPD et l\u2019ONCD\u00a0?',
    a: "Oui. Opt-in granulaire par finalit\u00e9 (newsletter, analytics, r\u00e9actions), consentement horodat\u00e9, droit \u00e0 l'oubli en 1 clic, audit logs immuables, h\u00e9bergement certifi\u00e9 HDS. Pas de comp\u00e9rage, pas d'avantage en nature. Validation effectu\u00e9e avec des juristes sp\u00e9cialis\u00e9s en sant\u00e9.",
  },
  {
    audience: 'praticien',
    q: 'Combien \u00e7a co\u00fbte\u00a0?',
    a: "Gratuit pendant 6 mois pour les praticiens ambassadeurs. Ensuite, 49 \u20ac HT/mois. Aucuns frais cach\u00e9s, pas de commission sur les envois, pas de co\u00fbt par patient. Annulable \u00e0 tout moment.",
  },
  {
    audience: 'praticien',
    q: 'Puis-je personnaliser les newsletters\u00a0?',
    a: "Oui. Couleur d'accent, signature, logo cabinet, message libre. Une fois configur\u00e9, c'est r\u00e9utilis\u00e9 pour tous vos envois. Vous gardez la main sur le ton et la pr\u00e9sentation.",
  },
  {
    audience: 'praticien',
    q: 'Comment fonctionnent les analytics\u00a0?',
    a: "Vous voyez le taux d'ouverture, le temps de lecture moyen, les articles les plus lus, la r\u00e9tention mensuelle, le tout anonymis\u00e9 et agr\u00e9g\u00e9. Aucune donn\u00e9e individuelle n'est expos\u00e9e. Conforme AIPD.",
  },
  // MIXTES
  {
    audience: 'both',
    q: "O\u00f9 sont h\u00eberg\u00e9es les donn\u00e9es\u00a0?",
    a: "Chez un h\u00e9bergeur certifi\u00e9 HDS (H\u00e9bergeur de Donn\u00e9es de Sant\u00e9), en France. Chiffrement au repos et en transit, audit logs, sauvegardes. Voir la page S\u00e9curit\u00e9 pour les d\u00e9tails techniques.",
  },
  {
    audience: 'both',
    q: "Sensident utilise-t-il de l\u2019IA\u00a0?",
    a: "Non. Aucune IA g\u00e9n\u00e9rative, aucun embedding, aucune d\u00e9cision automatis\u00e9e. Les articles sont r\u00e9dig\u00e9s par des humains et valid\u00e9s par un comit\u00e9 scientifique. Co\u00fbt marginal z\u00e9ro, pr\u00e9dictibilit\u00e9 maximale.",
  },
];

export default function FaqPage() {
  // schema.org FAQPage pour SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: ITEMS.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: it.a,
      },
    })),
  };

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

      <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700 mb-3">Foire aux questions</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Vos questions, nos r\u00e9ponses
          </h1>
          <p className="mt-3 text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            12 questions class\u00e9es par audience. Si vous ne trouvez pas votre r\u00e9ponse,
            <Link href="/contact" className="underline"> contactez-nous</Link>.
          </p>
        </div>

        <div className="mt-8">
          <FaqList items={ITEMS} />
        </div>

        <div className="mt-10 rounded-lg border border-border bg-muted/20 p-5 text-center text-sm">
          <p className="font-medium">Une question sp\u00e9cifique\u00a0?</p>
          <p className="mt-1 text-muted-foreground">
            \u00c9crivez \u00e0 <a className="underline" href="mailto:contact@sensident.fr">contact@sensident.fr</a>.
          </p>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}