'use client';

import { useState, useTransition, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GripVertical, Loader2, CheckCircle2, AlertCircle, Hand } from 'lucide-react';
import { nextCadenceOccurrence, type Cadence } from '@/lib/newsletter-cadence';

interface Row {
  id: string;
  articleTitle: string;
  scheduledAt: string; // ISO string
  recipientCount: number;
}

interface ServerSend {
  id: string;
  scheduledAt: string;
  articleSlug: string;
}

interface Props {
  rows: Row[];
  cadence?: Cadence | null;
}

/**
 * Tableau interactif des prochaines newsletters : drag-and-drop natif HTML5
 * pour réordonner/réplanifier. Pas de lib externe (react-dnd) pour rester
 * léger et compatible RSC.
 *
 * Spec Paul 2026-07-08 :
 *   - "Prendre une ligne et la faire glisser à d'autres date en déplaçant
 *      toutes les autres newsletters de manière logique."
 *   - "Les dates doivent toujours etre affichees par ordre chronologique
 *      (prochaine envoie en haut)."
 *   - "Il faudrait qu'on voit les newsletter se déplacer lorsque l'on drag
 *      une newsletter pour bien visualiser les changements (avec les dates
 *      qui changent pendant qu'on tient la newsletter)."
 *
 * Flow :
 *   1. User drag une ligne sur une autre ligne cible
 *   2. Pendant le drag (survol d'une cible), on calcule la cascade en LOCAL
 *      (preview visuelle des dates futures)
 *   3. Au drop, on PATCH /api/newsletter/send/[id] avec le scheduledAt de la cible
 *   4. Le serveur décale en cascade (shiftAndUpdate) les autres NL
 *   5. Le serveur retourne TOUS les sends impactés, on les applique au state
 *   6. On re-trie par date ASC pour garantir l'ordre chronologique
 */
export function UpcomingNewslettersInteractive({ rows: initialRows, cadence = null }: Props) {
  const router = useRouter();

  // Tri chronologique strict au mount (et a chaque update)
  const [rows, setRows] = useState<Row[]>(() =>
    [...initialRows].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    )
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // IMPORTANT : pendant le drag HTML5 natif, les re-renders React
  // interrompent le drag (le navigateur perd le focus sur l'element).
  // On utilise donc des refs pour les etats transitoires (draggingId,
  // hoverTargetId, previewDates) et on ne met a jour le state React
  // qu'apres le drop (dans onDrop). Le styling visuel est fait via
  // des data-attributes que le CSS peut lire sans re-render.

  const dragIdRef = useRef<string | null>(null);
  const hoverTargetRef = useRef<string | null>(null);
  const previewDatesRef = useRef<Record<string, string>>({});

  // Pour la banniere d'aide : on change ce state 1 fois au debut et 1 fois
  // a la fin du drag (pas pendant). Comme le HTML5 drag gere le visuel
  // de la ligne draguee sans React, ce re-render n'interrompt pas le drag.
  const [isDraggingAny, setIsDraggingAny] = useState(false);

  /**
   * Calcule en local la cascade qui resulterait du drag de draggedId sur targetId.
   * Renvoie un dict { sendId: nouvelleDateISO } pour les sends qui seraient affectes.
   *
   * Strategie : meme algo que le serveur (cascadeShift cadence-aware). Si la
   * cadence du cabinet est passee en prop, on l'utilise pour des previews
   * 100% fideles a ce que le serveur appliquera. Sinon, fallback +15min.
   */
  const computePreview = useCallback(
    (draggedId: string, targetId: string): Record<string, string> => {
      if (draggedId === targetId) return {};
      const draggedRow = rows.find((r) => r.id === draggedId);
      const targetRow = rows.find((r) => r.id === targetId);
      if (!draggedRow || !targetRow) return {};

      const newAt = targetRow.scheduledAt;
      const others = rows
        .filter((r) => r.id !== draggedId && new Date(r.scheduledAt).getTime() >= new Date(newAt).getTime())
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

      const result: Record<string, string> = {};
      result[draggedId] = newAt;

      const SHIFT_MS = 15 * 60 * 1000;
      let prev = new Date(newAt);

      for (const o of others) {
        let desired: Date;
        if (cadence) {
          const nextOcc = nextCadenceOccurrence(cadence, prev);
          desired = nextOcc ?? new Date(prev.getTime() + SHIFT_MS);
        } else {
          desired = new Date(prev.getTime() + SHIFT_MS);
        }
        if (desired.getTime() !== new Date(o.scheduledAt).getTime()) {
          result[o.id] = desired.toISOString();
        }
        prev = desired;
      }
      return result;
    },
    [rows, cadence]
  );

  const onDragStart = useCallback((id: string) => {
    dragIdRef.current = id;
    setIsDraggingAny(true);
  }, []);

  const onDragEnd = useCallback(() => {
    dragIdRef.current = null;
    hoverTargetRef.current = null;
    previewDatesRef.current = {};
    setIsDraggingAny(false);
    // Nettoyer les data-attributes visuels (sans re-render React)
    document.querySelectorAll('tr[data-send-id]').forEach((tr) => {
      tr.removeAttribute('data-dragging');
      tr.removeAttribute('data-hover-target');
      const origDate = tr.getAttribute('data-orig-date');
      const dateCell = tr.querySelector('.preview-date-cell');
      if (dateCell && origDate) {
        dateCell.textContent = formatScheduledAt(origDate);
      }
    });
  }, []);

  // Tick pour forcer un re-render du tableau apres un drag termine (pour
  // nettoyer les data-attributes). Pas utilise pour les etats transitoires.
  const onDragOver = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const draggedId = dragIdRef.current;
      if (!draggedId || draggedId === targetId) return;
      hoverTargetRef.current = targetId;
      previewDatesRef.current = computePreview(draggedId, targetId);
      // MAJ visuelle SANS re-render React (qui interromprait le drag HTML5).
      // On manipule directement le DOM via querySelector.
      const tbody = e.currentTarget.parentElement;
      if (!tbody) return;
      const trs = tbody.querySelectorAll('tr[data-send-id]');
      trs.forEach((tr) => {
        const id = tr.getAttribute('data-send-id') as string | null;
        if (!id) return;
        if (id === targetId) {
          tr.setAttribute('data-hover-target', 'true');
        } else {
          tr.removeAttribute('data-hover-target');
        }
        if (id === draggedId) {
          tr.setAttribute('data-dragging', 'true');
        } else {
          tr.removeAttribute('data-dragging');
        }
        // Update preview date cell
        const previewDate = previewDatesRef.current[id];
        const dateCell = tr.querySelector('.preview-date-cell');
        if (dateCell) {
          if (previewDate && previewDate !== tr.getAttribute('data-orig-date')) {
            dateCell.innerHTML = `<span class="text-muted-foreground line-through">${formatScheduledAt(tr.getAttribute('data-orig-date'))}</span><span class="ml-2 font-semibold text-emerald-700 dark:text-emerald-400">→ ${formatScheduledAt(previewDate)}</span>`;
          } else {
            dateCell.textContent = formatScheduledAt(tr.getAttribute('data-orig-date'));
          }
        }
      });
    },
    [computePreview]
  );

  const onDrop = useCallback(
    async (targetId: string) => {
      const draggedId = dragIdRef.current;
      dragIdRef.current = null;
      hoverTargetRef.current = null;
      previewDatesRef.current = {};
      if (!draggedId || draggedId === targetId) return;

      const draggedRow = rows.find((r) => r.id === draggedId);
      const targetRow = rows.find((r) => r.id === targetId);
      if (!draggedRow || !targetRow) return;

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
          return;
        }

        // Le serveur retourne TOUS les sends impactes (drag + cascade). On les
        // applique immediatement au state, en triant par date ASC.
        const serverSends: ServerSend[] = data.sends ?? [];
        if (serverSends.length > 0) {
          const merged: Row[] = serverSends
            .map((s) => {
              const prev = rows.find((r) => r.id === s.id);
              return {
                id: s.id,
                articleTitle: prev?.articleTitle ?? s.articleSlug,
                scheduledAt: s.scheduledAt,
                recipientCount: prev?.recipientCount ?? 0,
              };
            })
            .sort(
              (a, b) =>
                new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
            );
          setRows(merged);
        } else {
          // Fallback : router.refresh()
          startTransition(() => router.refresh());
          return;
        }

        setSuccess('Newsletter déplacée. Le serveur a décalé les autres en cascade si besoin.');
      } catch (e) {
        setError('Erreur réseau.');
      }
    },
    [rows, router]
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
      {isDraggingAny && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-blue-300 bg-blue-50 p-2 text-xs text-blue-900">
          <Hand className="h-4 w-4" />
          <span>Déplacez sur une autre ligne pour rééchelonner. Les autres newsletters seront automatiquement décalées (preview en vert ci-dessous).</span>
        </div>
      )}
      <style>{`
        tr[data-dragging="true"] {
          opacity: 0.5;
          cursor: grabbing;
        }
        tr[data-hover-target="true"] {
          background-color: rgb(219 234 254);
        }
        .dark tr[data-hover-target="true"] {
          background-color: rgba(30, 58, 138, 0.4);
        }
      `}</style>
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
            {rows.map((nl) => {
              return (
                <tr
                  key={nl.id}
                  data-send-id={nl.id}
                  data-orig-date={nl.scheduledAt}
                  draggable
                  onDragStart={() => onDragStart(nl.id)}
                  onDragEnd={onDragEnd}
                  onDragOver={(e) => onDragOver(e, nl.id)}
                  onDrop={() => onDrop(nl.id)}
                  className="border-b border-border last:border-0 hover:bg-muted/30 cursor-grab"
                  title="Glisser cette ligne sur une autre pour rééchelonner"
                >
                  <td className="py-2.5 pr-2 text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                  </td>
                  <td className="py-2.5 pr-3 font-medium">{nl.articleTitle}</td>
                  <td className="py-2.5 pr-3 preview-date-cell">
                    {formatScheduledAt(nl.scheduledAt)}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {nl.recipientCount >= 5 ? nl.recipientCount : '—'}
                  </td>
                </tr>
              );
            })}
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
        Les autres newsletters seront automatiquement décalées en cascade selon votre cadence.
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