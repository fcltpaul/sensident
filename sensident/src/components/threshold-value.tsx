'use client';

interface ThresholdValueProps {
  value: number | null | undefined;
  threshold?: number;
  format?: (v: number) => string;
  /** Suffixe optionnel quand la valeur est affichée */
  suffix?: string;
  /** Classes CSS pour le wrapper */
  className?: string;
}

/**
 * Affiche une valeur si elle atteint un seuil minimum d'individus uniques,
 * sinon affiche un tiret avec un tooltip RGPD.
 *
 * Seuil par défaut : 5 (conforme AIPD R4 — pas de déduction individuelle).
 */
export function ThresholdValue({
  value,
  threshold = 5,
  format,
  suffix = '',
  className,
}: ThresholdValueProps) {
  if (value == null || value < threshold) {
    return (
      <span
        className={className}
        aria-label={`Données masquées (moins de ${threshold} patients)`}
        title={`Données masquées (moins de ${threshold} patients)`}
        tabIndex={0}
      >
        &mdash;
      </span>
    );
  }

  const formatted = format ? format(value) : String(value);
  return (
    <span className={className}>
      {formatted}
      {suffix}
    </span>
  );
}
