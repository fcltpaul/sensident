import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { db } from '@/db/client';
import { cabinets, articles } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { PatientDashboard } from './patient-dashboard';

export default async function BienvenuePage({ params }: { params: { slug: string } }) {
  const cab = (await db.select().from(cabinets).where(eq(cabinets.slug, params.slug)).limit(1))[0];
  if (!cab) notFound();

  // Poser le cookie cabinet pour le tracking heartbeat JS
  const cookieStore = await cookies();
  if (!cookieStore.get('sensident_current_cabinet')) {
    // On ne peut pas setCookie dans App Router sans un NextResponse
    // Alternative : JS front-end lit le data attribute du DOM
  }

  // Articles publies (status='published'), tries par date de publication
  const recentArticles = await db
    .select({
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      publishedAt: articles.validatedAt,
    })
    .from(articles)
    .where(eq(articles.status, 'validated'))
    .orderBy(desc(articles.validatedAt))
    .limit(5);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <header className="space-y-2">
          <p className="text-xs text-muted-foreground">Service de prevention offert par</p>
          <h1 className="text-2xl font-bold">{cab.name}</h1>
        </header>

        <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900 dark:bg-green-950/30">
          <p className="font-semibold">Inscription confirmee</p>
          <p className="mt-1 text-xs">
            Vous recevrez bientot votre premiere newsletter. Vous pouvez vous desabonner a tout moment depuis n'importe quel email.
          </p>
        </div>

        <PatientDashboard
          cabinet={{
            name: cab.name,
            slug: cab.slug,
            contactEmail: cab.contactEmail,
          }}
          articles={recentArticles.map((a) => ({
            slug: a.slug,
            title: a.title,
            excerpt: a.excerpt,
          }))}
        />
      </div>
    </main>
  );
}
