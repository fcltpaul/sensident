import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ArrowRight, Stethoscope, CheckCircle, Clock, BookOpen, Sparkles } from 'lucide-react';

export const dynamic = 'force-static';

export const metadata = {
  title: 'Pour les dentistes — Sensident',
  description: 'Offrez un service de prévention à vos patients en 3 minutes par mois. Articles validés, templates prêts, conformité HDS.',
};

export default function PourDentistesPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
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

      <section className="border-b border-border bg-gradient-to-b from-blue-50/40 to-background">
        <div className="mx-auto max-w-4xl px-6 py-12 md:py-16 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800 mb-4">
            <Stethoscope className="h-3 w-3" /> Pour les chirurgiens-dentistes
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-[1.1]">
            3 minutes par mois.
            <br />
            <span className="text-blue-700">Un vrai lien avec vos patients.</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Un article validé scientifiquement, signé de votre nom, envoyé à vos
            patients qui le souhaitent. Aucune liste à gérer.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
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
            <span className="inline-flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> Sans CB</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> 2 min à l&apos;inscription</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> 6 mois ambassadeur</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700 text-center mb-5">En 4 étapes</p>
        <ol className="space-y-3 max-w-xl mx-auto">
          {[
            { t: 'Choisissez un article', d: 'Catalogue validé (brossage, alimentation, caries, etc.)' },
            { t: 'Personnalisez', d: 'Signature, couleur, message libre' },
            { t: 'Envoyez', d: 'Email signé de votre nom, à vos patients inscrits' },
            { t: 'Consultez les analytics', d: 'Taux de lecture, durée, réactions (anonymisés)' },
          ].map((step, i) => (
            <li key={i} className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">{step.t}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.d}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-center text-sm font-semibold text-blue-700 mt-5">
          <Clock className="inline h-3.5 w-3.5 mr-1" />
          Total : ~3 minutes par mois
        </p>
      </section>

      <section className="border-t border-border bg-muted/10">
        <div className="mx-auto max-w-4xl px-6 py-10 text-center">
          <Sparkles className="inline h-5 w-5 text-blue-600 mb-2" />
          <h2 className="text-xl font-bold">Créez votre compte.</h2>
          <p className="mt-1 text-sm text-muted-foreground">Gratuit. Sans CB. 2 minutes.</p>
          <Link
            href="/signup"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Créer mon compte cabinet
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border bg-muted/10 mt-auto">
        <div className="mx-auto max-w-4xl px-6 py-5 flex items-center justify-between text-xs text-muted-foreground">
          <p>© 2026 Sensident · HDS · Sans IA</p>
          <Link href="/" className="hover:text-foreground transition">← Accueil</Link>
        </div>
      </footer>
    </main>
  );
}
