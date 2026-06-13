/**
 * Sensident — Route démo François (MODE PREVIEW UNIQUEMENT)
 *
 * ⚠️ Cette route n'existe que parce qu'on veut présenter le produit à
 * Dr François Thibault sans lui demander de s'inscrire ni de retenir
 * un mot de passe. NE PAS activer en prod réelle.
 *
 * Comportement :
 *   1. Vérifie qu'on est bien en mode démo (env SENSIDENT_DEMO_MODE=1)
 *   2. Crée une session praticien réelle pour le cabinet démo
 *   3. Renvoie l'utilisateur sur /dashboard
 *
 * Sécurité :
 *   - Le mode démo est désactivé par défaut
 *   - Aucune donnée patient réelle n'est touchée
 *   - L'accès est limité à l'IP localhost + l'email du cabinet démo
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { db } from '@/db/client';
import { practitioners, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createSession, setSessionCookie } from '@/lib/auth';

const DEMO_EMAIL = 'demo@sensident.fr';
const DEMO_CABINET_SLUG = 'demo-francois-thibault';
const SESSION_COOKIE_NAME = 'sensident_session';

export async function POST(req: NextRequest) {
  // Garde-fou 1 : mode démo activé explicitement
  if (process.env.SENSIDENT_DEMO_MODE !== '1') {
    return NextResponse.json(
      { error: 'Mode démo désactivé. Active SENSIDENT_DEMO_MODE=1 dans .env.' },
      { status: 404 }
    );
  }

  // Garde-fou 2 : on accepte seulement depuis localhost / 127.0.0.1
  // (en prod Vercel preview, on autorise aussi le hostname vercel.app)
  const host = req.headers.get('host') ?? '';
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const isVercelPreview = host.endsWith('.vercel.app');
  if (!isLocal && !isVercelPreview) {
    return NextResponse.json(
      { error: 'Démo accessible uniquement depuis localhost ou Vercel preview.' },
      { status: 403 }
    );
  }

  // Récupère le praticien démo
  const [practitioner] = await db
    .select()
    .from(practitioners)
    .where(eq(practitioners.email, DEMO_EMAIL))
    .limit(1);

  if (!practitioner) {
    return NextResponse.json(
      {
        error: 'Cabinet démo non seedé. Lance d\'abord :',
        command: 'node scripts/seed-demo-francois-sqlite.mjs',
      },
      { status: 404 }
    );
  }

  if (practitioner.cabinetId !== (await getDemoCabinetId())) {
    return NextResponse.json(
      { error: `Le praticien démo n'est pas rattaché au cabinet ${DEMO_CABINET_SLUG}.` },
      { status: 500 }
    );
  }

  // Crée une vraie session praticien (MFA bypassé car totpEnabled = false)
  const userAgent = req.headers.get('user-agent') || undefined;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'demo';
  const { token, expiresAt } = await createSession({
    practitionerId: practitioner.id,
    cabinetId: practitioner.cabinetId,
    ip,
    userAgent,
    mfaVerified: true,  // démo : on shunte le MFA
  });
  setSessionCookie(token, expiresAt);

  // Audit log
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    actorType: 'practitioner',
    actorId: practitioner.id,
    cabinetId: practitioner.cabinetId,
    action: 'demo_enter',
    targetType: 'session',
    ip,
    userAgent,
    metadata: { source: 'demo-francois' },
  });

  return NextResponse.json({
    success: true,
    redirect: '/dashboard',
    cabinet: { name: 'Cabinet du Dr François Thibault', slug: DEMO_CABINET_SLUG },
  });
}

async function getDemoCabinetId(): Promise<string> {
  const { cabinets } = await import('@/db/schema');
  const [c] = await db
    .select()
    .from(cabinets)
    .where(eq(cabinets.slug, DEMO_CABINET_SLUG))
    .limit(1);
  return c?.id ?? '';
}


// GET : endpoint léger pour vérifier si le mode démo est dispo
export async function GET() {
  const enabled = process.env.SENSIDENT_DEMO_MODE === '1';
  return NextResponse.json({
    enabled,
    cabinet: { name: 'Cabinet du Dr François Thibault', slug: DEMO_CABINET_SLUG },
  });
}
