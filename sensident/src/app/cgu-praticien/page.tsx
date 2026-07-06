import { ContratPraticienContent } from '@/app/dashboard/account/contrat/page';
import Link from 'next/link';

export const metadata = {
  title: 'CGU Praticien — Sensident',
  description: 'Conditions générales d\'utilisation de la plateforme Sensident pour les praticiens.',
};

/**
 * Page publique /cgu-praticien
 *
 * RGPD / LCEN : les CGU praticien doivent être consultables AVANT l'inscription
 * (article 7 RGPD : consentement éclairé). Cette page est publique, accessible
 * sans auth, et affiche le contenu du contrat validé par le juridique.
 *
 * Le footer invite à s'inscrire ou à revenir à l'accueil.
 */
export default function CguPraticienPublicPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-semibold hover:text-primary">
            ← Retour à l'accueil
          </Link>
          <div className="flex gap-3">
            <Link
              href="/signup"
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-95"
            >
              S'inscrire
            </Link>
          </div>
        </div>
      </header>
      <ContratPraticienContent />
      <footer className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-8 text-center text-xs text-muted-foreground">
          <p>
            Pour toute question, contactez <a href="mailto:dpo@sensident.fr" className="underline">dpo@sensident.fr</a>
          </p>
        </div>
      </footer>
    </div>
  );
}