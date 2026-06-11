/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Force Next.js a NE PAS bundler 'postgres' et '@libsql/client'.
    // Sinon, le bundle webpack casse la serialization des Date
    // (Buffer.byteLength(Number) sur null params dans postgres-js).
    serverComponentsExternalPackages: ['postgres', '@libsql/client', 'drizzle-orm'],
  },
  // Les headers de securite (CSP, HSTS, X-Frame-Options, etc.) sont geres
  // par src/middleware.ts (single source of truth). On garde ici uniquement
  // les headers specifiques a des assets (manifest, service worker).
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
