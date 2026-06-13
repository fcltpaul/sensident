/**
 * Sensident — Route démo admin (MODE PREVIEW UNIQUEMENT)
 *
 * Crée une session admin démo pour la démo François (côté équipe Sensident).
 * Le cookie de session admin est nommé `sensident_admin_session` (séparé).
 *
 * Bypass : pas de password, pas de MFA (l'admin démo a MFA désactivé).
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { admins } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createAdminSession, setAdminCookie } from '@/lib/admin-auth';

const DEMO_ADMIN_EMAIL = 'admin@sensident.fr';

export async function POST(req: NextRequest) {
  if (process.env.SENSIDENT_DEMO_MODE !== '1') {
    return NextResponse.json({ error: 'Mode démo désactivé.' }, { status: 404 });
  }

  const host = req.headers.get('host') ?? '';
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const isVercelPreview = host.endsWith('.vercel.app');
  if (!isLocal && !isVercelPreview) {
    return NextResponse.json(
      { error: 'Démo accessible uniquement depuis localhost ou Vercel preview.' },
      { status: 403 }
    );
  }

  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.email, DEMO_ADMIN_EMAIL))
    .limit(1);

  if (!admin) {
    return NextResponse.json(
      { error: 'Admin démo non seedé. Lance : node scripts/seed-admin-demo-neon.mjs' },
      { status: 404 }
    );
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'demo';
  const userAgent = req.headers.get('user-agent') || undefined;
  const { token, expiresAt } = await createAdminSession({
    adminId: admin.id,
    ip,
    userAgent,
    mfaVerified: true,  // démo : MFA bypassé
  });
  setAdminCookie(token, expiresAt);

  return NextResponse.json({
    success: true,
    redirect: '/admin',
  });
}
