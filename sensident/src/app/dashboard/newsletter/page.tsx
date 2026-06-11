import { db } from '@/db/client';
import { articles, categories, articleCategories, newsletterTemplates, newsletterSends, newsletterRecipients, patientConsents, practitioners, cabinets } from '@/db/schema';
import { eq, desc, and, gte, sql, count, inArray } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NewsletterComposer } from './composer';
import Link from 'next/link';

export default async function NewsletterPage() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) redirect('/login');

  // Articles valides du catalogue
  const validArticles = await db
    .select()
    .from(articles)
    .where(eq(articles.status, 'validated'))
    .orderBy(desc(articles.validatedAt));

  // Mapping article -> categories
  const acs = validArticles.length > 0
    ? await db
        .select()
        .from(articleCategories)
        .where(inArray(articleCategories.articleSlug, validArticles.map((a) => a.slug)))
    : [];
  const articleToCategories = new Map<string, string[]>();
  for (const ac of acs) {
    const arr = articleToCategories.get(ac.articleSlug) ?? [];
    arr.push(ac.categoryId);
    articleToCategories.set(ac.articleSlug, arr);
  }

  // Toutes les categories
  const allCats = await db.select().from(categories);
  const roots = allCats.filter((c) => !c.parentId).sort((a, b) => a.position - b.position);
  const childrenByParent = new Map<string, typeof allCats>();
  for (const c of allCats) {
    if (c.parentId) {
      const arr = childrenByParent.get(c.parentId) ?? [];
      arr.push(c);
      childrenByParent.set(c.parentId, arr);
    }
  }

  // Templates actifs
  const templates = await db
    .select()
    .from(newsletterTemplates)
    .where(eq(newsletterTemplates.isActive, true));

  // Infos du praticien et du cabinet
  const cab = (await db.select().from(cabinets).where(eq(cabinets.id, session.cabinetId)).limit(1))[0];
  const prac = (await db.select().from(practitioners).where(eq(practitioners.id, session.practitionerId)).limit(1))[0];

  // Historique des envois
  const history = await db
    .select()
    .from(newsletterSends)
    .where(eq(newsletterSends.cabinetId, session.cabinetId))
    .orderBy(desc(newsletterSends.createdAt))
    .limit(20);

  // Stats globales
  const [activeStats] = await db
    .select({ count: count() })
    .from(patientConsents)
    .where(
      and(
        eq(patientConsents.cabinetId, session.cabinetId),
        sql`${patientConsents.confirmedAt} IS NOT NULL`,
        sql`${patientConsents.unsubscribedAt} IS NULL`
      )
    );

  // Statistiques d'ouverture
  const enrichedHistory = await Promise.all(
    history.map(async (h) => {
      const [recipCount] = await db
        .select({ count: count() })
        .from(newsletterRecipients)
        .where(eq(newsletterRecipients.sendId, h.id));
      const [openedCount] = await db
        .select({ count: count() })
        .from(newsletterRecipients)
        .where(
          and(
            eq(newsletterRecipients.sendId, h.id),
            sql`${newsletterRecipients.openedAt} IS NOT NULL`
          )
        );
      const [clickedCount] = await db
        .select({ count: count() })
        .from(newsletterRecipients)
        .where(
          and(
            eq(newsletterRecipients.sendId, h.id),
            sql`${newsletterRecipients.clickedAt} IS NOT NULL`
          )
        );
      return {
        ...h,
        recipientCount: recipCount?.count ?? 0,
        openedCount: openedCount?.count ?? 0,
        clickedCount: clickedCount?.count ?? 0,
      };
    })
  );

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Newsletter</h1>
        <p className="text-sm text-muted-foreground">
          {activeStats?.count ?? 0} patient(s) actif(s) · Vous pouvez envoyer 1 a 2 newsletters par mois
        </p>
      </div>

      <NewsletterComposer
        cabinetId={session.cabinetId}
        practitionerId={session.practitionerId}
        cabinetName={cab?.name ?? ''}
        practitionerName={prac?.email?.split('@')[0] ?? ''}
        articles={validArticles.map((a) => ({
          slug: a.slug,
          title: a.title,
          excerpt: a.excerpt,
          category: a.category,
          categoryIds: articleToCategories.get(a.slug) ?? [],
        }))}
        categories={allCats.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          parentId: c.parentId,
          color: c.color,
        }))}
        templates={templates.map((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          description: t.description ?? '',
        }))}
      />

      <div>
        <h2 className="text-lg font-semibold">Historique des envois</h2>
        <div className="mt-3 rounded-lg border border-border bg-background">
          {enrichedHistory.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Aucun envoi pour le moment. Composez votre premiere newsletter ci-dessus.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Sujet</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Destinataires</th>
                  <th className="px-4 py-3">Ouvertures</th>
                  <th className="px-4 py-3">Clics</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {enrichedHistory.map((h) => (
                  <tr key={h.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{h.subject}</div>
                      <div className="text-xs text-muted-foreground">/articles/{h.articleSlug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={h.status} />
                    </td>
                    <td className="px-4 py-3">{h.recipientCount}</td>
                    <td className="px-4 py-3">
                      {h.recipientCount > 0
                        ? `${h.openedCount} (${Math.round((h.openedCount / h.recipientCount) * 100)}%)`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">{h.clickedCount}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {h.sentAt
                        ? new Date(h.sentAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    draft: { label: 'Brouillon', class: 'bg-slate-100 text-slate-700' },
    scheduled: { label: 'Planifié', class: 'bg-blue-100 text-blue-800' },
    sending: { label: 'Envoi...', class: 'bg-blue-100 text-blue-800' },
    sent: { label: 'Envoyé', class: 'bg-green-100 text-green-800' },
    cancelled: { label: 'Annulé', class: 'bg-red-100 text-red-800' },
  };
  const s = map[status] ?? { label: status, class: 'bg-slate-100' };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.class}`}>{s.label}</span>;
}
