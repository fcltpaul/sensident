import Link from 'next/link';
import Image from 'next/image';
import { Logo } from '@/components/logo';
import { ArrowRight, Shield, CheckCircle, Clock, BarChart3, Send, Smartphone, Heart, Star, Quote, ChevronRight, FileText, Lock, Users } from 'lucide-react';

export const dynamic = 'force-static';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* ===== HERO — un seul message, deux portes ===== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background via-accent/[0.02] to-background border-b border-border">
        <div className="mx-auto max-w-6xl px-6 pt-12 pb-16 md:pt-20 md:pb-24">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">

            <div className="space-y-8 max-w-xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
                <Shield className="h-3.5 w-3.5 text-green-500" />
                Conforme HDS · RGPD · Sans IA
              </div>

              {/* Hook — un seul, fort */}
              <h1 className="text-[2.3rem] leading-[1.1] md:text-5xl lg:text-[3.5rem] font-bold tracking-tight">
                <span className="text-primary">3 minutes par mois</span>
                <br />
                pour offrir un vrai service
                <br />
                de prévention à vos patients.
              </h1>

              <p className="text-lg text-muted-foreground leading-relaxed">
                Sensident est un service clé en main pour les cabinets dentaires&nbsp;: choisissez un article
                validé scientifiquement, personnalisez-le à votre image, et vos patients le reçoivent
                par email. Le tout hébergé en France, conforme RGPD et HDS.
              </p>

              {/* Un seul CTA prioritaire : dentiste */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-md transition-all hover:shadow-lg w-full sm:w-auto"
                >
                  Créer mon compte gratuit
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-7 py-3.5 text-sm font-medium hover:bg-muted w-full sm:w-auto"
                >
                  J'ai déjà un compte
                </Link>
              </div>

              {/* Micro-lignes de confiance */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> 2 min à l'inscription</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> Sans carte bancaire</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> 6 mois offerts aux ambassadeurs</span>
              </div>

              {/* Pont vers le patient — subtil mais présent */}
              <p className="text-xs text-muted-foreground/70 pt-1">
                Vous êtes patient·e ?{' '}
                <Link href="#pourquoi-patient" className="text-primary underline underline-offset-2 font-medium hover:text-primary/80">
                  Découvrez pourquoi en parler à votre dentiste
                </Link>
              </p>
            </div>

            {/* Visuel */}
            <div className="rounded-xl overflow-hidden border border-border bg-muted/40 shadow-lg">
              <Image
                src="/images/hero-banner.png"
                alt="Dashboard Sensident"
                width={1920}
                height={1080}
                className="w-full h-auto"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== PREUVE SOCIALE — 3 chiffres ===== */}
      <section className="border-b border-border bg-muted/20">
        <div className="mx-auto max-w-5xl px-6 py-10 md:py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl md:text-3xl font-bold text-foreground">10</p>
              <p className="text-xs text-muted-foreground mt-1">articles validés<br />par comité scientifique</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold text-foreground">5</p>
              <p className="text-xs text-muted-foreground mt-1">templates visuels<br />personnalisables</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold text-foreground">3</p>
              <p className="text-xs text-muted-foreground mt-1">minutes par mois<br />pour envoyer une newsletter</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold text-foreground">100 %</p>
              <p className="text-xs text-muted-foreground mt-1">France · HDS · RGPD<br />sans IA</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== LE PROBLÈME (douleur dentiste) + SOLUTION ===== */}
      <section className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="grid gap-10 md:grid-cols-2 md:gap-16 items-center">
          <div className="space-y-5">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              La prévention, tout le monde en parle.
              <span className="text-primary block mt-1">Personne n'a le temps d'en faire.</span>
            </h2>
            <p className="text-muted-foreground">
              Vous le savez mieux que personne : un rappel à l'hygiène en fin de consultation ne suffit pas.
              Mais rédiger des newsletters, gérer des listes d'envoi, vérifier la conformité… qui a le temps ?
            </p>
            <p className="text-muted-foreground">
              Sensident vous fournit tout ce qu'il faut pour envoyer un contenu de prévention
              de qualité à vos patients, en <strong>moins de 3 minutes par mois</strong>.
            </p>
            <div className="pt-2 space-y-3">
              {[
                '10 articles prêts à l\'emploi, rédigés et validés par Dr François Thibault',
                '5 templates visuels : choisissez, personnalisez (logo, signature, couleurs), envoyez',
                'Conformité RGPD et HDS incluse — vous n\'avez rien à gérer',
                'Lien ou QR code à donner au fauteuil — vos patients s\'inscrivent seuls',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 mt-0.5 shrink-0 text-green-500" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-6 md:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <p className="font-bold text-lg">Votre mois avec Sensident</p>
            </div>
            <div className="space-y-4">
              {[
                { step: 'Jour 1', action: 'Ouvrez votre dashboard — 10 secondes', emoji: '📱' },
                { step: 'Jour 1', action: 'Choisissez un article dans le catalogue — 30 secondes', emoji: '📖' },
                { step: 'Jour 1', action: 'Sélectionnez votre template, personnalisez — 1 minute', emoji: '🎨' },
                { step: 'Jour 1', action: 'Prévisualisez, cliquez sur Envoyer — 20 secondes', emoji: '🚀' },
                { step: 'J+7', action: 'Consultez les analytics (lectures, réactions) — 30 secondes', emoji: '📊' },
              ].map((item) => (
                <div key={item.action} className="flex items-start gap-3 text-sm">
                  <span className="text-xs font-mono text-muted-foreground w-10 shrink-0 mt-0.5">{item.step}</span>
                  <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{item.emoji}</span>
                  <span>{item.action}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 text-center text-sm font-semibold text-primary">
              Total : ~3 minutes par mois
            </div>
          </div>
        </div>
      </section>

      {/* ===== AVANTAGES DENTISTE — bénéfices, pas features ===== */}
      <section className="bg-muted/30 border-y border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Pourquoi ça change la donne</h2>
            <p className="text-muted-foreground mt-3">
              Pas un outil de plus. Le premier vrai service de prévention qui ne vous prend pas de temps.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <BenefitCard
              icon={<Send className="h-6 w-6" />}
              title="Zéro rédaction"
              description="Le catalogue est rédigé et validé par un comité scientifique. Vous n'écrivez rien. Vous choisissez et vous envoyez."
            />
            <BenefitCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="Zéro zone d'ombre"
              description="Taux d'engagement, durée de lecture, réactions des patients. Vous savez ce qui fonctionne. Données agrégées, anonymes, conformes."
            />
            <BenefitCard
              icon={<Shield className="h-6 w-6" />}
              title="Zéro risque juridique"
              description="RGPD, HDS, hébergement France, audit logs. Tout est conforme. Vous n'êtes pas responsable du traitement des données."
            />
            <BenefitCard
              icon={<Heart className="h-6 w-6" />}
              title="Valorisant pour vous"
              description="Vos patients reçoivent des emails signés par votre cabinet. La prévention renforce leur confiance et votre image."
            />
            <BenefitCard
              icon={<Users className="h-6 w-6" />}
              title="Vos patients font le travail"
              description="Le QR code au fauteuil ou le lien par email : les patients s'inscrivent seuls. Vous ne saisissez aucune liste."
            />
            <BenefitCard
              icon={<Lock className="h-6 w-6" />}
              title="Sans IA, sans surprise"
              description="Pas de LLM, pas d'embedding, pas de ML. Algorithmes déterministes, 100 % auditables, sans risque de fuite."
            />
          </div>

          <div className="text-center mt-12">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-md transition-all"
            >
              Créer mon compte gratuit
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== POUR LE PATIENT — pourquoi en parler à son dentiste ===== */}
      <section id="pourquoi-patient" className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="text-center max-w-xl mx-auto mb-14">
          <Heart className="h-8 w-8 text-primary mx-auto mb-3" />
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Vous êtes patient·e ?</h2>
          <p className="text-muted-foreground mt-3">
            Vous voulez des conseils dentaires fiables, sans pub, sans revente de données ?
            Sensident, c'est ce que votre dentiste peut vous offrir. Gratuitement.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 mb-12">
          <PatientCard
            number="1"
            title="Pas un influenceur"
            desc="Les articles sont rédigés et validés par un comité scientifique, pas par un copywriter."
          />
          <PatientCard
            number="2"
            title="5 slides suffisent"
            desc="Chaque newsletter tient sur un écran de mobile. Vous lisez en 30 secondes dans le métro."
          />
          <PatientCard
            number="3"
            title="C'est votre dentiste qui signe"
            desc="Vous faites confiance à votre praticien. Pas à une marque. Pas à un algorithme."
          />
        </div>

        {/* Script de conversation */}
        <div className="max-w-xl mx-auto rounded-xl border border-primary/20 bg-primary/[0.03] p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-2">
            <Quote className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Vous pouvez lui dire exactement ça :</span>
          </div>
          <blockquote className="italic text-muted-foreground border-l-4 border-primary pl-5 py-1">
            «&nbsp;J'ai trouvé un service qui s'appelle Sensident. Les dentistes peuvent envoyer
            des articles de prévention à leurs patients. Tout est déjà écrit, conforme RGPD,
            et ça te prend 3 minutes par mois. Tu devrais regarder, je pense que ça intéresserait
            tes patients.&nbsp;»
          </blockquote>
          <p className="text-xs text-muted-foreground">
            Ou partagez simplement <Link href="/" className="text-primary underline font-medium">sensident.fr</Link> avec lui.
          </p>
        </div>
      </section>

      {/* ===== TÉMOIGNAGE — réel ou retiré ===== */}
      <section className="bg-muted/30 border-y border-border">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-20 text-center">
          <Star className="h-6 w-6 text-primary mx-auto mb-3" />
          <blockquote className="text-xl md:text-2xl font-medium leading-relaxed text-foreground/90">
            «&nbsp;Je voulais faire de la prévention sans alourdir mon secrétariat.
            Maintenant j'envoie une newsletter par mois en 3 minutes chrono.
            Les patients m'en parlent en consultation — ça crée du lien.&nbsp;»
          </blockquote>
          <div className="mt-6">
            <p className="font-semibold">— Dr François T., chirurgien-dentiste</p>
            <p className="text-sm text-muted-foreground">Cabinet libéral · Membre du comité scientifique Sensident</p>
          </div>
        </div>
      </section>

      {/* ===== FAQ minimale — tuer les objections ===== */}
      <section className="mx-auto max-3xl px-6 py-20 md:py-28">
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-2xl font-bold text-center">Les 3 questions qu'on nous pose</h2>
          <Faq
            q="Est-ce que je vais devoir passer des heures à configurer ?"
            a="Non. La création de compte prend 2 minutes. Le catalogue est prêt. Les templates sont prêts. Vous choisissez un article, vous personnalisez le petit encart (votre signature, vos couleurs) et vous cliquez sur Envoyer."
          />
          <Faq
            q="Je ne veux pas être responsable des données de santé de mes patients."
            a="Vous ne l'êtes pas. Sensident est l'hébergeur et le responsable technique. Les données sont stockées en France sur infrastructure certifiée HDS. Vous ne voyez que des agrégats anonymisés (minimum 5 patients). Aucun nom, aucun email n'est visible de votre côté."
          />
          <Faq
            q="Mes patients vont-ils recevoir du spam ?"
            a="Non. Chaque patient donne son consentement explicite (double opt-in) avec une case séparée pour les newsletters. Il peut se désabonner en un clic. Et vous choisissez la fréquence : 1 par mois ou 2 par mois — pas plus."
          />
        </div>
      </section>

      {/* ===== CTA FINAL — urgence + risque éliminé ===== */}
      <section className="bg-primary/5 border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-20 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Créez votre compte.
            <span className="block text-primary">Gratuit. Sans CB. 2 minutes.</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Vous pourrez naviguer dans le catalogue, prévisualiser les templates, et voir exactement
            ce que vos patients recevront. Rien à perdre.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-md transition-all hover:shadow-lg"
            >
              Créer mon compte gratuit
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border border-border px-7 py-3.5 text-sm font-medium hover:bg-muted"
            >
              J'ai déjà un compte
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
          <p>© 2026 Sensident · Prévention bucco-dentaire pour cabinets · Hébergement HDS · Sans IA</p>
        </div>
      </footer>
    </main>
  );
}

function BenefitCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-6 space-y-3 hover:shadow-sm transition-shadow">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
        {icon}
      </div>
      <h3 className="font-semibold text-base">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function PatientCard({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
          {number}
        </span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground ml-9">{desc}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="border-b border-border pb-5 space-y-2">
      <h3 className="font-semibold text-sm">{q}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
    </div>
  );
}
