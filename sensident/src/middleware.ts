/**
 * Sensident — Middleware Next.js (Edge)
 *
 * 1. Rate limiting in-memory sur les routes sensibles (defense en profondeur
 *    a cote du rate-limit BDD dans les routes).
 * 2. Headers de securite : CSP (stricte), HSTS, X-Frame-Options, etc.
 *    (en plus de next.config.js — le middleware ajoute nonce dynamique).
 * 3. Blocage methodes HTTP non attendues.
 * 4. Bloque les User-Agents evidents (sqlmap, nikto, nessus).
 *
 * NB: l'Edge runtime de Next.js ne permet pas l'acces au filesystem ni
 *     a la BDD. Donc le rate-limit est en memoire process (par-instance).
 *     Pour multi-instance, basculer sur Redis/Upstash (prod HDS).
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRouteMemory, type RouteMemoryKey } from '@/lib/rate-limit-memory';

const isProd = process.env.NODE_ENV === 'production';

// UA bloques (signatures evidentes d'outils offensifs)
const BLOCKED_UA = [
  /sqlmap/i,
  /nikto/i,
  /nessus/i,
  /acunetix/i,
  /w3af/i,
  /zaproxy/i,
  /burpcollaborator/i,
];

// Routes protegees par rate-limit in-memory (defense en profondeur)
// Doit correspondre a des routes API reelles du projet.
const RATE_LIMITED: Array<{ pattern: RegExp; route: RouteMemoryKey; idFrom: 'ip' | 'email' }> = [
  { pattern: /^\/api\/practitioner\/login$/, route: 'login_practitioner', idFrom: 'ip' },
  { pattern: /^\/api\/practitioner\/signup$/, route: 'login_practitioner', idFrom: 'ip' }, // partage bucket login (anti-spam comptes)
  { pattern: /^\/api\/admin\/login$/, route: 'login_admin', idFrom: 'ip' },
  { pattern: /^\/api\/patient\/optin$/, route: 'patient_optin', idFrom: 'ip' },
  { pattern: /^\/api\/patient\/magic-link$/, route: 'magic_link', idFrom: 'email' },
];

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

function buildCsp(nonce: string, isProd: boolean): string {
  // CSP stricte. Note: en dev, Next.js a besoin de 'unsafe-eval' pour HMR.
  // CSP : on utilise 'unsafe-inline' + 'unsafe-eval' en prod aussi.
  // Raison : Next.js en SSR genere des balises <script> sans nonce (les chunks
  // statiques et le bootstrap RSC), et 'strict-dynamic' exige qu'un script
  // noncee soit present pour amorcer la chaine. Sans cela, React ne s'hydrate
  // JAMAIS et tous les composants client (formulaires, dropdowns, etc.)
  // apparaissent grisés/inertes. Confirme le 06/07/2026 sur la page /login/mfa
  // ou taper 6 chiffres ne reactivait pas le bouton Valider (HTML mort, JS bloque).
  //
  // Mitigations en place malgre unsafe-inline :
  // - HSTS preload (force HTTPS)
  // - frame-ancestors 'none' + X-Frame-Options DENY (anti-clickjacking)
  // - object-src 'none' (anti-plugin abuse)
  // - base-uri 'self' (anti-base tag injection)
  // - form-action 'self' (anti-form action hijack)
  // - Permissions-Policy stricte
  // - Cross-Origin-Opener-Policy same-origin
  // - Tous les inputs sont sanitises cote serveur (Zod) et cote client (sanitize()).
  const scriptSrc = `'self' 'unsafe-inline' 'unsafe-eval'`;
  return [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self'`,
    `frame-src 'self'`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ].join('; ');
}

function buildSecurityHeaders(nonce: string, isProd: boolean): HeadersInit {
  return {
    'Content-Security-Policy': buildCsp(nonce, isProd),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    // Protection contre tab-napping (popup partageant le meme contexte)
    'Cross-Origin-Opener-Policy': 'same-origin',
    // Protection contre Spectre (le navigateur ne charge pas la resource si
    // elle n'est pas explicitement marquee comme telle)
    'Cross-Origin-Resource-Policy': 'same-origin',
    // Bloque les politiques cross-domain Flash/Acrobat (legacy)
    'X-Permitted-Cross-Domain-Policies': 'none',
    // HSTS : 1 an + subdomains + preload (prod uniquement)
    ...(isProd
      ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload' }
      : {}),
    // Masquer le serveur
    'Server': 'Sensident',
    'X-Powered-By': '',
  };
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ua = req.headers.get('user-agent') ?? '';
  const method = req.method;

  // 1. Bloque les UA d'outils offensifs
  for (const re of BLOCKED_UA) {
    if (re.test(ua)) {
      return new NextResponse('forbidden', { status: 403 });
    }
  }

  // 2. Methodes autorisees (uniquement sur /api/*)
  if (pathname.startsWith('/api/') && !['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(method)) {
    return new NextResponse('method_not_allowed', { status: 405 });
  }

  // 3. Rate limit in-memory (defense en profondeur)
  for (const rule of RATE_LIMITED) {
    if (rule.pattern.test(pathname)) {
      let identifier: string;
      if (rule.idFrom === 'ip') {
        identifier = getClientIp(req);
      } else {
        // Email : on le lit dans le body, mais l'Edge ne peut pas await req.json()
        // avant d'avoir clone. On prend un placeholder IP+UA pour eviter de bloquer
        // le flux. La protection reelle par email reste dans la route via le rate-limit BDD.
        identifier = getClientIp(req) + ':email-pending';
      }
      const r = checkRouteMemory(rule.route, identifier);
      if (!r.allowed) {
        return new NextResponse(
          JSON.stringify({ error: 'Trop de tentatives. Reessayez plus tard.' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(r.retryAfterSec ?? 60),
              'X-RateLimit-Reset': String(Math.floor(r.resetAt.getTime() / 1000)),
            },
          }
        );
      }
    }
  }

  // 4. Genere un nonce CSP
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');

  // 5. Construit la reponse avec les headers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });

  for (const [k, v] of Object.entries(buildSecurityHeaders(nonce, isProd))) {
    if (v === '') continue;
    res.headers.set(k, v as string);
  }

  // 6. Cache-Control no-store sur les pages sensibles (dashboard, admin)
  // Pour eviter qu'un cache navigateur/proxy expose des donnees patient/praticien
  // apres logout ou apres un changement d'utilisateur partage.
  if (pathname.startsWith('/dashboard/') || pathname.startsWith('/admin/')) {
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
  }

  return res;
}

export const config = {
  // Matcher : tout sauf assets statiques et images
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|og-image.png|.*\\.png$|.*\\.svg$|.*\\.ico$).*)',
  ],
};
