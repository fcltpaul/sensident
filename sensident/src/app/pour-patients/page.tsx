import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ArrowRight, BookOpen, Heart } from 'lucide-react';

export const dynamic = 'force-static';

export const metadata = {
  title: 'Pour les patients — Sensident',
  description: "Sensident : votre dentiste vous envoie chaque mois un article de prévention validé scientifiquement.",
};

export default function PourPatientsPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="sm" showText={false} />
            <span className="text-sm font-semibold text-foreground">Sensident</span>
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition">
            J&apos;accède à mon espace →
          </Link>
        </div>
      </header>

      <section className="border-b border-border bg-gradient-to-b from-emerald-50/40 to-background">
        <div className="mx-auto max-w-3xl px-6 py-12 md:py-16 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 mb-4">
            <Heart className="h-3 w-3" /> Pour les patients
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-[1.1]">
            Votre dentiste vous aide
            <br />
            <span className="text-emerald-700">à prendre soin de vos dents.</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Chaque mois, un article court de prévention, validé scientifiquement,
            signé de son nom. C&apos;est offert par votre praticien.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <BookOpen className="h-4 w-4" />
              J&apos;accède à mon espace
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/articles"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-6 py-3 text-sm font-medium hover:bg-muted transition"
            >
              Voir des exemples d&apos;articles
            </Link>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Pas encore inscrit&nbsp;? Demandez à votre dentiste, il s&apos;inscrit en 2 minutes.
          </p>
        </div>
      </section>

      <footer className="border-t border-border bg-muted/10 mt-auto">
        <div className="mx-auto max-w-3xl px-6 py-5 flex items-center justify-between text-xs text-muted-foreground">
          <p>© 2026 Sensident · HDS · Sans IA</p>
          <Link href="/" className="hover:text-foreground transition">← Accueil</Link>
        </div>
      </footer>
    </main>
  );
}
