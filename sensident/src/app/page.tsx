import Link from 'next/link';
import { Logo } from '@/components/logo';
import {
  ArrowRight, Shield, CheckCircle, Stethoscope, Mail, Copy, Check, X,
  Heart, BookOpen, Sparkles, ChevronDown,
} from 'lucide-react';
import { ConvaincreMonDentiste } from './convaincre';

export const dynamic = 'force-static';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f8fafc_1px,transparent_1px),linear-gradient(to_bottom,#f8fafc_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        <div className="relative mx-auto max-w-5xl px-6 pt-12 pb-14 md:pt-16 md:pb-20 text-center">

          <div className="flex items-center justify-center gap-2 mb-6">
            <Logo size="sm" showText={false} />
            <span className="text-sm font-semibold text-foreground">Sensident</span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/90 px-3.5 py-1 text-xs font-medium text-muted-foreground shadow-xs mb-6">
            <Shield className="h-3 w-3 text-green-600" />
            Conforme HDS · RGPD · Sans IA · Hébergé en France
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
            Votre dentiste vous aide
            <br />
            <span className="text-accent">à prendre soin de vos dents.</span>
          </h1>

          <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Sensident permet à votre dentiste de vous envoyer chaque mois un article de prévention
            validé scientifiquement, écrit par des chirurgiens-dentistes, en 5 slides
            lisibles en 30 secondes. C&apos;est offert par votre praticien.
          </p>

          <div className="mt-9 grid gap-3 sm:grid-cols-2 max-w-2xl mx-auto">

            {/* CTA 1 : Patient déjà inscrit */}
            <Link
              href="/login"
              className="group flex flex-col items-start gap-2 rounded-xl border-2 border-border bg-background p-5 text-left transition hover:border-accent hover:shadow-sm"
            >
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <BookOpen className="h-5 w-5" />
              </div>
              <p className="font-semibold text-foreground">Mon dentiste est partenaire</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Accédez à votre bibliothèque d&apos;articles et à vos lectures.
              </p>
              <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent group-hover:translate-x-0.5 transition">
                J&apos;accède à mon espace patient
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>

            {/* CTA 2 : Convaincre mon dentiste */}
            <a
              href="#convaincre"
              className="group flex flex-col items-start gap-2 rounded-xl border-2 border-accent/30 bg-accent/5 p-5 text-left transition hover:border-accent hover:shadow-sm"
            >
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Mail className="h-5 w-5" />
              </div>
              <p className="font-semibold text-foreground">Mon dentiste n&apos;a pas encore Sensident</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Envoyez-lui un message type — il s&apos;inscrira en 2 minutes.
              </p>
              <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent group-hover:translate-x-0.5 transition">
                Je lui propose
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </a>
          </div>

          <div className="mt-6 text-xs text-muted-foreground">
            <Link
              href="/articles"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition"
            >
              <BookOpen className="h-3 w-3" />
              Voir des exemples d&apos;articles (lecture libre, sans inscription)
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ DENTISTE : BANDEAU SECONDAIRE ═══════════ */}
      <section className="border-b border-border bg-muted/10">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <div className="rounded-xl border border-dashed border-border bg-background p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/5 text-primary shrink-0">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">Vous êtes chirurgien-dentiste&nbsp;?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Offrez un service de prévention à vos patients en 3 minutes par mois.
                Articles validés, templates prêts, aucune liste à gérer.
              </p>
            </div>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 shrink-0"
            >
              Créer mon compte cabinet
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ 3 BONNES RAISONS (PATIENT) ═══════════ */}
      <section className="mx-auto max-w-5xl px-6 py-14 md:py-20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent mb-2">Pourquoi</p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Votre bouche parle à tout votre corps.</h2>
          <p className="mt-3 text-muted-foreground text-base leading-relaxed">
            Gencives qui saignent, diabète, maladies cardiovasculaires, complications de grossesse&nbsp;:
            tout part d&apos;ici. Mieux comprendre, c&apos;est mieux prévenir.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <ReasonCard
            icon="💌"
            title="Directement de votre dentiste"
            desc="Pas d'une marque, pas d'un influenceur. Un email signé de votre praticien, chaque mois."
          />
          <ReasonCard
            icon="⏱"
            title="30 secondes de lecture"
            desc="5 slides visuels, scannables sur mobile. Le format a été conçu pour les patients pressés."
          />
          <ReasonCard
            icon="🧠"
            title="Validé scientifiquement"
            desc="Chaque article est relu et validé par un comité scientifique de chirurgiens-dentistes."
          />
        </div>
      </section>

      {/* ═══════════ CONVAINCRE MON DENTISTE ═══════════ */}
      <section id="convaincre" className="border-y border-border bg-muted/10 scroll-mt-20">
        <div className="mx-auto max-w-3xl px-6 py-14 md:py-20">
          <ConvaincreMonDentiste />
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-border bg-muted/10">
        <div className="mx-auto max-w-7xl px-6 py-8">
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
          <div className="mt-6 border-t border-border/50 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground/70">
            <p>© 2026 Sensident · Prévention bucco-dentaire · Hébergement HDS · Sans IA</p>
            <Link href="/demo" className="text-muted-foreground/60 hover:text-muted-foreground underline underline-offset-2">
              Démo interne
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function ReasonCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-3xl mb-3">{icon}</div>
      <p className="font-semibold text-foreground text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{desc}</p>
    </div>
  );
}
