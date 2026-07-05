import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { practitioners, cabinets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';

/**
 * GET /api/practitioner/me
 * Retourne les infos minimales du praticien connecté pour le header dashboard.
 * Endpoint client-side appelé au mount du header (1 fetch léger, pas dans layout).
 */
export async function GET() {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const rows = await db
    .select({
      practitionerName: practitioners.name,
      practitionerEmail: practitioners.email,
      cabinetName: cabinets.name,
      cabinetSlug: cabinets.slug,
    })
    .from(practitioners)
    .innerJoin(cabinets, eq(cabinets.id, practitioners.cabinetId))
    .where(eq(practitioners.id, session.practitionerId))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Praticien introuvable.' }, { status: 404 });
  }

  const r = rows[0];

  // Initiales dérivées du nom praticien, fallback cabinet name
  const sourceForInitials = (r.practitionerName && r.practitionerName.trim()) || r.cabinetName;
  const initials = sourceForInitials
    .split(/\s+/)
    .filter((s) => s.length > 0)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?';

  return NextResponse.json(
    {
      practitionerName: r.practitionerName || '',
      practitionerEmail: r.practitionerEmail,
      cabinetName: r.cabinetName,
      cabinetSlug: r.cabinetSlug,
      initials,
    },
    {
      headers: {
        // Cache court : évite de refetch à chaque navigation, mais reflète les MAJ nom.
        'Cache-Control': 'private, max-age=30',
      },
    }
  );
}
