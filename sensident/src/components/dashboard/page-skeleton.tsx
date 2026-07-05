/**
 * Skeleton générique pour les pages dashboard à chargement SSR long
 * (analytics, engagement, etc.).
 */
export function PageSkeleton({
  rows = 4,
  showHero = true,
}: {
  rows?: number;
  showHero?: boolean;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-8" aria-busy={true} aria-live="polite">
      {showHero && (
        <div className="space-y-2">
          <div className="h-6 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}