import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { cabinets, articles, patientConsents, readingSessions, patientReactions } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { PatientActions } from './patient-actions';

export const dynamic = 'force-dynamic';

const DEMO_CABINET_SLUG = 'demo-francois-thibault';

async function getPatientDemoData() {
  if (process.env.SENSIDENT_DEMO_MODE !== '1') return null;

  const [cab] = await db
    .select()
    .from(cabinets)
    .where(eq(cabinets.slug, DEMO_CABINET_SLUG))
    .limit(1);
  if (!cab) return null;

  // Premier patient du cabinet
  const [patient] = await db
    .select()
    .from(patientConsents)
    .where(eq(patientConsents.cabinetId, cab.id))
    .limit(1);
  if (!patient) return null;

  // 3 articles lus par ce patient
  const myReadings = await db
    .select({
      id: readingSessions.id,
      articleSlug: readingSessions.articleSlug,
      startedAt: readingSessions.startedAt,
      durationSeconds: readingSessions.durationSeconds,
      completed: readingSessions.completed,
    })
    .from(readingSessions)
    .where(eq(readingSessions.patientEmailHash, patient.emailHash))
    .orderBy(desc(readingSessions.startedAt))
    .limit(3);

  // 10 articles validés
  const allArticles = await db
    .select({
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      readingTimeMin: articles.readingTimeMin,
    })
    .from(articles)
    .where(eq(articles.status, 'validated'))
    .orderBy(desc(articles.validatedAt))
    .limit(10);

  return {
    cabinet: { name: cab.name, slug: cab.slug },
    patient: { id: patient.id, createdAt: patient.createdAt, confirmedAt: patient.confirmedAt },
    myReadings,
    articles: allArticles,
  };
}

export const metadata = {
  title: 'Démo Patient — Sensident',
  description: 'Espace patient démo de Sensident',
};

export default async function PatientDemoPage() {
  const data = await getPatientDemoData();
  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Démo patient indisponible</h1>
          <p className="text-muted-foreground">
            Active <code className="bg-muted px-1.5 py-0.5 rounded text-sm">SENSIDENT_DEMO_MODE=1</code> et seed le cabinet démo.
          </p>
          <Link href="/demo" className="inline-block text-sm text-accent hover:underline">
            ← Retour au hub démo
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/30 to-background">
      {/* HEADER */}
      <section className="border-b border-border bg-card/50">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Link href="/demo" className="hover:text-foreground">← Hub démo</Link>
            <span className="text-muted-foreground/40">|</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-medium">
              📚 Espace patient
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Service de prévention offert par</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {data.cabinet.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bienvenue Marie ! Voici vos articles et votre espace personnel.
          </p>
        </div>
      </section>

      {/* ACTIONS PATIENT */}
      <section className="mx-auto max-w-3xl px-6 py-4">
        <PatientActions />
      </section>

      {/* 3 ARTICLES LUS */}
      {data.myReadings.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 py-4">
          <h2 className="text-lg font-semibold mb-3">Vos 3 dernières lectures</h2>
          <div className="grid gap-3">
            {data.myReadings.map((r) => (
              <div key={r.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{r.articleSlug}</p>
                  <span className="text-xs text-muted-foreground">
                    {r.completed ? '✓ Terminé' : 'En cours'} · {Math.round(r.durationSeconds / 60)} min
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* BIBLIOTHÈQUE COMPLÈTE */}
      <section className="mx-auto max-w-3xl px-6 py-4">
        <h2 className="text-lg font-semibold mb-1">Catalogue d'articles ({data.articles.length})</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Cliquez sur "Espace patient" pour entrer en mode lecture immersive (avec tracking de l'attention).
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.articles.map((a) => (
            <div key={a.slug} className="rounded-lg border border-border bg-card p-4">
              <p className="font-semibold text-sm">{a.title}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.excerpt}</p>
              <p className="text-xs text-muted-foreground mt-2">{a.readingTimeMin} min de lecture</p>
            </div>
          ))}
        </div>
      </section>

      {/* INFOS PATIENT */}
      <section className="mx-auto max-w-3xl px-6 py-4">
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <p className="font-medium mb-2">Ce que ce patient a accepté (RGPD) :</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>✅ CGU v1.0-2026-06-08</li>
            <li>✅ Newsletter (reçoit les campagnes du cabinet)</li>
            <li>✅ Analytics de lecture (heartbeat — page/article/scroll)</li>
            <li>✅ Réactions 👍/👎 sur les articles</li>
            <li>📋 Opt-in : {patientDate(data.patient.createdAt)}</li>
            <li>📋 Confirmation : {patientDate(data.patient.confirmedAt)}</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

function patientDate(d: any): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR');
}
