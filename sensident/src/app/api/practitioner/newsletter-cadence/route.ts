import { NextRequest, NextResponse } from 'next/server';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { cabinets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';

/**
 * Sensident — /api/practitioner/newsletter-cadence
 *
 * 2026-07-07 (Tartrinator) — ajout preference praticien :
 *   { frequency: 'weekly' | 'biweekly' | 'monthly',
 *     sendDay: 0..6 (hebdo) ou 1..28 (mensuel),
 *     sendHour: 0..23 }
 *
 * Sert à :
 *   1. proposer dans le composer 3 boutons "prochaine occurrence / suivante / encore après"
 *      bases sur la cadence
 *   2. decaler automatiquement les newsletters deja programmees en cas de
 *      collision de date (PUT dedie)
 *   3. alimenter un futur cron d'envoi automatique (hors scope cette livraison)
 *
 * Valeurs acceptees :
 *   - frequency ∈ { 'weekly', 'biweekly', 'monthly' }
 *   - sendDay (hebdo/biweekly) : 0 = dim, 1 = lun, ..., 6 = sam
 *   - sendDay (monthly) : 1..28 (le 29+ est refuse pour eviter le 30 fev etc.)
 *   - sendHour : 0..23
 *
 * Stockage : colonne jsonb `newsletter_cadence` sur cabinets. NULL = pas configure.
 */

const FREQ = ['weekly', 'biweekly', 'monthly'] as const;
type Frequency = (typeof FREQ)[number];

function sanitizeCadence(input: unknown): { ok: true; value: { frequency: Frequency; sendDay: number; sendHour: number } } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Donnees invalides.' };
  }
  const obj = input as Record<string, unknown>;

  const frequency = obj.frequency;
  if (typeof frequency !== 'string' || !FREQ.includes(frequency as Frequency)) {
    return { ok: false, error: 'Frequence invalide (weekly, biweekly, monthly).' };
  }

  const sdRaw = obj.sendDay;
  const sdNum = typeof sdRaw === 'number' ? sdRaw : typeof sdRaw === 'string' ? parseInt(sdRaw, 10) : NaN;
  if (!Number.isFinite(sdNum) || !Number.isInteger(sdNum)) {
    return { ok: false, error: 'sendDay doit etre un entier.' };
  }
  if (frequency === 'monthly') {
    if (sdNum < 1 || sdNum > 28) {
      return { ok: false, error: 'sendDay pour mensuel doit etre entre 1 et 28.' };
    }
  } else {
    if (sdNum < 0 || sdNum > 6) {
      return { ok: false, error: 'sendDay pour hebdo/biweekly doit etre entre 0 (dim) et 6 (sam).' };
    }
  }

  const shRaw = obj.sendHour;
  const shNum = typeof shRaw === 'number' ? shRaw : typeof shRaw === 'string' ? parseInt(shRaw, 10) : NaN;
  if (!Number.isFinite(shNum) || !Number.isInteger(shNum) || shNum < 0 || shNum > 23) {
    return { ok: false, error: 'sendHour doit etre entre 0 et 23.' };
  }

  return { ok: true, value: { frequency: frequency as Frequency, sendDay: sdNum, sendHour: shNum } };
}

export async function PUT(request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non authorise' }, { status: 401 });
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }); }

  const sanitized = sanitizeCadence(body);
  if (!sanitized.ok) {
    return NextResponse.json({ error: sanitized.error }, { status: 400 });
  }

  const { value } = sanitized;
  const json = JSON.stringify(value);

  if (DB_DIALECT === 'postgresql') {
    await rawSqlClient`
      UPDATE cabinets
      SET
        newsletter_cadence = ${json}::jsonb,
        updated_at = NOW()
      WHERE id::text = ${session.cabinetId}::text
    `;
  } else {
    await db
      .update(cabinets)
      .set({
        newsletterCadence: json, // string -> SQLite text column
        updatedAt: new Date(),
      })
      .where(eq(cabinets.id, session.cabinetId));
  }

  return NextResponse.json({ ok: true, cadence: value });
}

export async function DELETE(request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non authorise' }, { status: 401 });
  }

  if (DB_DIALECT === 'postgresql') {
    await rawSqlClient`
      UPDATE cabinets
      SET
        newsletter_cadence = NULL,
        updated_at = NOW()
      WHERE id::text = ${session.cabinetId}::text
    `;
  } else {
    await db
      .update(cabinets)
      .set({ newsletterCadence: null as any, updatedAt: new Date() })
      .where(eq(cabinets.id, session.cabinetId));
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non authorise' }, { status: 401 });
  }

  let cadence: { frequency: Frequency; sendDay: number; sendHour: number } | null = null;
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<Array<{ newsletter_cadence: unknown }>>`
      SELECT newsletter_cadence FROM cabinets
      WHERE id::text = ${session.cabinetId}::text LIMIT 1
    `;
    const raw = rows[0]?.newsletter_cadence;
    if (raw && typeof raw === 'object') {
      const sanitized = sanitizeCadence(raw);
      cadence = sanitized.ok ? sanitized.value : null;
    }
  } else {
    const cab = await db
      .select({ newsletterCadence: cabinets.newsletterCadence })
      .from(cabinets)
      .where(eq(cabinets.id, session.cabinetId))
      .limit(1);
    const raw = cab[0]?.newsletterCadence;
    if (typeof raw === 'string' && raw.trim().length > 0) {
      try {
        const parsed = JSON.parse(raw);
        const sanitized = sanitizeCadence(parsed);
        cadence = sanitized.ok ? sanitized.value : null;
      } catch { /* silencieux */ }
    }
  }

  return NextResponse.json({ cadence });
}
