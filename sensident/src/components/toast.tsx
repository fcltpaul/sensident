'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
  /** Durée en ms, défaut 4000. */
  durationMs?: number;
}

type Listener = (items: ToastItem[]) => void;

const items: ToastItem[] = [];
const listeners: Listener[] = [];
let nextId = 1;

function notify() {
  for (const l of listeners) l([...items]);
}

/**
 * Affiche un toast non bloquant. Peut être appelé depuis n'importe où dans
 * une arborescence cliente qui a monté le `<Toaster />` racine.
 */
export function showToast(message: string, kind: ToastKind = 'info', durationMs = 4000) {
  const id = nextId++;
  const item: ToastItem = { id, message, kind, durationMs };
  items.push(item);
  notify();
  if (durationMs > 0) {
    setTimeout(() => dismissToast(id), durationMs);
  }
  return id;
}

export function dismissToast(id: number) {
  const idx = items.findIndex((i) => i.id === id);
  if (idx >= 0) {
    items.splice(idx, 1);
    notify();
  }
}

/**
 * Conteneur à monter une seule fois dans l'arbre client (par ex. dashboard layout).
 * Les toasts arrivent en haut-centre, dans une pile verticale.
 */
export function Toaster() {
  const [stack, setStack] = useState<ToastItem[]>([]);

  useEffect(() => {
    const l: Listener = (next) => setStack(next);
    listeners.push(l);
    setStack([...items]);
    return () => {
      const idx = listeners.indexOf(l);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  if (stack.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4 sm:top-4"
      aria-live="polite"
      aria-atomic={true}
    >
      {stack.map((t) => (
        <ToastBubble key={t.id} item={t} />
      ))}
    </div>
  );
}

function ToastBubble({ item }: { item: ToastItem }) {
  const kindClass =
    item.kind === 'success'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
      : item.kind === 'error'
      ? 'border-red-300 bg-red-50 text-red-900'
      : 'border-blue-300 bg-blue-50 text-blue-900';
  const Icon = item.kind === 'success' ? CheckCircle2 : item.kind === 'error' ? AlertCircle : Info;
  return (
    <div
      className={`pointer-events-auto inline-flex max-w-md items-center gap-2 rounded-md border px-3 py-2 text-xs shadow-md ${kindClass}`}
      role="status"
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden={true} />
      <span className="flex-1 leading-relaxed">{item.message}</span>
      <button
        type="button"
        onClick={() => dismissToast(item.id)}
        className="ml-1 rounded-sm p-0.5 opacity-70 hover:bg-black/5 hover:opacity-100"
        aria-label="Fermer la notification"
      >
        <X className="h-3.5 w-3.5" aria-hidden={true} />
      </button>
    </div>
  );
}