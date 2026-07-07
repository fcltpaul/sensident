import { NextRequest, NextResponse } from 'next/server';
import { db, DB_DIALECT, rawSqlClient } from '@/db/client';
import { cabinets } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';

/**
 * Sensident — /api/practitioner/newsletter-branding
 *
 * Put/Get du branding newsletter du cabinet :
 *   { logoUrl, accentColor, signature, showLogo }
 *
 * 2026-07-07 (Tartrinator) — refactor Neon-safe + URL validation :
 *   - On passe en raw SQL Neon (cast jsonb + ::text cabinet_id), comme dans
 *     /api/practitioner/contact et engagement Neon helpers.
 *   - SQLite garde le chemin Drizzle inchangé.
 *   - Validation stricte de logoUrl : on accepte uniquement http(s):// pour
 *     eviter qu'un praticien colle un `javascript:` ou autre.
 *   - accentColor : on accepte uniquement un hex 6 chars (#RRGGBB).
 */

function sanitizeLogoUrl(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const trimmed = input.trim();
  if (trimmed.length === 0) return undefined;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined;
    // Rejette les URLs locales / privees (anti exfiltration future)
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host === '0.0.0.0' || host.startsWith('127.') || host === '::1') {
      return undefined;
    }
    return u.toString();
  } catch {
    return undefined;
  }
}

function sanitizeAccentColor(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const trimmed = input.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) return undefined;
  return trimmed.toUpperCase();
}

function sanitizeSignature(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const trimmed = input.trim().slice(0, 120);
  return trimmed.length === 0 ? undefined : trimmed;
}

export async function PUT(request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non authorise' }, { status: 401 });
  }

  const body = await request.json();
  const safeLogoUrl = sanitizeLogoUrl(body.logoUrl);
  const safeAccent = sanitizeAccentColor(body.accentColor);
  const safeSignature = sanitizeSignature(body.signature);
  const showLogo = Boolean(body.showLogo);

  const branding = {
    logoUrl: safeLogoUrl,
    accentColor: safeAccent,
    signature: safeSignature,
    showLogo,
  };

  if (DB_DIALECT === 'postgresql') {
    await rawSqlClient`
      UPDATE cabinets
      SET
        newsletter_branding = ${JSON.stringify(branding)}::jsonb,
        updated_at = NOW()
      WHERE id::text = ${session.cabinetId}::text
    `;
  } else {
    await db
      .update(cabinets)
      .set({
        newsletterBranding: branding,
        updatedAt: new Date(),
      })
      .where(eq(cabinets.id, session.cabinetId));
  }

  return NextResponse.json({ ok: true, branding });
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non authorise' }, { status: 401 });
  }

  let branding: unknown = { showLogo: false };
  if (DB_DIALECT === 'postgresql') {
    const rows = await rawSqlClient<Array<{ newsletter_branding: unknown }>>`
      SELECT newsletter_branding FROM cabinets
      WHERE id::text = ${session.cabinetId}::text LIMIT 1
    `;
    branding = rows[0]?.newsletter_branding ?? { showLogo: false };
  } else {
    const cab = await db
      .select({ newsletterBranding: cabinets.newsletterBranding })
      .from(cabinets)
      .where(eq(cabinets.id, session.cabinetId))
      .limit(1);
    branding = cab[0]?.newsletterBranding ?? { showLogo: false };
  }

  return NextResponse.json(branding);
}
