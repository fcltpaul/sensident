import Link from 'next/link';
import { Logo } from '@/components/logo';
import {
  ArrowRight, BookOpen, Heart, Shield, Sparkles, Clock, Stethoscope,
  CheckCircle, X, Mail,
} from 'lucide-react';

export const dynamic = 'force-static';

export const metadata = {
  title: 'Pour les patients — Sensident',
  description:
    "Comprenez ce que votre dentiste peut faire pour vous entre deux rendez-vous. Un article par mois, 30 secondes à lire, validé scientifiquement. Gratuit.",
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
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition">
            J&apos;accède à mon espace →
          </Link>
        </div>
      </header>

      {/* === HERO === */}
      <section className="border-b border-border bg-gradient-to-b from-emerald-50/40 to-background">
        <div className="mx-auto max-w-3xl px-6 py-12 md:py-16 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 mb-4">
            <Heart className="h-3 w-3" /> Pour les patients
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.05]">
            Et si votre dentiste
            <br />
            <span className="text-emerald-700">continuait à s&apos;occuper de vous</span>
            <br />
            <span className="text-emerald-700">entre deux rendez-vous&nbsp;?</span>
          </h1>
          <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Chaque mois, un article court de prévention, signé de son nom.
            <strong className="text-foreground"> 30 secondes à lire, à garder en tête jusqu&apos;au prochain rendez-vous.</strong>
            C&apos;est gratuit, sans pub, sans IA.
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
            Pas encore inscrit&nbsp;? Parlez-en à votre dentiste en personne, il s&apos;inscrit en 2 minutes.
          </p>
        </div>
      </section>

      {/* === POURQUOI C'EST DIFFÉRENT (votre santé, pas votre timeline) === */}
      <section className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700 text-center mb-3">Le problème</p>
        <h2 className="text-2xl md:text-3xl font-bold text-center leading-tight">
          Vous voyez votre dentiste 30 minutes par an.
          <br />
          <span className="text-muted-foreground">Vos dents, elles, vivent avec vous 365 jours.</span>
        </h2>
        <p className="mt-5 text-base text-muted-foreground leading-relaxed text-center max-w-2xl mx-auto">
          Le reste du temps, vous êtes seul avec votre brosse à dents, les
          conseils Instagram de votre sœur, et les vidéos TikTok de dentistes
          qui vendent des produits. Pas étonnant que les caries et les
          gingivites reviennent.
        </p>
        <div className="mt-7 rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 text-center">
          <p className="text-base text-foreground leading-relaxed">
            <Sparkles className="inline h-4 w-4 text-emerald-600 mr-1" />
            <strong>Sensident, c&apos;est votre dentiste dans votre poche</strong> —
            un message court par mois, signé de son nom, qui vous rappelle
            <em> ce qu&apos;il vous a déjà dit en consultation</em>.
          </p>
        </div>
      </section>

      {/* === 5 BÉNÉFICES POUR VOUS === */}
      <section className="border-y border-border bg-muted/10">
        <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700 text-center mb-3">Concrètement</p>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Ce que ça change pour vous
          </h2>
          <div className="space-y-3">
            <Benefit
              emoji="🦷"
              title="Moins de caries, moins de douleurs"
              desc="Une gingivite dépistée à temps, c'est 10 minutes de détartrage au lieu d'un mois de traitement. Les articles vous apprennent à repérer les signes."
            />
            <Benefit
              emoji="💰"
              title="Moins de soins coûteux"
              desc="Un brossage corrigé et du fil dentaire : c'est 0 € et ça vous évite un soin à 200 € dans 6 mois. La prévention, c'est rentable."
            />
            <Benefit
              emoji="🧠"
              title="Vous comprenez ce qu'il vous dit"
              desc="Quand votre dentiste parle de « gencive attachée » ou de « technique de Bass », vous savez de quoi il parle. Les consultations sont plus utiles."
            />
            <Benefit
              emoji="👨‍👩‍👧"
              title="Vos enfants apprennent avec vous"
              desc="Les articles sur les enfants vous donnent les bons réflexes à transmettre. C'est votre meilleur investissement santé pour eux."
            />
            <Benefit
              emoji="🪞"
              title="Vous gardez vos dents toute votre vie"
              desc="À 80 ans, garder toutes ses dents, c'est possible. Mais ça se prépare à 30, 40, 50 ans. Chaque article est un petit pas."
            />
          </div>
        </div>
      </section>

      {/* === CE QUE CE N'EST PAS === */}
      <section className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground text-center mb-6">Pour être clair</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <NotThis
            title="Ce n'est pas du marketing"
            desc="Pas de promotion, pas de produit à vendre. Article signé par un comité scientifique de chirurgiens-dentistes."
          />
          <NotThis
            title="Ce n'est pas de la pub Facebook"
            desc="Pas d'algorithme, pas de retargeting. Un email direct, ponctuel, depuis l'adresse de votre dentiste."
          />
          <NotThis
            title="Ce n'est pas une news IA"
            desc="Pas de texte généré automatiquement. Chaque article est rédigé et relu par un dentiste humain."
          />
          <NotThis
            title="Ce n'est pas une obligation"
            desc="Vous pouvez vous désinscrire en un clic depuis n'importe quel email. Vos données restent confidentielles (HDS, RGPD)."
          />
        </div>
      </section>

      {/* === COMMENT ÇA SE PASSE === */}
      <section className="border-y border-border">
        <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">
            Comment ça se passe&nbsp;?
          </h2>
          <p className="text-center text-sm text-muted-foreground mb-8">
            2 minutes, et c&apos;est fait.
          </p>
          <ol className="space-y-3 max-w-xl mx-auto">
            {[
              { t: 'Votre dentiste vous donne un lien', d: 'QR code au fauteuil, message depuis sa borne, ou SMS après un rendez-vous.' },
              { t: 'Vous saisissez votre email', d: 'Vous choisissez ce que vous acceptez recevoir : newsletter, statistiques, rien d\'autre.' },
              { t: 'Vous recevez 1 article par mois', d: '5 slides, 30 secondes, signé de son nom. Vous pouvez vous désinscrire en 1 clic.' },
            ].map((step, i) => (
              <li key={i} className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-foreground text-sm">{step.t}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* === VOS DONNÉES === */}
      <section className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <div className="rounded-xl border border-border bg-card p-6 md:p-7">
          <div className="flex items-start gap-3">
            <Shield className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg md:text-xl font-bold">Vos données, vos règles</h2>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /><span>Hébergé en France, sur des serveurs certifiés HDS (Hébergement de Données de Santé).</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /><span>Votre dentiste ne voit <strong>que des chiffres agrégés</strong> (taux de lecture), jamais votre nom ni votre email.</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /><span>Vous pouvez exporter ou supprimer toutes vos données à tout moment, en 1 clic.</span></li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /><span>Aucune publicité, aucun partage, aucune revente. Jamais.</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* === CTA FINAL === */}
      <section className="border-t border-border bg-gradient-to-b from-background to-emerald-50/40">
        <div className="mx-auto max-w-2xl px-6 py-12 md:py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold">Votre dentiste a déjà commencé&nbsp;?</h2>
          <p className="mt-2 text-muted-foreground">
            Connectez-vous pour retrouver votre bibliothèque d&apos;articles.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            J&apos;accède à mon espace
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            Pas encore inscrit&nbsp;?
            <br />
            <Mail className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
            Parlez-en à votre dentiste en personne, lors de votre prochain rendez-vous.
          </p>
        </div>
      </section>

      <footer className="border-t border-border bg-muted/10 mt-auto">
        <div className="mx-auto max-w-3xl px-6 py-5 flex items-center justify-between text-xs text-muted-foreground">
          <p>© 2026 Sensident · HDS · RGPD · Sans IA</p>
          <Link href="/" className="hover:text-foreground transition">← Accueil</Link>
        </div>
      </footer>
    </main>
  );
}

function Benefit({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
      <span className="text-2xl shrink-0">{emoji}</span>
      <div>
        <p className="font-semibold text-foreground text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function NotThis({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4 flex items-start gap-3">
      <X className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-foreground text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
