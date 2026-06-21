/**
 * Sensident — Tableau partagé "Mes prochaines newsletters"
 *
 * Composant présentationnel server-component, utilisé à la fois par
 * `/demo/practitioner` (hub démo) et `/dashboard/scheduled` (sidebar).
 *
 * Évite la duplication de la logique de rendu et garde la même
 * mise en page entre les deux points d'entrée.
 *
 * Les données sont pré-formatées par la page parente (date FR + compteurs),
 * le composant ne fait AUCUNE requête DB — il rend juste les rows.
 *
 * Le nombre de destinataires passe par `ThresholdValue` (k-anonymat,
 * seuil 5 par défaut — conforme AIPD R4 : pas de déduction individuelle).
 */

import { ThresholdValue } from './threshold-value';

export type UpcomingNewsletterRow = {
  id: string;
  subject: string;
  articleTitle: string;
  scheduledAt: Date | string | null;
  status: 'scheduled' | 'sending' | 'sent' | 'draft' | 'cancelled';
  recipientCount: number;
};

function formatScheduledAt(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  // dd MMM yyyy HH:mm (FR, mois abbrégé via toLocaleString)
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadgeClass(status: UpcomingNewsletterRow['status']): string {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-100 text-blue-800';
    case 'sending':
      return 'bg-amber-100 text-amber-800';
    case 'sent':
      return 'bg-emerald-100 text-emerald-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function statusLabel(status: UpcomingNewsletterRow['status']): string {
  switch (status) {
    case 'scheduled':
      return 'Planifiée';
    case 'sending':
      return 'Envoi…';
    case 'sent':
      return 'Envoyée';
    case 'cancelled':
      return 'Annulée';
    default:
      return status;
  }
}

export function UpcomingNewslettersTable({ rows }: { rows: UpcomingNewsletterRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Article</th>
            <th className="py-2 pr-3 font-medium">Envoi prévu</th>
            <th className="py-2 pr-3 text-right font-medium">Destinataires</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((nl) => (
            <tr key={nl.id} className="border-b border-border last:border-0">
              <td className="py-2.5 pr-3 font-medium">{nl.articleTitle}</td>
              <td className="py-2.5 pr-3">{formatScheduledAt(nl.scheduledAt)}</td>
              <td className="py-2.5 pr-3 text-right tabular-nums">
                <ThresholdValue value={nl.recipientCount} threshold={5} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
