import Link from 'next/link';
import { Logo } from '@/components/logo';
import {
  ArrowRight, Stethoscope, CheckCircle, Clock, BookOpen, Sparkles,
  AlertCircle, Shield, TrendingUp, Users, BarChart3, Heart, X,
} from 'lucide-react';

export const dynamic = 'force-static';

export const metadata = {
  title: 'Pour les dentistes — Sensident',
  description:
    "Différenciez votre cabinet, fidélisez vos patients, respectez vos obligations déontologiques. 3 minutes par mois. Sans risque juridique.",
};

export default function PourDentistesPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* === TOP BAR === */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="sm" showText={false} />
            <span className="text-sm font-semibold text-foreground">Sensident</span>
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition">
            J&apos;ai déjà un compte →
          </Link>
        </div>
      </header>

      {/* === HERO === */}
      <section className="border-b border-border bg-gradient-to-b from-blue-50/40 to-background">
        <div className="mx-auto max-w-4xl px-6 py-12 md:py-16 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800 mb-4">
            <Stethoscope className="h-3 w-3" /> Pour les chirurgiens-dentistes
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.05]">
            Vos patients oublient tout
            <br />
            <span className="text-blue-700">entre deux rendez-vous.</span>
            <br />
            <span className="text-blue-700">Rappelez-leur, sans y penser.</span>
          </h1>
          <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Sensident vous permet d&apos;envoyer, chaque mois, un article de
            prévention validé scientifiquement, signé de votre nom.
            <strong className="text-foreground"> 3 minutes par mois. 0 patient à relancer.</strong>
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Créer mon compte cabinet
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/articles"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-sm font-medium hover:bg-muted transition"
            >
              <BookOpen className="h-4 w-4" />
              Voir le catalogue
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 justify-center text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> 2 min à l&apos;inscription</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> Sans CB</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> 6 mois Pro offerts</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> Conforme HDS & RGPD</span>
          </div>
        </div>
      </section>

      {/* === LE CONSTAT QUE VOUS CONNAISSEZ === */}
      <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700 text-center mb-3">Le constat</p>
        <h2 className="text-2xl md:text-3xl font-bold text-center leading-tight max-w-2xl mx-auto">
          Vous passez 20 minutes à expliquer le brossage.
          <br />
          <span className="text-muted-foreground">3 mois plus tard, le patient ne s&apos;en souvient plus.</span>
        </h2>
        <p className="mt-5 text-base text-muted-foreground leading-relaxed text-center max-w-2xl mx-auto">
          Vos soins sont excellents, vos conseils aussi. Mais entre deux
          rendez-vous, votre patient oublie, consulte un forum, regarde une
          vidéo TikTok, et revient 6 mois plus tard avec la même gingivite.
          Ce n&apos;est <strong>pas sa faute</strong>. C&apos;est la mémoire humaine.
        </p>
        <div className="mt-7 rounded-xl border border-blue-200 bg-blue-50/40 p-5 text-center">
          <p className="text-base text-foreground leading-relaxed">
            <Sparkles className="inline h-4 w-4 text-blue-600 mr-1" />
            <strong>Sensident règle ce problème</strong> en répétant vos
            conseils, à votre place, tous les mois. Vous restez présent dans
            la vie de vos patients entre les rendez-vous.
          </p>
        </div>
      </section>

      {/* === 4 BÉNÉFICES BUSINESS === */}
      <section className="border-y border-border bg-muted/10">
        <div className="mx-auto max-w-4xl px-6 py-12 md:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700 text-center mb-3">Concrètement</p>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Ce que ça change pour votre cabinet
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Business
              icon={TrendingUp}
              title="Patientèle plus fidèle"
              desc="Un patient qui reçoit vos articles ne va pas chez le dentiste d'à côté. Vous gardez vos patients, vous limitez l'attrition."
            />
            <Business
              icon={Users}
              title="Recommandations naturelles"
              desc="Un patient qui reçoit du contenu de qualité vous en parle. C'est le meilleur marketing qui existe, et il est gratuit."
            />
            <Business
              icon={BarChart3}
              title="Patients plus compliants"
              desc="Les patients qui lisent vos articles arrivent au rendez-vous en comprenant leur traitement. Vous gagnez du temps au fauteuil."
            />
            <Business
              icon={Heart}
              title="Image moderne, sans en faire trop"
              desc="Vous montrez que vous êtes à la page, sans tomber dans le marketing agressif. Ça valorise votre pratique."
            />
          </div>
        </div>
      </section>

      {/* === CONFORMITÉ / DÉONTOLOGIE === */}
      <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700 text-center mb-3">Légal & déontologie</p>
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-3 leading-tight">
          Vous êtes couvert. Sur tous les plans.
        </h2>
        <p className="text-center text-sm text-muted-foreground mb-8 max-w-2xl mx-auto">
          Le code de la santé publique, le RGPD, l&apos;ONCD, l&apos;hébergement HDS&nbsp;:
          on a tout vérifié avec des juristes.
        </p>
        <div className="space-y-3 max-w-3xl mx-auto">
          <Compliance
            title="Pas de compérage"
            desc="Aucun avantage en nature, aucun cadeau, aucune contrepartie. Le patient reçoit l'article parce qu'il l'a demandé. C'est de la prévention, pas de la fidélisation commerciale."
          />
          <Compliance
            title="Hébergement HDS"
            desc="Toutes les données patient sont stockées chez un hébergeur certifié Hébergement de Données de Santé. Vous êtes en conformité avec l'article L.1111-8 du Code de la santé publique."
          />
          <Compliance
            title="RGPD by design"
            desc="Opt-in granulaire (newsletter, analytics, réactions), consentement horodaté, droit à l'oubli en 1 clic, audit logs immuables. Vous êtes responsable du traitement, mais on a tout prévu."
          />
          <Compliance
            title="Pas d'IA"
            desc="Aucune API d'IA, aucun embedding, aucune décision automatisée. Articles rédigés par des humains, validés par un comité scientifique. Coût marginal 0 € par patient."
          />
        </div>
      </section>

      {/* === OBJECTIONS === */}
      <section className="border-y border-border">
        <div className="mx-auto max-w-4xl px-6 py-12 md:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700 text-center mb-3">Vos objections</p>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Ce que vous vous dites peut-être
          </h2>
          <div className="space-y-3 max-w-3xl mx-auto">
            <Objection
              q="Je n'ai pas le temps."
              a="3 minutes par mois. Vous choisissez l'article, vous cliquez « envoyer », c'est fait. Le catalogue est rédigé pour vous, la planification est automatique."
            />
            <Objection
              q="Et si un patient se désinscrit ?"
              a="Tant mieux : il a fait le tri. Vous gardez une patientèle engagée. Les chiffres de désabonnement sont dans vos analytics, anonymisés."
            />
            <Objection
              q="Est-ce que ce n'est pas un peu marketing ?"
              a="Non. Vous n'envoyez pas une promo pour un acte. Vous envoyez un article de prévention. Le ton, le format, la signature, tout est médical. Pas de CTA commercial."
            />
            <Objection
              q="Pourquoi pas une page Facebook, alors ?"
              a="Un patient ne va pas voir votre Facebook. Il ne va pas non plus chercher vos posts dans 6 mois. L'email arrive, il le lit, il garde ça en tête. C'est le canal le plus efficace, en dentisterie comme ailleurs."
            />
            <Objection
              q="Ça fait trop « startup » pour mon cabinet."
              a="Le rendu est sobre, signé de votre nom, sans logo de marque. Le patient reçoit un message qui ressemble à ce que vous lui écririez vous-même. Aucun côté « tech » visible."
            />
            <Objection
              q="Combien ça coûte vraiment ?"
              a="Gratuit pendant 6 mois pour les ambassadeurs. Ensuite, 49 € HT/mois. À mettre en regard : un seul patient qui reste 2 ans de plus, c'est 1500 € de soins récurrents."
            />
          </div>
        </div>
      </section>

      {/* === COMMENT ÇA MARCHE === */}
      <section className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700 text-center mb-3">En pratique</p>
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
          Vos 4 étapes du mois
        </h2>
        <ol className="space-y-3 max-w-xl mx-auto">
          {[
            { t: 'Choisissez un article', d: 'Dans le catalogue validé (brossage, alimentation, caries, gencives, etc.).' },
            { t: 'Personnalisez', d: 'Signature, logo cabinet, couleur d\'accent, message libre. Une fois configuré, c\'est réutilisé.' },
            { t: 'Envoyez', d: 'Un clic. L\'email part depuis votre nom, à tous vos patients inscrits.' },
            { t: 'Consultez les analytics', d: 'Taux de lecture, durée, top articles, rétention. Anonymisés, agrégés.' },
          ].map((step, i) => (
            <li key={i} className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold text-foreground text-sm">{step.t}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.d}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-center text-sm font-semibold text-blue-700 mt-5">
          <Clock className="inline h-3.5 w-3.5 mr-1" />
          Total : ~3 minutes par mois
        </p>
      </section>

      {/* === PATIENTS S'INSCRIVENT SEULS === */}
      <section className="border-y border-border bg-muted/10">
        <div className="mx-auto max-w-3xl px-6 py-12 md:py-16 text-center">
          <Users className="inline h-7 w-7 text-blue-600 mb-2" />
          <h2 className="text-2xl md:text-3xl font-bold">Aucune liste à gérer.</h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Les patients s&apos;inscrivent eux-mêmes, via un QR code que vous
            imprimez ou affichez en cabinet. Ou un lien que vous partagez
            depuis votre borne, par SMS, par email. Vous ne touchez jamais à
            une liste, vous ne saisissez jamais un email. Le RGPD est respecté
            par construction.
          </p>
        </div>
      </section>

      {/* === SÉCURITÉ === */}
      <section className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <div className="rounded-xl border border-border bg-card p-6 md:p-7">
          <div className="flex items-start gap-3">
            <Shield className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg md:text-xl font-bold">Vous ne gérez aucun mot de passe patient.</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Le patient se connecte via un lien magique reçu par email.
                Authentification forte (TOTP) pour vous. Hébergement HDS, audit
                logs immuables, chiffrement au repos et en transit. Vous
                n&apos;êtes pas en première ligne&nbsp;: Sensident porte la
                responsabilité technique.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* === CTA FINAL === */}
      <section className="border-t border-border bg-gradient-to-b from-background to-blue-50/30">
        <div className="mx-auto max-w-2xl px-6 py-12 md:py-16 text-center">
          <Sparkles className="inline h-6 w-6 text-blue-600 mb-2" />
          <h2 className="text-2xl md:text-3xl font-bold">Offrez ce service à vos patients.</h2>
          <p className="mt-2 text-muted-foreground">
            Gratuit 6 mois. Sans carte bancaire. Annulable à tout moment.
          </p>
          <Link
            href="/signup"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Créer mon compte cabinet
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-xs text-muted-foreground">
            <AlertCircle className="inline h-3 w-3 mr-1" />
            Vous avez un cas spécifique&nbsp;? Écrivez-nous, on s&apos;adapte.
          </p>
        </div>
      </section>

      <footer className="border-t border-border bg-muted/10 mt-auto">
        <div className="mx-auto max-w-4xl px-6 py-5 flex items-center justify-between text-xs text-muted-foreground">
          <p>© 2026 Sensident · HDS · RGPD · Sans IA</p>
          <Link href="/" className="hover:text-foreground transition">← Accueil</Link>
        </div>
      </footer>
    </main>
  );
}

function Business({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 mb-3">
        <Icon className="h-4 w-4" />
      </div>
      <p className="font-semibold text-foreground text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
    </div>
  );
}

function Compliance({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
      <CheckCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-foreground text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function Objection({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="font-semibold text-foreground text-sm flex items-start gap-2">
        <X className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        &laquo;&nbsp;{q}&nbsp;&raquo;
      </p>
      <p className="text-sm text-muted-foreground mt-2 leading-relaxed pl-6">{a}</p>
    </div>
  );
}
