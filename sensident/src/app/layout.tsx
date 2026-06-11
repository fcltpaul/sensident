import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Sensident — Prevention bucco-dentaire',
    template: '%s · Sensident',
  },
  description: 'Plateforme de prevention en hygiene bucco-dentaire. Service offert par votre dentiste.',
  robots: { index: false, follow: false },  // No index en dev, ajuste par env en prod
  manifest: '/manifest.json',
  themeColor: '#0F172A',
  openGraph: {
    title: 'Sensident — La prevention dentaire, en confiance',
    description: 'Service de prevention en hygiene bucco-dentaire, offert par votre dentiste. Heberge en France, sans IA.',
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
