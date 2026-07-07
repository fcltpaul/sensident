'use client';

import dynamic from 'next/dynamic';

// Wrapper Client Component qui charge le Flyer (Client Component) en lazy
// avec ssr: false. Necessaire car un Server Component ne peut pas utiliser
// dynamic() avec ssr: false directement (Next.js l'interdit, sinon crash SSR).
// Le placeholder est affiche pendant le chargement, puis le Flyer prend le
// relais au mount client (le QR est genere dans useEffect).
export const FlyerWrapper = dynamic(() => import('./flyer').then((m) => m.Flyer), {
  ssr: false,
  loading: () => (
    <div className="mx-auto flex h-[297mm] w-[210mm] items-center justify-center bg-white text-sm text-slate-500">
      Chargement du flyer...
    </div>
  ),
});