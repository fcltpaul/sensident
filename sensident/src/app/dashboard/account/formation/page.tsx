import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionFromCookie } from '@/lib/auth';
import { ChevronRight, BookOpen, Mail, FileText, Shield, BarChart3 } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Kit formation presentiel — Sensident' };

const SECTIONS = [
  {
    icon: BookOpen,
    title: "Le pitch 1 minute",
    points: [
      "Sensident : prevention bucco-dentaire automatisee par email.",
      "Le patient recoit chaque mois un article valide de votre choix, signe a votre nom.",
      "3 minutes par mois. Aucun patient a relancer. Aucune donnee a saisir.",
      "Conforme HDS, RGPD, sans IA, sans publicite.",
    ],
  },
  {
    icon: FileText,
    title: "Le pitch 5 minutes",
    points: [
      "Histoire : 80% des caries evitables, mais 50% des patients oublient les conseils entre 2 RDV.",
      "Pain point praticien : pas le temps d'eduquer au fauteuil, pas le budget de faire des newsletters manuelles.",
      "Solution : catalogue de 9 articles valides scientifiquement, envoi en 1 clic, signature cabinet, stats anonymes.",
      "ROI : 1 patient qui reste 2 ans = 1500 EUR. Cout = 49 EUR/HT/mois apres 6 mois d'essai gratuit.",
      "Onboarding : 2 min (signup) + 30 sec QR code au fauteuil + 3 min par mois pour envoyer.",
    ],
  },
  {
    icon: Shield,
    title: "Les 5 objections frequentes",
    points: [
      "'C'est pas marketing ?' -> Non. Article medical valide, pas de CTA commercial, ton neutre. C'est de l'education, pas de la promo.",
      "'Et la conformite ?' -> HDS certifie, RGPD by design, opt-in granulaire, droit a l'oubli en 1 clic, audit logs.",
      "'Et si un patient se desinscrit ?' -> Tant mieux, il fait le tri. Analytics anonymes par cabinet.",
      "'Combien de temps ?' -> 3 min par mois. Wizard post-signup fait la plus grosse partie.",
      "'C'est pas un peu startup ?' -> Le rendu est sobre, signe de votre nom. Aucun cote 'tech' visible.",
    ],
  },
  {
    icon: Mail,
    title: "Demo en direct (30 sec)",
    points: [
      "Ouvrir /dashboard/newsletter/compose.",
      "Selectionner un article (ex: 'Soins de prevention reguliers').",
      "Cliquer 'Composer avec' -> wizard 4 etapes.",
      "Personnaliser la signature, previsualiser, envoyer.",
      "Demander a l'audience de scanner le QR code de leur telephone pour tester.",
    ],
  },
  {
    icon: BarChart3,
    title: "Les chiffres cles",
    points: [
      "9 articles valides en catalogue (categorie prevention).",
      "Lecture moyenne : 4 min/article.",
      "Taux d'ouverture typique cabinet dentaire : 38-45% (vs 22% industrie sante).",
      "ROI conserve 1 patient 2 ans = 1500 EUR. Cout annuel = 588 EUR HT.",
      "Demarrage : 6 mois gratuits ambassadeur.",
    ],
  },
];

export default async function FormationPage() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Kit formation presentiel</h1>
        <p className="text-sm text-muted-foreground">
          Pour vos formations pratiques (amassadeurs, KOL, écoles dentaires).
          Imprimable en A4 / exportable en PDF via la fonction navigateur.
        </p>
      </header>

      <div className="space-y-5">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <section key={s.title} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden={true} />
                </div>
                <h2 className="text-base font-semibold">{s.title}</h2>
              </div>
              <ul className="mt-3 space-y-1.5">
                {s.points.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                    <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden={true} />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-5 text-sm">
        <h3 className="text-base font-semibold">Plan d&apos;une session type (1h)</h3>
        <ol className="mt-3 space-y-2 text-xs">
          <li><strong>0-5 min</strong> : Pitch 1 minute + tour de table besoins.</li>
          <li><strong>5-15 min</strong> : Demo live du composer devant 1 dentiste pilote.</li>
          <li><strong>15-30 min</strong> : Onboarding chaque participant (signup + branding).</li>
          <li><strong>30-50 min</strong> : Generation de QR codes, affichage au fauteuil, tests.</li>
          <li><strong>50-60 min</strong> : Q&A + presentation des analytics + feedbacks.</li>
        </ol>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
        <p>
          Pour approfondir, voir la{' '}
          <Link href="/faq" className="underline">
            FAQ officielle
          </Link>{' '}
          et la page{' '}
          <Link href="/securite" className="underline">
            Securite & conformite
          </Link>
          .
        </p>
      </div>
    </div>
  );
}