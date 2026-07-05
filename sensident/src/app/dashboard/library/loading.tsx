/**
 * Skeleton de chargement pour /dashboard/library
 * S'affiche pendant le SSR/streaming Next.
 */
export default function LibraryLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-8" aria-busy={true} aria-live="polite">
      <div className="space-y-2">
        <div className="h-6 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}