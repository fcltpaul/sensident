/**
 * Sensident — Landing patient (racine /c/[slug])
 *
 * C'est la page d'accueil qu'un patient voit après avoir cliqué sur un lien
 * envoyé par son dentiste (URL du type https://sensident.fr/c/cabinet-slug).
 *
 * Pour la démo François : la page affiche le branding du cabinet, un message
 * de bienvenue, et un CTA vers /rejoindre pour s'inscrire.
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db/client';
import { cabinets, articles } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { Logo } from '@/components/logo';
import { Shield, Stethoscope, ArrowRight, BookOpen, CheckCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CabinetLandingPage({ params }: { params: { slug: string } }) {
  const [cab] = await db
    .select()
    .from(cabinets)
    .where(eq(cabinets.slug, params.slug))
    .limit(1);
  if (!cab) notFound();

  // 3 derniers articles validés
  const recentArticles = await db
    .select({
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
    })
    .from(articles)
    .where(eq(articles.status, 'validated'))
    .orderBy(desc(articles.validatedAt))
    .limit(3);

  return (
    <main className="min-h-screen bg-background">
      {/* HERO */}
      <section className="border-b border-border bg-gradient-to-b from-accent/5 to-background">
        <div className="mx-auto max-w-2xl px-6 py-12 md:py-16">
          <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
            <Logo size="sm" showText={false} />
            <span className="font-semibold text-foreground">Sensident</span>
          </div>

          <p className="text-sm text-muted-foreground">Service de prévention offert par</p>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
            {cab.name}
          </h1>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            Votre dentiste vous accompagne dans votre santé bucco-dentaire.
            Recevez des articles de prévention validés scientifiquement, directement dans votre boîte mail.
            <strong className="text-foreground"> Gratuitement.</strong>
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              href={`/c/${cab.slug}/rejoindre`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Je rejoins le service
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/c/${cab.slug}/bibliotheque`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-sm font-medium hover:bg-muted"
            >
              <BookOpen className="h-4 w-4" />
              Lire des articles
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              Articles validés par des chirurgiens-dentistes
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-green-500" />
              Vos données restent confidentielles
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Stethoscope className="h-3.5 w-3.5 text-green-500" />
              Pas de spam, vous choisissez
            </span>
          </div>
        </div>
      </section>

      {/* ARTICLES */}
      {recentArticles.length > 0 && (
        <section className="mx-auto max-w-2xl px-6 py-10">
          <h2 className="text-lg font-semibold mb-4">Quelques articles pour vous</h2>
          <div className="space-y-3">
            {recentArticles.map((a) => (
              <Link
                key={a.slug}
                href={`/c/${cab.slug}/bibliotheque/${a.slug}`}
                className="block rounded-lg border border-border bg-card p-4 hover:border-accent/50 transition"
              >
                <p className="font-semibold text-sm">{a.title}</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{a.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="border-t border-border bg-muted/10 mt-10">
        <div className="mx-auto max-w-2xl px-6 py-6 text-xs text-muted-foreground">
          <p>Service proposé par Sensident · Données hébergées en France, sans IA</p>
          <p className="mt-1">
            Vous pouvez vous désabonner à tout moment depuis n'importe quel email reçu.
          </p>
        </div>
      </footer>
    </main>
  );
}
