import Link from 'next/link';
import Image from 'next/image';
import { Logo } from '@/components/logo';
import { ArrowRight, Shield, CheckCircle, Clock, BarChart3, Send, Heart, Star, Quote, FileText, Lock, Users, Brain, Lightbulb, Stethoscope } from 'lucide-react';

export const dynamic = 'force-static';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background via-accent/[0.02] to-background border-b border-border">
        <div className="mx-auto max-w-6xl px-6 pt-12 pb-16 md:pt-20 md:pb-24">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">

            <div className="space-y-8 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
                <Shield className="h-3.5 w-3.5 text-green-500" />
                Conforme HDS · RGPD · Sans IA
              </div>

              <h1 className="text-[2.3rem] leading-[1.1] md:text-5xl lg:text-[3.5rem] font-bold tracking-tight">
                <span className="text-primary">3 minutes par mois</span>
                <br />
                pour transformer vos patients
                <br />
                en ambassadeurs de prévention.
              </h1>

              {/*
                Sous-titre qui ancre les deux bénéfices :
                - dentiste : plus de lien, une patientèle qui comprend
                - patient : prévention santé globale, moins peur
              */}
              <p className="text-lg text-muted-foreground leading-relaxed">
                Sensident est le service clé en main qui vous permet d'envoyer des newsletters
                de prévention bucco-dentaire à vos patients. Vous renforcez le lien avec votre
                patientèle, vous la rendez plus qualifiée, et vos patients apprennent à prévenir
                les problèmes — buccaux mais aussi généraux.
              </p>

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

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> 2 min à l'inscription</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> Sans carte bancaire</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> 6 mois offerts aux ambassadeurs</span>
              </div>

              <p className="text-xs text-muted-foreground/70 pt-1">
                Vous êtes patient·e ?{' '}
                <Link href="#pourquoi-patient" className="text-primary underline underline-offset-2 font-medium hover:text-primary/80">
                  Pourquoi en parler à votre dentiste
                </Link>
              </p>
            </div>

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

      {/* ===== PREUVE SOCIALE ===== */}
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

      {/* ===== DOULEUR DENTISTE : renforcer le lien + patientèle qualifiée ===== */}
      <section className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="grid gap-10 md:grid-cols-2 md:gap-16 items-center">
          <div className="space-y-5">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              Entre deux consultations,
              <span className="text-primary block mt-1">le lien avec vos patients s'efface.</span>
            </h2>
            <p className="text-muted-foreground">
              Vous les voyez 20 minutes une fois par an. Le reste du temps, ils sont livrés à eux-mêmes —
              entre Dr Google, les influenceurs et les idées reçues qui circulent.
            </p>
            <p className="text-muted-foreground">
              Sensident vous permet de <strong>restaurer ce lien</strong> en envoyant un contenu que vous
              signez de votre nom. Vos patients reçoivent un email de <strong>leur dentiste</strong>, pas d'une
              marque. Et ils apprennent — ce qui change tout en consultation.
            </p>
            <div className="pt-2 space-y-3">
              {[
                'Un patient qui comprend le « pourquoi » du détartrage ou de la radiographie pose de meilleures questions et adhère mieux aux soins',
                'Les consultations gagnent en qualité : moins d\'explications répétitives, plus d\'échanges utiles',
                'Vous restez présent dans l\'esprit de vos patients entre deux rendez-vous — fidélisation naturelle',
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

      {/* ===== AVANTAGES DENTISTE — renouvelés ===== */}
      <section className="bg-muted/30 border-y border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Pourquoi ça change la donne</h2>
            <p className="text-muted-foreground mt-3">
              Pas un outil de plus. Le premier vrai service de prévention qui vous fait gagner du temps
              <em> et</em> renforce votre relation patient.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <BenefitCard
              icon={<Heart className="h-6 w-6" />}
              title="Un lien qui dure"
              description="Vous signez chaque newsletter de votre nom. Vos patients reçoivent un message de leur dentiste, pas d'une plateforme anonyme. La prévention devient un service que vous offrez, pas une corvée qu'ils subissent."
            />
            <BenefitCard
              icon={<Brain className="h-6 w-6" />}
              title="Des patients plus qualifiés"
              description="Quand un patient comprend le lien entre ses gencives et son diabète, ou pourquoi le saignement n'est pas normal, il pose les bonnes questions et adhère à vos recommandations. Moins de temps perdu en explications."
            />
            <BenefitCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="Mesurable, pas du flou"
              description="Taux de lecture, durée, réactions, rétention sur 3 mois. Vous voyez ce qui marche. Données agrégées, anonymes, 100 % conformes."
            />
            <BenefitCard
              icon={<Send className="h-6 w-6" />}
              title="Zéro rédaction"
              description="Le catalogue est rédigé et validé par un comité scientifique (dont Dr François Thibault). Vous choisissez, vous personnalisez, vous envoyez."
            />
            <BenefitCard
              icon={<Shield className="h-6 w-6" />}
              title="Zéro risque juridique"
              description="RGPD, HDS, hébergement France, audit logs. Vous n'êtes pas responsable du traitement. Pas de données patient visibles depuis votre dashboard."
            />
            <BenefitCard
              icon={<Users className="h-6 w-6" />}
              title="Vos patients s'inscrivent seuls"
              description="QR code au fauteuil ou lien par email. Vous ne saisissez aucune liste. Zéro temps perdu en gestion administrative."
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

      {/* ===== POUR LE PATIENT — prévention santé globale, moins peur, plus de compréhension ===== */}
      <section id="pourquoi-patient" className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Heart className="h-8 w-8 text-primary mx-auto mb-3" />
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Vous êtes patient·e ? Vous avez tout à y gagner.</h2>
          <p className="text-muted-foreground mt-3">
            La santé bucco-dentaire, ce n'est pas que les dents. C'est un pilier de votre santé générale.
            Et pourtant, on en parle très peu. Sensident, c'est ce que votre dentiste peut vous offrir
            pour changer ça. Gratuitement.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 mb-12">
          <PatientCard
            number="1"
            icon={<Stethoscope className="h-5 w-5" />}
            title="Prévenir les problèmes avant qu'ils n'arrivent"
            desc="La bouche est la porte d'entrée du corps. Une carie non traitée, des gencives qui saignent, une infection dentaire — ça ne reste pas dans la bouche. Les maladies parodontales sont liées au diabète, aux maladies cardiovasculaires, aux complications de grossesse. Prévenir, c'est protéger tout le corps."
          />
          <PatientCard
            number="2"
            icon={<Lightbulb className="h-5 w-5" />}
            title="Mieux comprendre, pour mieux agir"
            desc="Vous saurez pourquoi on vous recommande un détartrage tous les 6 mois, ce qui se passe quand vous saignez en brossant, ou comment choisir une brosse à dents adaptée. Et quand on comprend, on arrête d'improviser."
          />
          <PatientCard
            number="3"
            icon={<Heart className="h-5 w-5" />}
            title="Moins peur, plus serein"
            desc="Ce qui fait peur, c'est ce qu'on ne connaît pas. En apprenant comment fonctionne un détartrage, ce qu'est une couronne, ou pourquoi une radiographie est indispensable, vous arrivez au rendez-vous moins stressé. Votre dentiste n'est plus un inconnu qui vous fait mal — c'est un professionnel qui vous accompagne."
          />
        </div>

        {/* Script de conversation, renforcé */}
        <div className="max-w-xl mx-auto rounded-xl border border-primary/20 bg-primary/[0.03] p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-2">
            <Quote className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Vous pouvez lui dire exactement ça :</span>
          </div>
          <blockquote className="italic text-muted-foreground border-l-4 border-primary pl-5 py-1">
            «&nbsp;J'ai trouvé un service qui s'appelle Sensident. Les dentistes envoient des articles
            de prévention à leurs patients. Ça parle de santé dentaire mais aussi des liens avec
            le reste du corps. C'est super clair et ça dure 30 secondes à lire sur le mobile.
            Tu devrais regarder, tes patients adoreraient.&nbsp;»
          </blockquote>
          <p className="text-xs text-muted-foreground">
            Ou partagez simplement <Link href="/" className="text-primary underline font-medium">sensident.fr</Link> avec lui.
          </p>
        </div>
      </section>

      {/* ===== TÉMOIGNAGE ===== */}
      <section className="bg-muted/30 border-y border-border">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-20 text-center">
          <Star className="h-6 w-6 text-primary mx-auto mb-3" />
          <blockquote className="text-xl md:text-2xl font-medium leading-relaxed text-foreground/90">
            «&nbsp;Je voulais faire de la prévention sans alourdir mon secrétariat.
            Aujourd'hui j'envoie une newsletter par mois en 3 minutes. Les patients m'en parlent
            en consultation — certains comprennent enfin pourquoi c'est lié à leur diabète.
            Ça crée un vrai lien de confiance.&nbsp;»
          </blockquote>
          <div className="mt-6">
            <p className="font-semibold">— Dr François T., chirurgien-dentiste</p>
            <p className="text-sm text-muted-foreground">Cabinet libéral · Membre du comité scientifique Sensident</p>
          </div>
        </div>
      </section>

      {/* ===== FAQ — renouvelée ===== */}
      <section className="mx-auto max-3xl px-6 py-20 md:py-28">
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-2xl font-bold text-center">Vous vous posez encore une question ?</h2>
          <Faq
            q="Mes patients vont vraiment lire ça ?"
            a="Chaque newsletter tient en 5 slides visuels — l'équivalent d'un scroll sur Instagram. Le format est conçu pour être lu en 30 secondes sur mobile. Et comme c'est signé par vous, pas par une marque, l'attention est bien meilleure qu'une newsletter classique."
          />
          <Faq
            q="Je ne veux pas être responsable des données de santé."
            a="Vous ne l'êtes pas. Sensident est le responsable technique et l'hébergeur (certifié HDS, hébergement France). Seuls des agrégats anonymisés vous sont présentés. Aucun nom, aucun email n'est accessible depuis votre dashboard. Et tout patient peut se désabonner en un clic."
          />
          <Faq
            q="Et si je n'ai pas le temps d'ajouter une nouvelle tâche à mon mois ?"
            a="C'est justement pour ça que Sensident existe : vous n'écrivez rien, vous ne gérez aucune liste, vous ne touchez à aucun réglage RGPD. Vous choisissez un article dans le catalogue, vous personnalisez votre signature, et vous cliquez sur Envoyer. 3 minutes. C'est tout."
          />
          <Faq
            q="Est-ce que ça peut vraiment avoir un impact sur la santé de mes patients ?"
            a="Oui. Les maladies parodontales sont un facteur de risque documenté pour le diabète, les maladies cardiovasculaires et les complications de grossesse. Des études montrent que la prévention bucco-dentaire régulière réduit significativement les coûts de santé Globaux. Chaque article de Sensident est validé par un chirurgien-dentiste et repose sur des données scientifiques — pas sur du marketing."
          />
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="bg-primary/5 border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-20 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Créez votre compte.
            <span className="block text-primary">Gratuit. Sans CB. 2 minutes.</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Parcourez le catalogue, prévisualisez les templates, et voyez exactement ce que vos
            patients recevront. Rien à perdre, tout à gagner : une patientèle qui comprend,
            qui adhère, et qui revient.
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
          <p>© 2026 Sensident · Prévention bucco-dentaire · Hébergement HDS · Sans IA</p>
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

function PatientCard({ number, icon, title, desc }: { number: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-6 space-y-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
          {number}
        </span>
        <div className="text-primary">{icon}</div>
      </div>
      <h3 className="font-semibold text-base">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
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
