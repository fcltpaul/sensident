import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { cabinets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromCookie } from '@/lib/auth';

/**
 * PUT /api/practitioner/newsletter-branding
 * Update the newsletter branding settings for the cabinet
 */
export async function PUT(request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non authorise' }, { status: 401 });
  }

  const body = await request.json();
  const { logoUrl, accentColor, signature, showLogo } = body;

  await db
    .update(cabinets)
    .set({
      newsletterBranding: {
        logoUrl: logoUrl || undefined,
        accentColor: accentColor || undefined,
        signature: signature || undefined,
        showLogo: showLogo || false,
      },
      updatedAt: new Date(),
    })
    .where(eq(cabinets.id, session.cabinetId));

  return NextResponse.json({ ok: true });
}

/**
 * GET /api/practitioner/newsletter-branding
 * Get the current branding settings
 */
export async function GET(request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session || !session.mfaVerified) {
    return NextResponse.json({ error: 'Non authorise' }, { status: 401 });
  }

  const cab = await db
    .select({ newsletterBranding: cabinets.newsletterBranding })
    .from(cabinets)
    .where(eq(cabinets.id, session.cabinetId))
    .limit(1);

  if (!cab[0]) {
    return NextResponse.json({ error: 'Cabinet introuvable' }, { status: 404 });
  }

  return NextResponse.json(cab[0].newsletterBranding || { showLogo: false });
}
