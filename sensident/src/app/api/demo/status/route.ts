/**
 * Sensident — Status de la démo François
 *
 * Renvoie :
 *   - enabled : true si SENSIDENT_DEMO_MODE=1
 *   - cabinetSeeded : true si le cabinet démo est en BDD
 *   - articleCount : nombre d'articles validés
 *   - patientCount : nombre de patients dans le cabinet démo
 *   - newsletterCount : nombre de newsletters envoyées
 */
import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { cabinets, articles, patientConsents, newsletterSends } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

const DEMO_CABINET_SLUG = 'demo-francois-thibault';

export async function GET() {
  const enabled = process.env.SENSIDENT_DEMO_MODE === '1';
  if (!enabled) {
    return NextResponse.json({ enabled: false, cabinetSeeded: false });
  }

  const [cab] = await db
    .select()
    .from(cabinets)
    .where(eq(cabinets.slug, DEMO_CABINET_SLUG))
    .limit(1);

  if (!cab) {
    return NextResponse.json({
      enabled: true,
      cabinetSeeded: false,
      articleCount: 0,
      patientCount: 0,
      newsletterCount: 0,
    });
  }

  const articleCount = await db
    .select({ c: sql<number>`count(*)` })
    .from(articles)
    .where(eq(articles.status, 'validated'));

  const patientCount = await db
    .select({ c: sql<number>`count(*)` })
    .from(patientConsents)
    .where(eq(patientConsents.cabinetId, cab.id));

  const newsletterCount = await db
    .select({ c: sql<number>`count(*)` })
    .from(newsletterSends)
    .where(eq(newsletterSends.cabinetId, cab.id));

  return NextResponse.json({
    enabled: true,
    cabinetSeeded: true,
    cabinet: { id: cab.id, name: cab.name, slug: cab.slug },
    articleCount: Number(articleCount[0]?.c ?? 0),
    patientCount: Number(patientCount[0]?.c ?? 0),
    newsletterCount: Number(newsletterCount[0]?.c ?? 0),
  });
}
