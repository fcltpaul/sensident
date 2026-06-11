import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

/**
 * Sensident — Composant Logo
 *
 * Affiche le logo officiel (fourni par le client via banana/Google).
 * Le PNG est fourni avec un fond adapte (clair ou sombre).
 *
 * Note: pour le MVP, on utilise uniquement le logo colore (fond blanc).
 * Le logo blanc sur fond transparent est reserve pour le mode sombre futur.
 */
export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizeMap = {
    sm: { px: 24, text: 'text-sm' },
    md: { px: 32, text: 'text-base' },
    lg: { px: 48, text: 'text-lg' },
    xl: { px: 64, text: 'text-xl' },
  };
  const cfg = sizeMap[size];

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Image
        src="/images/logo-sensident.png"
        alt="Sensident"
        width={cfg.px}
        height={cfg.px}
        className="h-auto w-auto"
        priority
      />
      {showText && (
        <span className={`font-bold tracking-tight ${cfg.text}`}>
          Sensident
        </span>
      )}
    </span>
  );
}
