'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface Props {
  cabinetName: string;
  practitionerName: string;
  cabinetSlug: string;
  publicUrl: string;
}

/**
 * Flyer imprimable A4 (210 × 297 mm).
 * Le QR code pointe vers publicUrl (sans token) : tous les patients qui
 * scannent obtiennent le même lien d'invitation du cabinet.
 *
 * Le rendu utilise Tailwind mais dimensionne en mm pour l'impression.
 * Le bouton 'Imprimer' ouvre la dialog du navigateur (print.css masque
 * les éléments non-flyer).
 */
export function Flyer({ cabinetName, practitionerName, cabinetSlug, publicUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, publicUrl, {
      width: 360,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    }).catch((err) => {
      setQrError(err?.message ?? 'Erreur QR');
    });
  }, [publicUrl]);

  return (
    <div className="mx-auto bg-white shadow-lg print:shadow-none" style={{ width: '210mm', minHeight: '297mm', padding: '18mm' }}>
      {/* En-tête cabinet */}
      <div className="mb-6 flex items-start justify-between border-b-2 border-slate-900 pb-4">
        <div>
          <p className="text-[10pt] font-medium uppercase tracking-widest text-slate-500">Cabinet dentaire</p>
          <h1 className="mt-1 text-[26pt] font-bold leading-tight text-slate-900">{cabinetName}</h1>
          <p className="mt-1 text-[11pt] text-slate-600">{practitionerName}</p>
        </div>
        <div className="text-right text-[9pt] text-slate-500">
          <p>Service offert</p>
          <p>par votre dentiste</p>
        </div>
      </div>

      {/* Accroche principale */}
      <div className="mb-6 text-center">
        <p className="text-[11pt] font-medium uppercase tracking-wider text-slate-500">Prévention dentaire</p>
        <h2 className="mt-1 text-[34pt] font-bold leading-tight text-slate-900">
          Recevez des conseils personnalisés
        </h2>
        <p className="mx-auto mt-3 max-w-[150mm] text-[12pt] leading-relaxed text-slate-700">
          Scannez le QR code ci-dessous avec votre téléphone pour accéder gratuitement à des articles
          de prévention adaptés à votre santé bucco-dentaire, recommandés par votre cabinet.
        </p>
      </div>

      {/* QR code */}
      <div className="my-6 flex flex-col items-center">
        {qrError ? (
          <div className="flex h-[45mm] w-[45mm] items-center justify-center border-2 border-dashed border-red-300 text-xs text-red-700">
            Erreur QR : {qrError}
          </div>
        ) : (
          <div className="rounded-lg border-2 border-slate-900 bg-white p-3 shadow-sm">
            <canvas
              ref={canvasRef}
              aria-label={`QR code vers ${publicUrl}`}
              style={{ display: 'block' }}
            />
          </div>
        )}
        <p className="mt-3 text-[9pt] uppercase tracking-widest text-slate-500">
          Scannez avec l&apos;appareil photo de votre téléphone
        </p>
      </div>

      {/* URL en clair (au cas où le scan ne marche pas) */}
      <div className="mb-6 rounded-md border border-slate-200 bg-slate-50 p-3 text-center">
        <p className="text-[9pt] font-medium uppercase tracking-widest text-slate-500">Ou saisissez ce lien</p>
        <p className="mt-1 font-mono text-[12pt] font-semibold text-slate-900">{publicUrl}</p>
      </div>

      {/* Mention "service offert" explicite */}
      <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 p-3">
        <p className="text-[10pt] font-semibold uppercase tracking-wide text-emerald-800">
          ✓ Service offert par votre cabinet
        </p>
        <p className="mt-1 text-[10pt] leading-relaxed text-emerald-900">
          Ce service vous est proposé gratuitement par votre dentiste. Vous recevrez 1 à 2 articles
          de prévention par mois. Vous pouvez vous désabonner à tout moment depuis chaque email.
        </p>
      </div>

      {/* Footer légal */}
      <div className="mt-auto border-t border-slate-200 pt-3 text-[8pt] leading-relaxed text-slate-500">
        <p>
          Les articles sont rédigés par des chirurgiens-dentistes et validés par un comité scientifique.
          Ils ne remplacent pas une consultation. Pour toute question sur votre santé bucco-dentaire,
          contactez votre chirurgien-dentiste.
        </p>
        <p className="mt-1">
          Vos données sont protégées (RGPD). Service édité par Sensident · {cabinetSlug}
        </p>
      </div>
    </div>
  );
}