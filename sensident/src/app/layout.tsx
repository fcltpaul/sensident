import type { Metadata } from 'next';
import './globals.css';

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
  themeColor: '#0F172A',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" href="/images/icon-192.png" />
        <link rel="apple-touch-icon" href="/images/icon-192.png" />
        <meta name="theme-color" content="#0F172A" />
        <meta property="og:image" content="/images/og-banner.png" />
      </head>
      <body>
        {children}
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
