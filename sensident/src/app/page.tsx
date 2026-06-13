import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ArrowRight, Shield, Heart, Stethoscope, Sparkles } from 'lucide-react';

export const dynamic = 'force-static';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="sm" showText={false} />
            <span className="text-sm font-semibold text-foreground">Sensident</span>
          </div>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition">
            Se connecter →
          </Link>
        </div>
      </header>

      <section className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-10 md:py-14 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs mb-5">
            <Shield className="h-3 w-3 text-green-600" />
            Conforme HDS · RGPD · Sans IA · Hébergé en France
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.05]">
            La prévention dentaire,
            <br />
            <span className="text-accent">enfin continue.</span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Sensident permet à votre dentiste de vous envoyer chaque mois un
            article court, validé scientifiquement, signé de son nom. 30
            secondes à lire, 365 jours de bénéfice sur vos dents.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Vous êtes qui&nbsp;?
          </p>
        </div>
      </section>

      <section className="flex-1">
        <div className="mx-auto max-w-4xl px-6 py-8 md:py-10">
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/pour-patients"
              className="group flex flex-col rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-background p-6 md:p-7 transition hover:border-emerald-400 hover:shadow-md"
            >
              <Heart className="h-7 w-7 text-emerald-600 mb-3" />
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Je suis patient·e</h2>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                Découvrez ce que votre dentiste peut faire pour vous entre deux rendez-vous.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 group-hover:translate-x-0.5 transition">
                Lire la version patient <ArrowRight className="h-4 w-4" />
              </span>
            </Link>

            <Link
              href="/pour-dentistes"
              className="group flex flex-col rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/40 to-background p-6 md:p-7 transition hover:border-blue-400 hover:shadow-md"
            >
              <Stethoscope className="h-7 w-7 text-blue-600 mb-3" />
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Je suis dentiste</h2>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                Offrez ce service à vos patients en 3 min/mois. Conforme, rentable, différenciant.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 group-hover:translate-x-0.5 transition">
                Lire la version dentiste <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between text-xs text-muted-foreground">
          <p>© 2026 Sensident · HDS · Sans IA</p>
          <Link href="/articles" className="hover:text-foreground transition">
            <Sparkles className="inline h-3 w-3 mr-1" />
            Voir des exemples d&apos;articles
          </Link>
        </div>
      </footer>
    </main>
  );
}
