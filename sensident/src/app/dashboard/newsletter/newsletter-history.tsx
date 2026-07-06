interface HistoryRow {
  id: string;
  subject: string;
  status: string;
  createdAt: string | Date;
  sentAt: string | Date | null;
  articleSlug: string | null;
  recipientCount: number;
  openedCount: number;
  clickedCount: number;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Brouillon', cls: 'bg-slate-100 text-slate-700' },
  scheduled: { label: 'Planifié', cls: 'bg-blue-100 text-blue-800' },
  sending: { label: 'Envoi...', cls: 'bg-blue-100 text-blue-800' },
  sent: { label: 'Envoyé', cls: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Annulé', cls: 'bg-red-100 text-red-800' },
};

function toDateString(d: string | Date | null): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, cls: 'bg-slate-100 text-slate-700' };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

export function NewsletterHistory({ history }: { history: HistoryRow[] }) {
  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
        Aucun envoi ne correspond aux filtres. Composez votre première newsletter ci-dessus.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Sujet</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Destinataires</th>
              <th className="px-4 py-3">Ouvertures</th>
              <th className="px-4 py-3">Clics</th>
              <th className="px-4 py-3">Créé le</th>
              <th className="px-4 py-3">Envoyé le</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{h.subject || '(sans sujet)'}</div>
                  {h.articleSlug && (
                    <div className="text-xs text-muted-foreground">/articles/{h.articleSlug}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={h.status} />
                </td>
                <td className="px-4 py-3">{h.recipientCount}</td>
                <td className="px-4 py-3">
                  {h.recipientCount > 0
                    ? `${h.openedCount} (${Math.round((h.openedCount / h.recipientCount) * 100)}%)`
                    : '—'}
                </td>
                <td className="px-4 py-3">{h.clickedCount}</td>
                <td className="px-4 py-3 text-muted-foreground">{toDateString(h.createdAt)}</td>
                <td className="px-4 py-3 text-muted-foreground">{toDateString(h.sentAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}