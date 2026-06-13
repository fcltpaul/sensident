import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ConvaincreMonDentiste } from '../convaincre';
import {
  ArrowRight, BookOpen, Shield, Mail, Heart, Clock, CheckCircle,
} from 'lucide-react';

export const dynamic = 'force-static';

export const metadata = {
  title: 'Pour les patients — Sensident',
  description:
    "Sensident, c'est ce que votre dentiste peut vous offrir pour prendre soin de vos dents. Gratuitement. Sans IA. Validé scientifiquement.",
};

export default function PourPatientsPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* === TOP BAR === */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="sm" showText={false} />
            <span className="text-sm font-semibold text-foreground">Sensident</span>
          </Link>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            J&apos;accède à mon espace →
          </Link>
        </div>
      </header>

      {/* === HERO === */}
      <section className="border-b border-border bg-gradient-to-b from-emerald-50/40 to-background">
        <div className="mx-auto max-w-3xl px-6 py-10 md:py-14 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 mb-4">
            <Heart className="h-3 w-3" /> Pour les patients
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            Votre dentiste vous aide
            <br />
            <span className="text-emerald-700">à prendre soin de vos dents.</span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Sensident lui permet de vous envoyer, chaque mois, un article court
            de prévention validé par un comité scientifique. C&apos;est offert
            par votre praticien.
          </p>

          {/* 2 CTA principaux */}
          <div className="mt-7 grid gap-3 sm:grid-cols-2 max-w-2xl mx-auto text-left">
            <Link
              href="/login"
              className="group flex flex-col items-start gap-1 rounded-xl border-2 border-border bg-background p-4 transition hover:border-emerald-400 hover:shadow-sm"
            >
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <BookOpen className="h-4 w-4" />
              </div>
              <p className="font-semibold text-foreground text-sm">Mon dentiste est partenaire</p>
              <p className="text-xs text-muted-foreground">J&apos;accède à mon espace patient.</p>
              <span className="mt-1 text-xs font-medium text-emerald-700 group-hover:translate-x-0.5 transition inline-flex items-center gap-1">
                Connexion <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
            <a
              href="#convaincre"
              className="group flex flex-col items-start gap-1 rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4 transition hover:border-emerald-400 hover:shadow-sm"
            >
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Mail className="h-4 w-4" />
              </div>
              <p className="font-semibold text-foreground text-sm">Pas encore partenaire</p>
              <p className="text-xs text-muted-foreground">Je lui propose de rejoindre Sensident.</p>
              <span className="mt-1 text-xs font-medium text-emerald-700 group-hover:translate-x-0.5 transition inline-flex items-center gap-1">
                Voir le message type <ArrowRight className="h-3 w-3" />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* === POURQUOI === */}
      <section className="mx-auto max-w-3xl px-6 py-10 md:py-14">
        <h2 className="text-xl md:text-2xl font-semibold mb-1">Pourquoi c&apos;est utile&nbsp;?</h2>
        <p className="text-sm text-muted-foreground mb-6">
          La bouche est la porte d&apos;entrée du corps. Mieux comprendre, c&apos;est mieux prévenir.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Reason icon="💌" title="De votre dentiste" desc="Pas d'une marque. Un email signé de votre praticien, chaque mois." />
          <Reason icon="⏱" title="30 secondes" desc="5 slides visuels, scannables sur mobile. Format conçu pour les pressés." />
          <Reason icon="🧠" title="Validé scientifiquement" desc="Rédigé et validé par un comité de chirurgiens-dentistes." />
        </div>
      </section>

      {/* === CONVAINCRE === */}
      <section id="convaincre" className="border-y border-border bg-muted/10 scroll-mt-20">
        <div className="mx-auto max-w-3xl px-6 py-10 md:py-14">
          <ConvaincreMonDentiste />
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="border-t border-border bg-muted/10 mt-auto">
        <div className="mx-auto max-w-3xl px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground">
          <p>© 2026 Sensident · Prévention bucco-dentaire · HDS · Sans IA</p>
          <Link href="/" className="hover:text-foreground transition">← Retour à l&apos;accueil</Link>
        </div>
      </footer>
    </main>
  );
}

function Reason({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-2xl mb-2">{icon}</div>
      <p className="font-semibold text-foreground text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
    </div>
  );
}
