import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ArrowRight, Shield, Heart, Stethoscope, Sparkles } from 'lucide-react';

export const dynamic = 'force-static';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* === TOP BAR === */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="sm" showText={false} />
            <span className="text-sm font-semibold text-foreground">Sensident</span>
          </div>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            Déjà inscrit ? Se connecter →
          </Link>
        </div>
      </header>

      {/* === HERO COURT === */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-12 md:py-16 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs mb-5">
            <Shield className="h-3 w-3 text-green-600" />
            Conforme HDS · RGPD · Sans IA · Hébergé en France
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            La prévention dentaire,
            <br />
            <span className="text-accent">en confiance.</span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Sensident permet à votre dentiste de vous envoyer chaque mois un article
            de prévention validé scientifiquement. Choisissez votre profil pour en
            savoir plus.
          </p>
        </div>
      </section>

      {/* === SPLIT 2 COLONNES === */}
      <section className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-10 md:py-14">
          <div className="grid gap-5 md:grid-cols-2">
            {/* Colonne Patient */}
            <Link
              href="/pour-patients"
              className="group relative flex flex-col rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-background p-7 md:p-9 transition hover:border-emerald-400 hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Heart className="h-6 w-6" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                  Pour vous
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Je suis patient·e
              </h2>
              <p className="mt-2 text-sm md:text-base text-muted-foreground leading-relaxed">
                Votre dentiste vous aide à prendre soin de vos dents. Recevez
                chaque mois un article court, validé par des chirurgiens-dentistes,
                signé de son nom.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-foreground/80">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">✓</span>
                  <span>Mon dentiste est partenaire&nbsp;? J&apos;accède à mes articles.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">✓</span>
                  <span>Mon dentiste n&apos;a pas encore Sensident&nbsp;? Je lui propose.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">✓</span>
                  <span>Je lis des exemples d&apos;articles (libre, sans inscription).</span>
                </li>
              </ul>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 group-hover:translate-x-0.5 transition">
                Découvrir côté patients
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>

            {/* Colonne Dentiste */}
            <Link
              href="/pour-dentistes"
              className="group relative flex flex-col rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/40 to-background p-7 md:p-9 transition hover:border-blue-400 hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Stethoscope className="h-6 w-6" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                  Pour vous
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Je suis dentiste
              </h2>
              <p className="mt-2 text-sm md:text-base text-muted-foreground leading-relaxed">
                Offrez un service de prévention à vos patients en 3 minutes par
                mois. Articles validés, templates prêts, aucune liste à gérer.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-foreground/80">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">✓</span>
                  <span>Un article par mois, signé à votre nom.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">✓</span>
                  <span>Vos patients s&apos;inscrivent via QR code ou lien.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">✓</span>
                  <span>Agrégats anonymisés, conformes HDS.</span>
                </li>
              </ul>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 group-hover:translate-x-0.5 transition">
                Découvrir côté dentistes
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>

          {/* Lien public latéral */}
          <div className="mt-8 text-center">
            <Link
              href="/articles"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Voir des exemples d&apos;articles (lecture libre, sans inscription)
            </Link>
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="border-t border-border bg-muted/10">
        <div className="mx-auto max-w-6xl px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground">
          <p>© 2026 Sensident · Prévention bucco-dentaire · HDS · Sans IA</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/cgu" className="hover:text-foreground transition">CGU</Link>
            <Link href="/politique-confidentialite" className="hover:text-foreground transition">Confidentialité</Link>
            <Link href="/mentions-legales" className="hover:text-foreground transition">Mentions légales</Link>
            <Link href="/demo" className="hover:text-foreground transition">Démo interne</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
