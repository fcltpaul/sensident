'use client';

import { useState, useTransition, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GripVertical, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface Row {
  id: string;
  articleTitle: string;
  scheduledAt: string; // ISO string
  recipientCount: number;
}

interface Props {
  rows: Row[];
}

/**
 * Tableau interactif des prochaines newsletters : drag-and-drop natif HTML5
 * pour réordonner/réplanifier. Pas de lib externe (react-dnd) pour rester
 * léger et compatible RSC.
 *
 * Spec Paul 2026-07-08 :
 *   "Prendre une ligne et la faire glisser à d'autres date en déplaçant
 *    toutes les autres newsletters de manière logique pour changer l'ordre
 *    d'envoi."
 *
 * Flow :
 *   1. User drag une ligne sur une autre ligne cible
 *   2. On PATCH /api/newsletter/send/[id] avec le scheduledAt de la cible
 *   3. Le serveur décale en cascade (shiftAndUpdate) les autres NL qui
 *      seraient en collision
 *   4. On refresh la page pour afficher le nouvel ordre
 */
export function UpcomingNewslettersInteractive({ rows: initialRows }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);

  const onDragStart = useCallback((id: string) => {
    dragIdRef.current = id;
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback(
    async (targetId: string) => {
      const draggedId = dragIdRef.current;
      dragIdRef.current = null;
      if (!draggedId || draggedId === targetId) return;

      const draggedRow = rows.find((r) => r.id === draggedId);
      const targetRow = rows.find((r) => r.id === targetId);
      if (!draggedRow || !targetRow) return;

      // Optimistic update : on swap les scheduledAt
      const newRows = rows.map((r) => {
        if (r.id === draggedId) return { ...r, scheduledAt: targetRow.scheduledAt };
        return r;
      });
      setRows(newRows);
      setError(null);
      setSuccess(null);

      try {
        const res = await fetch(`/api/newsletter/send/${draggedId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ scheduledAt: targetRow.scheduledAt }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Erreur.');
          setRows(initialRows); // revert
          return;
        }
        setSuccess('Newsletter déplacée. Le serveur a décalé les autres en cascade si besoin.');
        startTransition(() => router.refresh());
      } catch (e) {
        setError('Erreur réseau.');
        setRows(initialRows);
      }
    },
    [rows, initialRows, router]
  );

  return (
    <div>
      {error && (
        <div role="alert" className="mb-3 flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div role="status" className="mb-3 flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pr-2 font-medium w-6"></th>
              <th className="py-2 pr-3 font-medium">Article</th>
              <th className="py-2 pr-3 font-medium">Envoi prévu</th>
              <th className="py-2 pr-3 text-right font-medium">Destinataires</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((nl) => (
              <tr
                key={nl.id}
                draggable
                onDragStart={() => onDragStart(nl.id)}
                onDragOver={onDragOver}
                onDrop={() => onDrop(nl.id)}
                className="border-b border-border last:border-0 hover:bg-muted/30 cursor-grab active:cursor-grabbing"
                title="Glisser cette ligne sur une autre pour rééchelonner"
              >
                <td className="py-2.5 pr-2 text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                </td>
                <td className="py-2.5 pr-3 font-medium">{nl.articleTitle}</td>
                <td className="py-2.5 pr-3">{formatScheduledAt(nl.scheduledAt)}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {nl.recipientCount >= 5 ? nl.recipientCount : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pending && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Mise à jour…
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        💡 Glissez une ligne sur une autre pour déplacer la newsletter à la date de la cible.
        Les autres newsletters seront automatiquement décalées en cascade (écart 15 min minimum).
      </p>
    </div>
  );
}

function formatScheduledAt(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}