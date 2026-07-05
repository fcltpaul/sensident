import type { Metadata, Viewport } from 'next';
import './globals.css';
import { TrustBar } from '@/components/trust-bar';
import { SkipLink } from '@/components/skip-link';

export const metadata: Metadata = {
  title: {
    default: 'Sensident — Prevention bucco-dentaire',
    template: '%s · Sensident',
  },
  description: 'Plateforme de prévention bucco-dentaire pour cabinets dentaires. Articles validés scientifiquement, newsletters personnalisables, dashboard analytics. Hébergé en France, sans IA, conforme HDS et RGPD.',
  robots: {
    index: process.env.NODE_ENV === 'production',
    follow: process.env.NODE_ENV === 'production',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'Sensident — La prévention dentaire, en confiance',
    description: 'Plateforme de prévention bucco-dentaire pour dentistes et leurs patients. Articles validés scientifiquement, newsletters personnalisables, dashboard analytics. Hébergé en France, sans IA, conforme HDS et RGPD.',
    images: ['/images/og-banner.png'],
    locale: 'fr_FR',
    type: 'website',
  },
  icons: {
    icon: '/images/icon-192.png',
    apple: '/images/icon-192.png',
  },
};

// themeColor doit maintenant être dans viewport (Next 14.2+)
export const viewport: Viewport = {
  themeColor: '#0F172A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" href="/images/icon-192.png" />
        <link rel="apple-touch-icon" href="/images/icon-192.png" />
        <meta property="og:image" content="/images/og-banner.png" />
      </head>
      <body>
        <SkipLink />
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
        <footer className="border-t border-border bg-muted/10 px-4 py-5">
          <div className="mx-auto max-w-5xl space-y-3">
            <TrustBar variant="default" />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <p>© 2026 Sensident · Données hébergées en France</p>
              <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <a href="/pour-dentistes" className="hover:text-foreground transition">Praticiens</a>
                <a href="/pour-patients" className="hover:text-foreground transition">Patients</a>
                <a href="/faq" className="hover:text-foreground transition">FAQ</a>
                <a href="/securite" className="hover:text-foreground transition">Sécurité</a>
                <a href="/mentions-legales" className="hover:text-foreground transition">Mentions légales</a>
                <a href="/politique-confidentialite" className="hover:text-foreground transition">Confidentialité</a>
              </nav>
            </div>
          </div>
        </footer>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
