/**
 * Sensident — Templates email newsletter (5 looks P2)
 *
 * Pour le MVP, on genere du HTML inline simple (pas React Email, pas de deps).
 * Chaque template respecte le wording anti-comperage :
 * - Pas de photo du dentiste
 * - Pas de logo cabinet en avant
 * - Wording "Service de prevention offert par le Dr X"
 * - Pas d'incitation RDV
 */

interface Article {
  slug: string;
  title: string;
  excerpt: string;
  bodyMd: string;
  slidesJson: Array<{ title: string; body: string; visual?: string; takeaway?: string }>;
}

interface Cabinet {
  name: string;
  slug?: string;
}

interface Practitioner {
  displayName: string;
}

interface Branding {
  logoUrl?: string;
  accentColor?: string;
  signature?: string;
  showLogo?: boolean;
}

interface RenderParams {
  templateCode: string;
  article: Article;
  cabinet: Cabinet;
  practitioner: Practitioner;
  customMessage?: string;
  articleUrl?: string;
  unsubscribeUrl?: string;
  libraryUrl?: string;
  branding?: Branding;
  trackingPixelUrl?: string;
}

const DEFAULT_ARTICLE_URL = '#';
const DEFAULT_UNSUB_URL = '#';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function baseStyles(extra: string) {
  return `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 0; background: #f8fafc; }
      .container { max-width: 600px; margin: 0 auto; padding: 24px; }
      .article { background: white; border-radius: 12px; padding: 32px 24px; margin: 16px 0; }
      .cta { display: inline-block; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }
      .footer { text-align: center; padding: 16px; font-size: 12px; color: #94a3b8; }
      .footer a { color: #94a3b8; text-decoration: underline; }
      ${extra}
    </style>
  `;
}

// ============================================
// Moderne : bleu nuit, lignes épurées
// ============================================
function moderne(p: RenderParams): string {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
${baseStyles(`
  .container { background: #0f172a; color: #f1f5f9; }
  .header { color: #38bdf8; }
  .article { background: #1e293b; color: #f1f5f9; }
  .cta { background: #38bdf8; color: #0f172a; }
  .slide { background: #334155; padding: 20px; border-radius: 8px; margin: 16px 0; }
  .takeaway { background: #38bdf8; color: #0f172a; padding: 12px; border-radius: 6px; font-weight: 600; }
`)}
</head>
<body>
  <div class="container">
    <div class="header" style="padding: 16px 0;">
      <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.7;">Service de prévention offert par</p>
      <h1 style="font-size: 18px; margin: 4px 0 0 0; font-weight: 700;">${escapeHtml(p.cabinet.name)}</h1>
    </div>

    ${p.customMessage ? `<div style="background: #334155; padding: 16px; border-radius: 8px; margin: 16px 0; font-style: italic;">${escapeHtml(p.customMessage)}</div>` : ''}

    <div class="article">
      <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.6;">${escapeHtml(p.article.slidesJson[0]?.title ?? 'Prévention')}</p>
      <h2 style="font-size: 24px; margin: 8px 0; line-height: 1.2;">${escapeHtml(p.article.title)}</h2>
      <p style="opacity: 0.85; line-height: 1.6;">${escapeHtml(p.article.excerpt)}</p>

      ${p.article.slidesJson.slice(0, 3).map((s, i) => `
        <div class="slide">
          <h3 style="margin: 0 0 8px 0; font-size: 16px;">${i + 1}. ${escapeHtml(s.title)}</h3>
          <p style="margin: 0 0 12px 0; opacity: 0.85; line-height: 1.5;">${escapeHtml(s.body)}</p>
          ${s.takeaway ? `<div class="takeaway">💡 ${escapeHtml(s.takeaway)}</div>` : ''}
        </div>
      `).join('')}

      <a href="${p.articleUrl ?? DEFAULT_ARTICLE_URL}" class="cta">Lire l'article complet →</a>
    </div>

    <div class="footer">
      <p>${escapeHtml(p.cabinet.name)} vous accompagne dans votre prévention bucco-dentaire.</p>
      ${p.libraryUrl ? `<p style="margin-top: 8px;"><a href="${escapeHtml(p.libraryUrl)}">Voir tous mes articles de prévention →</a></p>` : ''}
      <p style="margin-top: 12px;">
        <a href="${p.unsubscribeUrl ?? DEFAULT_UNSUB_URL}">Se désabonner</a>
      </p>
      ${p.branding?.signature ? `<p style="margin-top: 8px; font-style: italic;">${escapeHtml(p.branding.signature)}</p>` : ''}
      <p style="margin-top: 8px;">Service offert par ${escapeHtml(p.cabinet.name)} · Hébergé en France · Données confidentielles</p>
    </div>
  </div>
</body>
</html>
  `;
}

// ============================================
// Chaleureux : couleurs douces, typo serif
// ============================================
function chaleureux(p: RenderParams): string {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
${baseStyles(`
  body { background: #fef3e8; }
  .container { background: #fef3e8; color: #422006; }
  .header h1 { font-family: Georgia, 'Times New Roman', serif; color: #b45309; }
  .article { background: #fff7ed; color: #422006; border: 1px solid #fed7aa; }
  .cta { background: #b45309; color: #fff7ed; }
  .slide { background: #ffedd5; padding: 20px; border-radius: 12px; margin: 16px 0; border-left: 4px solid #b45309; }
  .takeaway { background: #b45309; color: #fff7ed; padding: 12px; border-radius: 8px; font-style: italic; }
`)}
</head>
<body>
  <div class="container">
    <div class="header" style="padding: 16px 0; text-align: center;">
      <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #b45309;">Service de prévention</p>
      <h1 style="font-size: 22px; margin: 4px 0 0 0; font-weight: 400;">${escapeHtml(p.cabinet.name)}</h1>
    </div>

    ${p.customMessage ? `<div style="background: #ffedd5; padding: 16px; border-radius: 12px; margin: 16px 0; text-align: center; font-family: Georgia, serif; font-style: italic;">${escapeHtml(p.customMessage)}</div>` : ''}

    <div class="article">
      <h2 style="font-size: 22px; margin: 0 0 12px 0; line-height: 1.3; font-family: Georgia, serif;">${escapeHtml(p.article.title)}</h2>
      <p style="line-height: 1.7; font-size: 15px;">${escapeHtml(p.article.excerpt)}</p>

      ${p.article.slidesJson.slice(0, 3).map((s, i) => `
        <div class="slide">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-family: Georgia, serif;">${i + 1}. ${escapeHtml(s.title)}</h3>
          <p style="margin: 0 0 12px 0; line-height: 1.6;">${escapeHtml(s.body)}</p>
          ${s.takeaway ? `<div class="takeaway">💡 ${escapeHtml(s.takeaway)}</div>` : ''}
        </div>
      `).join('')}

      <div style="text-align: center;">
        <a href="${p.articleUrl ?? DEFAULT_ARTICLE_URL}" class="cta">Découvrir la suite</a>
      </div>
    </div>

    <div class="footer">
      <p>${escapeHtml(p.cabinet.name)} prend soin de votre santé bucco-dentaire.</p>
      ${p.libraryUrl ? `<p style="margin-top: 8px;"><a href="${escapeHtml(p.libraryUrl)}">Voir tous mes articles de prévention →</a></p>` : ''}
      <p style="margin-top: 12px;"><a href="${p.unsubscribeUrl ?? DEFAULT_UNSUB_URL}">Se désabonner</a></p>
      ${p.branding?.signature ? `<p style="margin-top: 8px; font-style: italic;">${escapeHtml(p.branding.signature)}</p>` : ''}
    </div>
  </div>
</body>
</html>
  `;
}

// ============================================
// Classique : noir/blanc, sobre
// ============================================
function classique(p: RenderParams): string {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
${baseStyles(`
  body { background: #ffffff; }
  .container { background: #ffffff; color: #18181b; }
  .header { border-bottom: 2px solid #18181b; }
  .article { background: #fafafa; border: 1px solid #e4e4e7; }
  .cta { background: #18181b; color: #ffffff; }
  .slide { background: white; padding: 20px; border: 1px solid #e4e4e7; margin: 16px 0; }
  .takeaway { background: #18181b; color: white; padding: 12px; }
`)}
</head>
<body>
  <div class="container">
    <div class="header" style="padding: 16px 0;">
      <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em;">Prévention bucco-dentaire</p>
      <h1 style="font-size: 20px; margin: 4px 0 0 0; font-weight: 700; font-family: Georgia, serif;">${escapeHtml(p.cabinet.name)}</h1>
    </div>

    ${p.customMessage ? `<p style="font-style: italic; padding: 12px; border-left: 3px solid #18181b; margin: 16px 0;">${escapeHtml(p.customMessage)}</p>` : ''}

    <div class="article">
      <h2 style="font-size: 24px; margin: 0 0 12px 0; line-height: 1.2; font-family: Georgia, serif;">${escapeHtml(p.article.title)}</h2>
      <p style="line-height: 1.7;">${escapeHtml(p.article.excerpt)}</p>

      ${p.article.slidesJson.slice(0, 3).map((s, i) => `
        <div class="slide">
          <h3 style="margin: 0 0 8px 0; font-size: 16px;">${i + 1}. ${escapeHtml(s.title)}</h3>
          <p style="margin: 0 0 12px 0; line-height: 1.6;">${escapeHtml(s.body)}</p>
          ${s.takeaway ? `<div class="takeaway">${escapeHtml(s.takeaway)}</div>` : ''}
        </div>
      `).join('')}

      <a href="${p.articleUrl ?? DEFAULT_ARTICLE_URL}" class="cta">Lire la suite</a>
    </div>

    <div class="footer">
      <p>${escapeHtml(p.cabinet.name)}</p>
      ${p.libraryUrl ? `<p style="margin-top: 8px;"><a href="${escapeHtml(p.libraryUrl)}">Voir tous mes articles de prévention →</a></p>` : ''}
      <p style="margin-top: 8px;"><a href="${p.unsubscribeUrl ?? DEFAULT_UNSUB_URL}">Désabonnement</a></p>
      ${p.branding?.signature ? `<p style="margin-top: 8px; font-style: italic;">${escapeHtml(p.branding.signature)}</p>` : ''}
    </div>
  </div>
</body>
</html>
  `;
}

// ============================================
// Épuré : minimaliste, beaucoup de blanc
// ============================================
function epure(p: RenderParams): string {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
${baseStyles(`
  body { background: #fafafa; }
  .container { max-width: 540px; background: white; padding: 48px 32px; }
  .header { padding-bottom: 24px; border-bottom: 1px solid #f1f5f9; }
  .article { padding: 32px 0; }
  .cta { color: #0f172a; text-decoration: underline; font-weight: 500; }
  .slide { padding: 24px 0; border-top: 1px solid #f1f5f9; }
  .takeaway { color: #0f172a; font-weight: 500; padding: 8px 0; }
`)}
</head>
<body>
  <div class="container">
    <div class="header">
      <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">Prévention · ${escapeHtml(p.cabinet.name)}</p>
    </div>

    ${p.customMessage ? `<p style="font-size: 16px; line-height: 1.6; margin: 24px 0; color: #475569;">${escapeHtml(p.customMessage)}</p>` : ''}

    <div class="article">
      <h2 style="font-size: 28px; font-weight: 300; line-height: 1.2; margin: 0 0 24px 0;">${escapeHtml(p.article.title)}</h2>
      <p style="font-size: 16px; line-height: 1.7; color: #475569; margin: 0 0 32px 0;">${escapeHtml(p.article.excerpt)}</p>

      ${p.article.slidesJson.slice(0, 3).map((s, i) => `
        <div class="slide">
          <h3 style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px 0;">${i + 1}</h3>
          <h4 style="font-size: 20px; font-weight: 500; line-height: 1.3; margin: 0 0 12px 0;">${escapeHtml(s.title)}</h4>
          <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 12px 0;">${escapeHtml(s.body)}</p>
          ${s.takeaway ? `<div class="takeaway">${escapeHtml(s.takeaway)}</div>` : ''}
        </div>
      `).join('')}

      <p style="margin: 32px 0;">
        <a href="${p.articleUrl ?? DEFAULT_ARTICLE_URL}" class="cta">Continuer la lecture →</a>
      </p>
    </div>

    <div class="footer">
      <p style="color: #94a3b8; font-size: 11px;">${escapeHtml(p.cabinet.name)}</p>
      ${p.libraryUrl ? `<p style="margin-top: 8px;"><a href="${escapeHtml(p.libraryUrl)}" style="color: #0f172a;">Voir tous mes articles de prévention →</a></p>` : ''}
      <p style="margin-top: 8px;"><a href="${p.unsubscribeUrl ?? DEFAULT_UNSUB_URL}">Se désabonner</a></p>
      ${p.branding?.signature ? `<p style="margin-top: 8px; font-style: italic; color: #94a3b8;">${escapeHtml(p.branding.signature)}</p>` : ''}
    </div>
  </div>
</body>
</html>
  `;
}

// ============================================
// Premium : dorures, élégant
// ============================================
function premium(p: RenderParams): string {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
${baseStyles(`
  body { background: #0c0a09; }
  .container { background: #0c0a09; color: #fafaf9; max-width: 600px; padding: 40px 24px; }
  .header { text-align: center; padding-bottom: 32px; border-bottom: 1px solid #44403c; }
  .article { background: #1c1917; padding: 40px 32px; border: 1px solid #44403c; }
  .cta { background: #fafaf9; color: #0c0a09; padding: 14px 32px; }
  .slide { background: #292524; padding: 24px; margin: 16px 0; border: 1px solid #44403c; }
  .takeaway { background: #fafaf9; color: #0c0a09; padding: 12px; font-style: italic; }
  .accent { color: #d4af37; }
`)}
</head>
<body>
  <div class="container">
    <div class="header">
      <p class="accent" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.3em; margin: 0;">— Service de prévention —</p>
      <h1 style="font-size: 20px; font-family: Georgia, serif; font-weight: 400; margin: 12px 0 0 0; color: #fafaf9;">${escapeHtml(p.cabinet.name)}</h1>
    </div>

    ${p.customMessage ? `<p style="font-family: Georgia, serif; font-style: italic; text-align: center; margin: 32px 0; color: #d6d3d1;">${escapeHtml(p.customMessage)}</p>` : ''}

    <div class="article">
      <h2 style="font-size: 26px; font-family: Georgia, serif; font-weight: 400; line-height: 1.3; margin: 0 0 16px 0; color: #fafaf9;">${escapeHtml(p.article.title)}</h2>
      <p style="line-height: 1.7; color: #d6d3d1; font-size: 15px; margin: 0 0 32px 0;">${escapeHtml(p.article.excerpt)}</p>

      ${p.article.slidesJson.slice(0, 3).map((s, i) => `
        <div class="slide">
          <h3 style="font-family: Georgia, serif; font-size: 17px; margin: 0 0 12px 0; color: #fafaf9;">${i + 1}. ${escapeHtml(s.title)}</h3>
          <p style="line-height: 1.6; color: #d6d3d1; margin: 0 0 12px 0;">${escapeHtml(s.body)}</p>
          ${s.takeaway ? `<div class="takeaway">${escapeHtml(s.takeaway)}</div>` : ''}
        </div>
      `).join('')}

      <div style="text-align: center; margin-top: 32px;">
        <a href="${p.articleUrl ?? DEFAULT_ARTICLE_URL}" class="cta">Lire l'intégralité</a>
      </div>
    </div>

    <div class="footer">
      <p style="color: #a8a29e; font-size: 12px; font-family: Georgia, serif; font-style: italic;">${escapeHtml(p.cabinet.name)} — Excellence en prévention dentaire</p>
      ${p.libraryUrl ? `<p style="margin-top: 8px;"><a href="${escapeHtml(p.libraryUrl)}" style="color: #a8a29e; font-size: 12px;">Voir tous mes articles de prévention →</a></p>` : ''}
      <p style="margin-top: 12px;"><a href="${p.unsubscribeUrl ?? DEFAULT_UNSUB_URL}" style="color: #a8a29e;">Désabonnement</a></p>
      ${p.branding?.signature ? `<p style="margin-top: 8px; font-style: italic; color: #a8a29e; font-size: 11px;">${escapeHtml(p.branding.signature)}</p>` : ''}
    </div>
  </div>
</body>
</html>
  `;
}

// ============================================
// Render router
// ============================================
export function renderTemplate(p: RenderParams): string {
  let html: string;
  switch (p.templateCode) {
    case 'moderne': html = moderne(p); break;
    case 'chaleureux': html = chaleureux(p); break;
    case 'classique': html = classique(p); break;
    case 'epure': html = epure(p); break;
    case 'premium': html = premium(p); break;
    default: html = moderne(p); break;
  }

  // Injecter le pixel de tracking d'ouverture juste avant </body>
  // Pas de tracking tiers (pas de Brevo, pas de Google Analytics)
  if (p.trackingPixelUrl) {
    html = html.replace(
      '</body>',
      `<img src="${p.trackingPixelUrl}" width="1" height="1" alt="" style="display:none" /></body>`
    );
  }

  return html;
}

export function generateSubject(p: { templateCode: string; articleTitle: string; cabinetName: string }): string {
  const base = `Prévention bucco-dentaire : ${p.articleTitle}`;
  return `${base} — ${p.cabinetName}`;
}
