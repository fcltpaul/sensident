'use client';

import { useState } from 'react';
import { Send, Save, X } from 'lucide-react';

interface Props {
  cabinetName: string;
  onSend: (scheduled: 'now' | 'later', scheduledAt?: Date) => void;
  isLoading: boolean;
}

/**
 * Étape 4 : confirmation d'envoi.
 * - Bouton "Envoyer immédiatement" → POST /api/newsletter/send avec scheduledAt=null
 * - Bouton "Planifier..." → ouvre un dialog datetime
 */
export function SendStep({ cabinetName, onSend, isLoading }: Props) {
  return (
    <>
      <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
        <p>
          Vous allez envoyer cette newsletter à tous vos patients actifs opt-in.
          Aucun email nominatif ne part.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Wording type : "Service de prévention offert par {cabinetName}"
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSend('now')}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Send className="h-4 w-4" />
          {isLoading ? 'Envoi...' : 'Envoyer immédiatement'}
        </button>
        <ScheduleDialog onSchedule={(date) => onSend('later', date)} disabled={isLoading} />
      </div>
    </>
  );
}

function ScheduleDialog({ onSchedule, disabled }: { onSchedule: (d: Date) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
      >
        Planifier...
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-background p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Planifier l'envoi</h3>
              <button onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium">Date et heure</label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-md border border-border px-3 py-1.5 text-sm"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (!date) return alert('Choisissez une date.');
                  onSchedule(new Date(date));
                  setOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
              >
                <Save className="h-4 w-4" />
                Planifier
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
