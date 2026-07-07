/**
 * Sensident — type partage du branding newsletter.
 *
 * Miroir de la forme {logoUrl, accentColor, signature, showLogo} stockee dans
 * cabinets.newsletter_branding (jsonb Neon / text SQLite). Tire de schema.pg.ts.
 *
 * On garde le type partageable cote UI/API pour eviter la double definition.
 */
export interface NewsletterBranding {
  logoUrl?: string;
  accentColor?: string;
  signature?: string;
  showLogo?: boolean;
}

export const DEFAULT_BRANDING: NewsletterBranding = { showLogo: false };
