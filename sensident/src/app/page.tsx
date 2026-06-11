import Link from 'next/link';
import Image from 'next/image';
import { Logo } from '@/components/logo';
import {
  Shield, Lock, Heart, Smartphone, FileText, Users, MessageSquare,
  BarChart3, Send, CheckCircle, ArrowRight, Star, Building2
} from 'lucide-react';

export const dynamic = 'force-static';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16 items-center">

            {/* Left — tagline + CTA double */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                Hébergé en France · Certifié HDS · Sans IA
              </div>

              <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl leading-tight">
                La prévention bucco-dentaire,
                <span className="text-primary block"> offerte par votre dentiste.</span>
              </h1>

              <p className="text-lg text-muted-foreground max-w-lg">
                Sensident permet aux cabinets dentaires d&apos;envoyer des newsletters de prévention
                à leurs patients. Des articles validés scientifiquement, un tableau de bord analytics,
                le tout 100 % conforme RGPD et HDS.
              </p>

              {/* Double CTA — selon qui arrive */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <div className="space-y-1">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 w-full sm:w-auto"
                  >
                    <Building2 className="h-4 w-4" />
                    Je suis dentiste
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <p className="text-[11px] text-muted-foreground text-center sm:text-left">
                    Créer un compte praticien
                  </p>
                </div>

                <div className="space-y-1">
                  <Link
                    href="#pour-qui"
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-medium hover:bg-muted w-full sm:w-auto"
                  >
                    <Heart className="h-4 w-4" />
                    Je suis patient·e
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <p className="text-[11px] text-muted-foreground text-center sm:text-left">
                    En parler à mon dentiste
                  </p>
                </div>
              </div>
            </div>

            {/* Right — mockup / visuel */}
            <div className="rounded-xl overflow-hidden border border-border bg-muted/30 shadow-sm">
              <Image
                src="/images/hero-banner.png"
                alt="Sensident — tableau de bord praticien"
                width={1920}
                height={1080}
                className="w-full h-auto"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== POUR QUI — séparation des 2 personas ===== */}
      <section id="pour-qui" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <h2 className="text-3xl font-bold text-center mb-4">À qui s&apos;adresse Sensident ?</h2>
        <p className="text-muted-foreground text-center max-w-xl mx-auto mb-12">
          Une seule plateforme, deux usages. Selon qui vous êtes, vous n&apos;arrivez pas par la même porte.
        </p>

        <div className="grid gap-8 md:grid-cols-2 md:gap-12">

          {/* Carte dentiste */}
          <div className="rounded-2xl border border-border bg-gradient-to-b from-accent/5 to-background p-8 space-y-6">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Vous êtes chirurgien-dentiste</h3>
              <p className="text-muted-foreground mt-2">
                Offrez un service de prévention à vos patients sans alourdir votre charge de travail.
                Quelques clics par mois, et vos patients reçoivent des articles validés par un comité scientifique.
              </p>
            </div>
            <ul className="space-y-3">
              {[
                'Catalogue de 10 articles prêts à envoyer (validation scientifique)',
                '5 templates visuels personnalisables (logo, signature, couleurs)',
                'Dashboard analytics : taux d\'ouverture, durée de lecture, réactions',
                'Conformité RGPD/HDS incluse — pas de risque pour vous',
                'Lien d\'invitation patient : QR code au fauteuil ou email'
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              Créer un compte praticien <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Carte patient */}
          <div className="rounded-2xl border border-border bg-gradient-to-b from-primary/5 to-background p-8 space-y-6">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Heart className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Vous êtes patient·e</h3>
              <p className="text-muted-foreground mt-2">
                Vous voulez recevoir des conseils de prévention dentaire fiables, sans pub
                et directement de la part de votre dentiste ? Parlez-lui de Sensident.
              </p>
            </div>
            <ul className="space-y-3">
              {[
                'Articles rédigés et validés par un comité scientifique (Dr François Thibault)',
                '5 slides par newsletter : rapide à lire sur mobile',
                'Version longue disponible pour creuser',
                'Réagissez 👍👎 — votre dentiste voit uniquement des agrégats anonymes',
                'Zéro publicité, zéro revente de données, zéro IA'
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="#convaincre"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              Comment en parler à mon dentiste <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* ===== COMMENT CONVAINCRE SON DENTISTE ? (section patient) ===== */}
      <section id="convaincre" className="bg-muted/30 border-y border-border">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-20 text-center space-y-6">
          <Heart className="h-8 w-8 text-primary mx-auto" />
          <h2 className="text-2xl font-bold">Comment en parler à mon dentiste ?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Si vous trouvez l&apos;idée utile, le meilleur moyen est d&apos;en parler directement
            à votre praticien lors de votre prochaine visite. Voici ce que vous pouvez lui dire :
          </p>
          <blockquote className="italic text-muted-foreground border-l-4 border-primary pl-4 text-left max-w-lg mx-auto bg-background/50 p-4 rounded-r-lg">
            «&nbsp;J&apos;ai découvert un service qui s&apos;appelle Sensident — ça permet d&apos;envoyer
            des newsletters de prévention dentaire aux patients, tout est déjà prêt et conforme
            RGPD. Tu devrais jeter un œil, ça prend 5 minutes par mois.&nbsp;»
          </blockquote>
          <p className="text-sm text-muted-foreground">
            Ou partagez simplement le lien :{' '}
            <Link href="/" className="text-primary underline">sensident.fr</Link>
          </p>
        </div>
      </section>

      {/* ===== AVANTAGES DENTISTE — plus détaillés ===== */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <h2 className="text-3xl font-bold text-center mb-4">Pourquoi les dentistes adoptent Sensident</h2>
        <p className="text-muted-foreground text-center max-w-xl mx-auto mb-12">
          Pas une usine à gaz. L&apos;outil tient en 3 actions par mois.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<Send className="h-6 w-6" />}
            title="1. Choisissez un article"
            description="Parcourez le catalogue validé par Dr François Thibault. 10 articles prêts, plus chaque trimestre."
          />
          <FeatureCard
            icon={<FileText className="h-6 w-6" />}
            title="2. Personnalisez le template"
            description="5 templates visuels. Ajoutez votre logo, votre signature, vos couleurs. Prévisualisez avant d'envoyer."
          />
          <FeatureCard
            icon={<BarChart3 className="h-6 w-6" />}
            title="3. Suivez l'impact"
            description="Taux d'engagement, durée de lecture, réactions, rétention à M+1/M+2. Données agrégées et anonymisées."
          />
        </div>

        <div className="grid gap-6 md:grid-cols-3 mt-6">
          <FeatureCard
            icon={<Shield className="h-6 w-6" />}
            title="Conforme HDS / RGPD"
            description="Les données de santé sont hébergées en France sur infrastructure certifiée. Zéro risque pour le cabinet."
          />
          <FeatureCard
            icon={<Lock className="h-6 w-6" />}
            title="Sans IA"
            description="Aucune API LLM, aucun embedding, aucun ML. Algorithmes déterministes et auditables."
          />
          <FeatureCard
            icon={<MessageSquare className="h-6 w-6" />}
            title="Valorisant pour le cabinet"
            description="Service de prévention offert par le Dr X. Renforce le lien de confiance avec les patients."
          />
        </div>
      </section>

      {/* ===== COMMENT ÇA MARCHE (pour le patient) ===== */}
      <section className="bg-muted/30 border-y border-border">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
          <h2 className="text-2xl font-bold text-center mb-10">Comment ça marche pour le patient</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <Step
              n={1}
              icon={<Users className="h-5 w-5" />}
              title="Votre dentiste vous invite"
              description="Au fauteuil via un QR code, ou par email avec un lien personnel sécurisé."
            />
            <Step
              n={2}
              icon={<FileText className="h-5 w-5" />}
              title="Vous recevez des articles"
              description="1 à 2 newsletters par mois. Lecture rapide en 5 slides, ou article long si vous voulez creuser."
            />
            <Step
              n={3}
              icon={<Smartphone className="h-5 w-5" />}
              title="Vous apprenez à votre rythme"
              description="Mobile-first. Pas de pub. Pas de revente de données. Juste de la prévention fiable."
            />
          </div>
        </div>
      </section>

      {/* ===== TÉMOIGNAGE (placeholder — à remplacer par un vrai) ===== */}
      <section className="mx-auto max-w-4xl px-6 py-16 md:py-20 text-center space-y-4">
        <Star className="h-6 w-6 text-primary mx-auto" />
        <blockquote className="text-lg italic text-muted-foreground max-w-lg mx-auto">
          «&nbsp;Je voulais faire de la prévention sans alourdir mon secrétariat.
          Sensident me fait gagner un temps fou et les patients apprécient.&nbsp;»
        </blockquote>
        <p className="font-semibold">— Dr F. T., cabinet libéral</p>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="bg-primary/5 border-t border-border">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-20 text-center space-y-6">
          <h2 className="text-3xl font-bold">Prêt à essayer ?</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Créez votre compte en 2 minutes. Aucune carte bancaire demandée.
            Les 6 premiers mois sont offerts pour les ambassadeurs.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Créer un compte praticien
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md border border-border px-6 py-3 text-sm font-medium hover:bg-muted"
            >
              J&apos;ai déjà un compte
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="mx-auto max-w-6xl px-6 py-12 text-xs text-muted-foreground">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size="sm" showText={false} />
            <span className="font-semibold text-foreground text-sm">Sensident</span>
          </div>
          <nav className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/cgu" className="underline hover:text-foreground">CGU</Link>
            <Link href="/politique-confidentialite" className="underline hover:text-foreground">Politique de confidentialité</Link>
            <Link href="/mentions-legales" className="underline hover:text-foreground">Mentions légales</Link>
          </nav>
        </div>
        <div className="mt-6 border-t border-border pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <p>© 2026 Sensident. Prévention bucco-dentaire · Hébergement HDS · Sans IA · Données 100 % France</p>
          <p className="text-[10px]">MVP · Version de travail</p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-6 space-y-3 hover:shadow-sm transition-shadow">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function Step({ n, icon, title, description }: { n: number; icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
          {n}
        </span>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <h3 className="font-semibold ml-11">{title}</h3>
      <p className="text-sm text-muted-foreground ml-11">{description}</p>
    </div>
  );
}
