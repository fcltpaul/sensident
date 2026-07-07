'use client';

import { useEffect, useState } from 'react';
import { Send, Save, X, CalendarClock, CalendarPlus, Sparkles } from 'lucide-react';
import type { Cadence } from '@/lib/newsletter-cadence';
import { formatParisDateLong, formatParisDateShort, nextOccurrences } from '@/lib/newsletter-cadence';
import { toastError } from '@/components/toast-helpers';

interface Props {
  cabinetName: string;
  onSend: (scheduled: 'now' | 'later', scheduledAt?: Date) => void;
  isLoading: boolean;
}

/**
 * Sensident — Etape 4 du composer : confirmation d'envoi.
 *
 * 2026-07-07 (Tartrinator) refonte : le praticien n'a plus a choisir une
 * date/heure ISO a la main. On lit sa cadence (configurable dans
 * /dashboard/account) et on propose :
 *   - "Envoyer maintenant"
 *   - "Prochaine occurrence" (selon cadence)
 *   - "Suivante"
 *   - "Encore apres"
 *   - Mode "Choisir une autre date" (repli, accessible via menu deroulant)
 *
 * Si le praticien n'a pas configure de cadence, on retombe sur l'ancien
 * comportement (saisie libre datetime-local).
 *
 * Cote backend : /api/newsletter/send decale automatiquement toute
 * newsletter deja programmee dans la fenetre de collision (cf fonction
 * shiftConflictingSends).
 */
export function SendStep({ cabinetName, onSend, isLoading }: Props) {
  const [cadence, setCadence] = useState<Cadence | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCustom, setShowCustom] = useState(false);
  const [customDate, setCustomDate] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/practitioner/newsletter-cadence', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.cadence) setCadence(data.cadence);
      })
      .catch(() => { /* silencieux */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const occurrences = cadence ? nextOccurrences(cadence, 3) : [];

  return (
    <>
      <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
        <p>
          Vous allez envoyer cette newsletter a tous vos patients actifs opt-in.
          Aucun email nominatif ne part.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Wording type : "Service de prévention offert par {cabinetName}"
        </p>
      </div>

      {/* Bandeau cadence si non configuree */}
      {!loading && !cadence && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p>
            <strong>Aucune cadence configurée.</strong> Vous pouvez envoyer maintenant ou choisir une date ci-dessous.
            Pour programmer a partir d'une cadence, configurez-la dans{' '}
            <a href="/dashboard/account" className="underline">Mon compte › Cadence newsletter</a>.
          </p>
        </div>
      )}

      {/* Bandeau cadence configuree */}
      {!loading && cadence && occurrences.length > 0 && (
        <CadenceSummary cadence={cadence} occurrences={occurrences} />
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSend('now')}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {isLoading ? 'Envoi...' : 'Envoyer immédiatement'}
        </button>
        {occurrences[0] && (
          <button
            onClick={() => onSend('later', occurrences[0])}
            disabled={isLoading}
            title={formatParisDateLong(occurrences[0])}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4 text-accent" />
            Prochaine : {formatParisDateShort(occurrences[0])}
          </button>
        )}
        {occurrences[1] && (
          <button
            onClick={() => onSend('later', occurrences[1])}
            disabled={isLoading}
            title={formatParisDateLong(occurrences[1])}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            <CalendarClock className="h-4 w-4" />
            Suivante : {formatParisDateShort(occurrences[1])}
          </button>
        )}
        {occurrences[2] && (
          <button
            onClick={() => onSend('later', occurrences[2])}
            disabled={isLoading}
            title={formatParisDateLong(occurrences[2])}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            <CalendarPlus className="h-4 w-4" />
            Encore après : {formatParisDateShort(occurrences[2])}
          </button>
        )}
        <button
          onClick={() => setShowCustom(true)}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
        >
          Choisir une autre date...
        </button>
      </div>

      {showCustom && (
        <CustomDateDialog
          initial={customDate}
          onSchedule={(d) => {
            setShowCustom(false);
            onSend('later', d);
          }}
          onCancel={() => setShowCustom(false)}
          disabled={isLoading}
        />
      )}

      {loading && (
        <p className="text-[11px] text-muted-foreground">Chargement de votre cadence...</p>
      )}
    </>
  );
}

function CadenceSummary({ cadence, occurrences }: { cadence: Cadence; occurrences: Date[] }) {
  const freqLabel = cadence.frequency === 'weekly' ? '1 fois par semaine' : cadence.frequency === 'biweekly' ? 'toutes les 2 semaines' : '1 fois par mois';
  const dayLabel =
    cadence.frequency === 'monthly'
      ? `le ${cadence.sendDay} du mois`
      : ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][cadence.sendDay];
  const hh = String(cadence.sendHour).padStart(2, '0');
  return (
    <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
      <p>
        Vous recevrez automatiquement <strong>{freqLabel}</strong>, <strong>{dayLabel}</strong> à <strong>{hh}h00</strong> (heure Paris).
        Si une autre newsletter est déjà programmée à ce créneau, elle sera décalée.
      </p>
      <p className="mt-1 text-[11px] text-blue-700">
        Pour modifier : <a href="/dashboard/account" className="underline">Mon compte › Cadence newsletter</a>.
      </p>
      <ul className="mt-2 space-y-0.5 text-xs">
        {occurrences.map((o, i) => (
          <li key={o.toISOString()}>
            <strong>{i === 0 ? 'Prochaine' : i === 1 ? 'Suivante' : 'Encore après'} :</strong> {formatParisDateLong(o)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CustomDateDialog({
  initial,
  onSchedule,
  onCancel,
  disabled,
}: {
  initial: string;
  onSchedule: (d: Date) => void;
  onCancel: () => void;
  disabled: boolean;
}) {
  const [date, setDate] = useState(initial);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-background p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Choisir une autre date</h3>
          <button onClick={onCancel}>
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
          <p className="mt-1 text-[11px] text-muted-foreground">
            Si une autre newsletter du cabinet est déjà programmée dans un intervalle proche,
            elle sera automatiquement décalée.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md border border-border px-3 py-1.5 text-sm"
          >
            Annuler
          </button>
          <button
            onClick={() => {
              if (!date) {
                toastError('Choisissez une date.');
                return;
              }
              const parsed = new Date(date);
              if (isNaN(parsed.getTime())) {
                toastError('Date invalide.');
                return;
              }
              if (parsed.getTime() <= Date.now()) {
                toastError('La date doit être dans le futur. Utilisez "Envoyer immédiatement".');
                return;
              }
              onSchedule(parsed);
            }}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          >
            <Save className="h-4 w-4" />
            Programmer
          </button>
        </div>
      </div>
    </div>
  );
}
