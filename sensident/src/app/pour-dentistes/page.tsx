import Link from 'next/link';
import { Logo } from '@/components/logo';
import {
  ArrowRight, Stethoscope, Clock, BookOpen, BarChart3, Shield,
  Heart, Brain, Send, Users, CheckCircle, Sparkles, Star,
} from 'lucide-react';

export const dynamic = 'force-static';

export const metadata = {
  title: 'Pour les dentistes — Sensident',
  description:
    "Offrez un service de prévention à vos patients en 3 minutes par mois. Articles validés, templates prêts, conformité HDS.",
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
        <div className="mx-auto max-w-4xl px-6 py-10 md:py-14 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800 mb-4">
            <Stethoscope className="h-3 w-3" /> Pour les chirurgiens-dentistes
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            3 minutes par mois,
            <br />
            <span className="text-blue-700">un lien durable avec vos patients.</span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Sensident vous permet d&apos;envoyer chaque mois, à vos patients qui le
            souhaitent, un article court et validé de prévention bucco-dentaire.
            Signé de votre nom, jamais d&apos;une marque.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Créer mon compte cabinet (gratuit)
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/articles"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-sm font-medium text-foreground hover:bg-muted transition"
            >
              <BookOpen className="h-4 w-4" />
              Voir le catalogue d&apos;articles
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 justify-center text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> 2 min à l&apos;inscription</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> Sans carte bancaire</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> 6 mois offerts aux ambassadeurs</span>
          </div>
        </div>
      </section>

      {/* === COMMENT ÇA MARCHE === */}
      <section className="mx-auto max-w-4xl px-6 py-10 md:py-14">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700 mb-2">Comment</p>
          <h2 className="text-xl md:text-2xl font-bold">Votre mois avec Sensident</h2>
        </div>
        <ol className="space-y-3 max-w-2xl mx-auto">
          {[
            { n: 1, t: 'Choisissez un article', d: 'Dans le catalogue validé (brossage, alimentation, caries, etc.).', time: '30 s' },
            { n: 2, t: 'Personnalisez', d: 'Signature, logo du cabinet, couleur d\'accent, message libre.', time: '1 min' },
            { n: 3, t: 'Prévisualisez et envoyez', d: 'Email signé de votre nom, envoyé à vos patients inscrits.', time: '20 s' },
            { n: 4, t: 'Consultez les analytics', d: 'Taux de lecture, durée, réactions, rétention. Tout agrégé, anonyme.', time: '30 s' },
          ].map((step) => (
            <li key={step.n} className="rounded-lg border border-border bg-card p-4 flex items-start gap-4">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
                {step.n}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">{step.t}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.d}</p>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground/70 shrink-0">{step.time}</span>
            </li>
          ))}
        </ol>
        <p className="text-center text-sm font-semibold text-blue-700 mt-5">Total&nbsp;: ~3 minutes</p>
      </section>

      {/* === BÉNÉFICES === */}
      <section className="border-y border-border bg-muted/10">
        <div className="mx-auto max-w-4xl px-6 py-10 md:py-14">
          <div className="text-center max-w-2xl mx-auto mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700 mb-2">Bénéfices</p>
            <h2 className="text-xl md:text-2xl font-bold">Pourquoi ça change la donne</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Benefit icon={Heart} title="Un lien qui dure" desc="Vous signez chaque newsletter. Vos patients reçoivent un message de leur dentiste, pas d'une plateforme." />
            <Benefit icon={Brain} title="Des patients plus qualifiés" desc="Un patient qui sait pourquoi ses gencives saignent adhère mieux et pose les bonnes questions." />
            <Benefit icon={BarChart3} title="Mesurable, pas du flou" desc="Taux de lecture, durée, réactions, rétention M0/M+1/M+2. Données anonymisées." />
            <Benefit icon={Send} title="Zéro rédaction" desc="Catalogue rédigé et validé par un comité scientifique. Vous choisissez, vous envoyez." />
            <Benefit icon={Shield} title="Zéro risque juridique" desc="RGPD, HDS, hébergement France, audit logs. Vous n'êtes pas responsable du traitement." />
            <Benefit icon={Users} title="Patients s'inscrivent seuls" desc="QR code au fauteuil ou lien par email. Aucune liste patient à gérer." />
          </div>
        </div>
      </section>

      {/* === TÉMOIGNAGE === */}
      <section className="mx-auto max-w-2xl px-6 py-10 md:py-14 text-center">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 mb-4">
          <Star className="h-5 w-5 text-amber-500" />
        </div>
        <blockquote className="text-lg md:text-xl font-medium leading-relaxed text-foreground/90">
          «&nbsp;Je voulais faire de la prévention sans alourdir mon secrétariat.
          Aujourd&apos;hui j&apos;envoie une newsletter par mois en 3 minutes. Les patients
          m&apos;en parlent en consultation.&nbsp;»
        </blockquote>
        <div className="mt-5 space-y-0.5">
          <p className="font-semibold text-foreground text-sm">Dr François T., chirurgien-dentiste</p>
          <p className="text-xs text-muted-foreground">Membre du comité scientifique Sensident</p>
        </div>
      </section>

      {/* === CTA FINAL === */}
      <section className="border-t border-border bg-gradient-to-b from-background to-blue-50/30">
        <div className="mx-auto max-w-2xl px-6 py-10 md:py-14 text-center">
          <Sparkles className="inline-block h-6 w-6 text-blue-600 mb-2" />
          <h2 className="text-2xl md:text-3xl font-bold">Créez votre compte.</h2>
          <p className="mt-2 text-muted-foreground">Gratuit. Sans CB. 2 minutes.</p>
          <Link
            href="/signup"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Créer mon compte cabinet
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="border-t border-border bg-muted/10 mt-auto">
        <div className="mx-auto max-w-4xl px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground">
          <p>© 2026 Sensident · Prévention bucco-dentaire · HDS · Sans IA</p>
          <Link href="/" className="hover:text-foreground transition">← Retour à l&apos;accueil</Link>
        </div>
      </footer>
    </main>
  );
}

function Benefit({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
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
