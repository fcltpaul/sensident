import Link from 'next/link';
import Image from 'next/image';
import { Logo } from '@/components/logo';
import { ArrowRight, Shield, CheckCircle, Clock, BarChart3, Send, Heart, Star, Quote, FileText, Lock, Users, Brain, Lightbulb, Stethoscope, MessageSquareText, Eye, Sparkles } from 'lucide-react';

export const dynamic = 'force-static';

/* ─── sous-composants ─── */

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/90 px-3.5 py-1 text-xs font-medium text-muted-foreground shadow-xs">
      {children}
    </div>
  );
}

function SectionTitle({ overline, title, lead }: { overline?: string; title: string; lead?: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
      {overline && (
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent mb-3">{overline}</p>
      )}
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{title}</h2>
      {lead && <p className="mt-3 text-muted-foreground text-base md:text-lg leading-relaxed">{lead}</p>}
    </div>
  );
}

function Card({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="group rounded-xl border border-border bg-background p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent mb-4 transition-colors group-hover:bg-accent/15">
        {icon}
      </div>
      <h3 className="font-semibold text-[15px] text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function StepCard({ n, icon, title, desc, highlight }: { n: number; icon: React.ReactNode; title: string; desc: string; highlight?: boolean }) {
  const border = highlight ? 'border-accent/40 bg-accent/[0.02]' : 'border-border';
  return (
    <div className={`rounded-xl border ${border} bg-background p-6 space-y-3 transition-shadow hover:shadow-sm`}>
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
          {n}
        </span>
        <div className="text-accent shrink-0">{icon}</div>
        <h3 className="font-semibold text-[15px]">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="border-b border-border pb-6 space-y-2.5 last:border-b-0">
      <h3 className="font-semibold text-[15px] text-foreground">{q}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════ */

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Subtile texture de fond */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f8fafc_1px,transparent_1px),linear-gradient(to_bottom,#f8fafc_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-6 pt-14 pb-20 md:pt-20 md:pb-28">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">

            {/* Colonne texte */}
            <div className="space-y-7 max-w-xl">

              <Badge>
                <Shield className="h-3 w-3 text-green-600" />
                Conforme HDS · RGPD · Sans IA
              </Badge>

              <h1 className="text-[2.5rem] leading-[1.08] md:text-5xl lg:text-[3.75rem] font-bold tracking-tight">
                <span className="text-accent">3 minutes par mois</span>
                <br />
                pour transformer vos patients
                <br />
                en ambassadeurs de prévention.
              </h1>

              <p className="text-base text-muted-foreground leading-relaxed md:text-lg">
                Un clic, un article validé scientifiquement, un template à votre image.
                Sensident vous permet d&apos;offrir un vrai service de prévention à vos patients,
                sans y passer des heures.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg active:scale-[0.98]"
                >
                  Créer mon compte gratuit
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  J&apos;ai déjà un compte
                </Link>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  2 min à l&apos;inscription
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  Sans carte bancaire
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  6 mois offerts aux ambassadeurs
                </span>
              </div>

              <div className="pt-1 border-t border-border/50">
                <Link
                  href="#pourquoi-patient"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Heart className="h-3 w-3" />
                  Vous êtes patient·e&nbsp;? Découvrez pourquoi en parler à votre dentiste
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Colonne visuel */}
            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-accent/5 to-transparent opacity-60 blur-sm" />
              <div className="relative rounded-xl overflow-hidden border border-border bg-muted/30 shadow-lg">
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
        </div>
      </section>

      {/* ═══════════ CHIFFRES ═══════════ */}
      <section className="border-b border-border bg-muted/20">
        <div className="mx-auto max-w-5xl px-6 py-10 md:py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
            {[
              { value: '10', label: 'articles validés par comité scientifique' },
              { value: '5', label: 'templates visuels personnalisables' },
              { value: '3', label: 'minutes par mois pour envoyer' },
              { value: '100%', label: 'France · HDS · RGPD · Sans IA' },
            ].map((s) => (
              <div key={s.value}>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ DOULEUR DENTISTE ═══════════ */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">

          <div className="space-y-6">
            <Badge>
              <Clock className="h-3 w-3 text-accent" />
              Pour les chirurgiens-dentistes
            </Badge>

            <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              Entre deux consultations,
              <span className="text-accent block mt-1.5">le lien avec vos patients s&apos;efface.</span>
            </h2>

            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Vous les voyez 20 minutes une fois par an. Le reste du temps, ils sont livrés à
                eux-mêmes — entre Dr Google, les influenceurs et les idées reçues.
              </p>
              <p>
                Sensident vous permet de <strong className="text-foreground">restaurer ce lien</strong> en
                envoyant un contenu que vous signez de votre nom. Vos patients reçoivent un email
                de <strong className="text-foreground">leur dentiste</strong>, pas d&apos;une marque.
              </p>
            </div>

            <ul className="space-y-3 pt-1">
              {[
                'Un patient qui comprend le pourquoi du détartrage adhère mieux aux soins et pose les bonnes questions',
                'Moins d\'explications répétitives en consultation, plus d\'échanges utiles',
                'Vous restez présent dans l\'esprit de vos patients entre les rendez-vous — fidélisation naturelle',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Timeline mois-type */}
          <div className="rounded-xl border border-border bg-muted/10 p-6 md:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Clock className="h-5 w-5" />
              </div>
              <p className="font-semibold text-base">Votre mois avec Sensident</p>
            </div>
            <div className="space-y-0">
              {[
                { step: 'Jour 1', action: 'Ouvrez votre dashboard', time: '10 s', icon: '📱' },
                { step: 'Jour 1', action: 'Choisissez un article dans le catalogue', time: '30 s', icon: '📖' },
                { step: 'Jour 1', action: 'Personnalisez votre template (logo, signature)', time: '1 min', icon: '🎨' },
                { step: 'Jour 1', action: 'Prévisualisez et cliquez sur Envoyer', time: '20 s', icon: '🚀' },
                { step: 'J+7', action: 'Consultez les analytics (lectures, réactions)', time: '30 s', icon: '📊' },
              ].map((item, i) => (
                <div key={item.action} className="flex items-center gap-3 py-2.5 text-sm border-b border-border/40 last:border-b-0">
                  <span className="text-[11px] font-medium text-muted-foreground w-11 shrink-0">{item.step}</span>
                  <span className="text-xs text-muted-foreground/60 w-5 shrink-0">{item.icon}</span>
                  <span className="flex-1">{item.action}</span>
                  <span className="text-[11px] font-mono text-muted-foreground/70 shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 text-center text-sm font-semibold text-accent">
              Total&nbsp;: ~3 minutes
            </div>
          </div>

        </div>
      </section>

      {/* ═══════════ BÉNÉFICES DENTISTE ═══════════ */}
      <section className="border-y border-border bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <SectionTitle
            overline="Bénéfices cabinet"
            title="Pourquoi ça change la donne"
            lead="Pas un outil de plus. Le premier vrai service de prévention qui vous fait gagner du temps et renforce votre relation patient."
          />

          <div className="grid gap-5 md:grid-cols-3">
            <Card
              icon={<Heart className="h-5 w-5" />}
              title="Un lien qui dure"
              desc="Vous signez chaque newsletter de votre nom. Vos patients reçoivent un message de leur dentiste, pas d'une plateforme. La prévention devient un service que vous offrez."
            />
            <Card
              icon={<Brain className="h-5 w-5" />}
              title="Des patients plus qualifiés"
              desc="Quand un patient sait pourquoi ses gencives saignent ou le lien avec son diabète, il pose les bonnes questions et adhère à vos recommandations."
            />
            <Card
              icon={<BarChart3 className="h-5 w-5" />}
              title="Mesurable, pas du flou"
              desc="Taux de lecture, durée, réactions, rétention sur 3 mois. Vous voyez ce qui marche. Données agrégées, anonymes, conformes."
            />
            <Card
              icon={<Send className="h-5 w-5" />}
              title="Zéro rédaction"
              desc="Le catalogue est rédigé et validé par un comité scientifique (dont Dr François Thibault). Vous choisissez, vous personnalisez, vous envoyez."
            />
            <Card
              icon={<Shield className="h-5 w-5" />}
              title="Zéro risque juridique"
              desc="RGPD, HDS, hébergement France, audit logs. Vous n'êtes pas responsable du traitement. Aucune donnée patient visible depuis votre dashboard."
            />
            <Card
              icon={<Users className="h-5 w-5" />}
              title="Vos patients s'inscrivent seuls"
              desc="QR code au fauteuil ou lien par email. Vous ne saisissez aucune liste. Zéro temps perdu en gestion administrative."
            />
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
            >
              Créer mon compte gratuit
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ POUR LE PATIENT ═══════════ */}
      <section id="pourquoi-patient" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <SectionTitle
          overline="Pour les patients"
          title="Vous êtes patient·e ? Vous avez tout à y gagner."
          lead="La santé bucco-dentaire, ce n'est pas que les dents. C'est un pilier de votre santé générale. Sensident, c'est ce que votre dentiste peut vous offrir pour changer ça. Gratuitement."
        />

        <div className="grid gap-6 md:grid-cols-3 mb-16">
          <StepCard
            n={1}
            icon={<Stethoscope className="h-5 w-5" />}
            title="Prévenir les problèmes avant qu'ils n'arrivent"
            desc="La bouche est la porte d'entrée du corps. Les maladies parodontales sont liées au diabète, aux maladies cardiovasculaires et aux complications de grossesse. Prévenir dans la bouche, c'est protéger tout le corps."
            highlight
          />
          <StepCard
            n={2}
            icon={<Lightbulb className="h-5 w-5" />}
            title="Mieux comprendre pour mieux agir"
            desc="Vous saurez pourquoi on vous recommande un détartrage tous les 6 mois, ce qui se passe quand vous saignez, et comment choisir votre brosse à dents. Fini d'improviser sur votre santé."
          />
          <StepCard
            n={3}
            icon={<Heart className="h-5 w-5" />}
            title="Moins peur, plus serein"
            desc="Ce qui fait peur, c'est ce qu'on ne connaît pas. En apprenant comment fonctionne un soin, pourquoi une radio est nécessaire, vous arrivez au rendez-vous moins stressé."
            highlight
          />
        </div>

        {/* Script parole patient */}
        <div className="max-w-xl mx-auto">
          <div className="rounded-xl border border-border bg-background p-6 md:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/5">
                <Quote className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium text-sm text-foreground">Vous pouvez lui dire exactement ça&nbsp;:</span>
            </div>
            <blockquote className="italic text-muted-foreground text-sm leading-relaxed border-l-3 border-accent pl-4 md:pl-5 py-0.5">
              «&nbsp;J&apos;ai trouvé un service qui s&apos;appelle Sensident. Les dentistes envoient des
              articles de prévention à leurs patients. Ça parle de santé dentaire mais aussi
              des liens avec le reste du corps. C&apos;est clair, ça se lit en 30 secondes.
              Tu devrais regarder, tes patients adoreraient.&nbsp;»
            </blockquote>
            <p className="text-xs text-muted-foreground">
              Ou partagez simplement <Link href="/" className="text-accent underline underline-offset-2 font-medium">sensident.fr</Link> avec lui.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ TÉMOIGNAGE ═══════════ */}
      <section className="border-y border-border bg-muted/10">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-20 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 mb-5">
            <Star className="h-5 w-5 text-amber-500" />
          </div>
          <blockquote className="text-xl md:text-2xl font-medium leading-relaxed text-foreground/90">
            «&nbsp;Je voulais faire de la prévention sans alourdir mon secrétariat.
            Aujourd&apos;hui j&apos;envoie une newsletter par mois en 3 minutes. Les patients m&apos;en
            parlent en consultation — certains comprennent enfin pourquoi c&apos;est lié à leur
            diabète. Ça crée un vrai lien de confiance.&nbsp;»
          </blockquote>
          <div className="mt-6 space-y-0.5">
            <p className="font-semibold text-foreground">Dr François T., chirurgien-dentiste</p>
            <p className="text-sm text-muted-foreground">Membre du comité scientifique Sensident</p>
          </div>
        </div>
      </section>

      {/* ═══════════ QUESTION / RÉPONSE ═══════════ */}
      <section className="mx-auto max-w-3xl px-6 py-20 md:py-28">
        <SectionTitle
          overline="Questions fréquentes"
          title="Vous vous posez encore une question&nbsp;?"
        />

        <div className="space-y-6">
          <FaqItem
            q="Mes patients vont-ils vraiment lire ça&nbsp;?"
            a="Chaque newsletter tient en 5 slides visuels — l'équivalent d'un scroll sur Instagram. Le format est conçu pour être lu en 30 secondes sur mobile. Et comme c'est signé par vous, pas par une marque, l'attention est bien meilleure qu'une newsletter classique."
          />
          <FaqItem
            q="Je ne veux pas être responsable des données de santé de mes patients."
            a="Vous ne l'êtes pas. Sensident est le responsable technique et l'hébergeur (certifié HDS, hébergement France). Seuls des agrégats anonymisés vous sont présentés. Aucun nom, aucun email n'est accessible depuis votre dashboard. Et tout patient peut se désabonner en un clic."
          />
          <FaqItem
            q="Est-ce que ça prend du temps à mettre en place&nbsp;?"
            a="La création de compte prend 2 minutes. Le catalogue est prêt. Les templates sont prêts. Vous choisissez un article, personnalisez votre signature, et vous cliquez sur Envoyer. 3 minutes. C'est tout."
          />
          <FaqItem
            q="Est-ce que ça peut vraiment avoir un impact sur la santé de mes patients&nbsp;?"
            a="Oui. Les maladies parodontales sont un facteur de risque documenté pour le diabète, les maladies cardiovasculaires et les complications de grossesse. Chaque article de Sensident est validé par un chirurgien-dentiste et repose sur des données scientifiques — pas sur du marketing."
          />
        </div>
      </section>

      {/* ═══════════ CTA FINAL ═══════════ */}
      <section className="border-t border-border bg-gradient-to-b from-background to-accent/[0.02]">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-20 text-center space-y-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent mb-1">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Créez votre compte.
            <span className="block text-accent mt-1">Gratuit. Sans CB. 2 minutes.</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto text-base leading-relaxed">
            Parcourez le catalogue, prévisualisez les templates, et voyez exactement ce que vos
            patients recevront. Rien à perdre&nbsp;: une patientèle qui comprend, qui adhère, et qui revient.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg active:scale-[0.98]"
            >
              Créer mon compte gratuit
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              J&apos;ai déjà un compte
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-7 py-3.5 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
              title="Démo interactive 1-clic pour Dr François Thibault"
            >
              🎬 Démo François
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-border bg-muted/10">
        <div className="mx-auto max-w-7xl px-6 py-10 md:py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Logo size="sm" showText={false} />
              <span className="font-semibold text-foreground text-sm">Sensident</span>
            </div>
            <nav className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
              <Link href="/cgu" className="text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">CGU</Link>
              <Link href="/politique-confidentialite" className="text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">Politique de confidentialité</Link>
              <Link href="/mentions-legales" className="text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">Mentions légales</Link>
            </nav>
          </div>
          <div className="mt-6 border-t border-border/50 pt-6 text-xs text-muted-foreground/70">
            <p>© 2026 Sensident · Prévention bucco-dentaire · Hébergement HDS · Sans IA</p>
          </div>
        </div>
      </footer>

    </main>
  );
}
