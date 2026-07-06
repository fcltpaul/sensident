'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Stethoscope, User } from 'lucide-react';

export interface FaqItem {
  q: string;
  a: string;
  audience: 'patient' | 'praticien' | 'both';
}

interface Props {
  items: FaqItem[];
}

type Filter = 'all' | 'patient' | 'praticien';

// Identifiant stable basé sur l'index source, pas l'index filtré.
// Évite les collisions d'état quand on change de filtre.
function sourceKey(item: FaqItem, idx: number): string {
  return `${idx}-${item.q}`;
}

export function FaqList({ items }: Props) {
  // null = aucune question ouverte (état initial propre)
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(
    () =>
      filter === 'all'
        ? items
        : items.filter((i) => i.audience === filter || i.audience === 'both'),
    [items, filter],
  );

  const counts = useMemo(() => {
    const c = { all: items.length, patient: 0, praticien: 0 };
    for (const it of items) {
      if (it.audience === 'patient' || it.audience === 'both') c.patient += 1;
      if (it.audience === 'praticien' || it.audience === 'both') c.praticien += 1;
    }
    return c;
  }, [items]);

  return (
    <div className="space-y-5">
      <div
        className="flex flex-wrap items-center justify-center gap-2"
        role="group"
        aria-label="Filtrer les questions par audience"
      >
        <FilterChip
          active={filter === 'all'}
          onClick={() => {
            setFilter('all');
            setOpenKey(null);
          }}
          label={`Tout (${counts.all})`}
        />
        <FilterChip
          active={filter === 'patient'}
          onClick={() => {
            setFilter('patient');
            setOpenKey(null);
          }}
          label={`Patient (${counts.patient})`}
        />
        <FilterChip
          active={filter === 'praticien'}
          onClick={() => {
            setFilter('praticien');
            setOpenKey(null);
          }}
          label={`Praticien (${counts.praticien})`}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="mx-auto max-w-3xl rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          Aucune question pour ce filtre.
        </p>
      ) : (
        <ul className="mx-auto max-w-3xl space-y-2">
          {filtered.map((item, idx) => {
            const key = sourceKey(item, items.indexOf(item));
            const isOpen = openKey === key;
            const Icon = item.audience === 'patient' ? User : Stethoscope;
            const audienceLabel =
              item.audience === 'patient'
                ? 'Patient'
                : item.audience === 'praticien'
                  ? 'Praticien'
                  : 'Patient & Praticien';
            return (
              <li key={key} className="rounded-lg border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setOpenKey(isOpen ? null : key)}
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${key}`}
                >
                  <span className="flex items-start gap-2">
                    <Icon
                      className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden={true}
                    />
                    <span className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-foreground">{item.q}</span>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {audienceLabel}
                      </span>
                    </span>
                  </span>
                  <ChevronDown
                    className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden={true}
                  />
                </button>
                {isOpen && (
                  <div
                    id={`faq-panel-${key}`}
                    role="region"
                    aria-labelledby={`faq-button-${key}`}
                    className="border-t border-border px-4 py-3 text-sm leading-relaxed text-muted-foreground"
                  >
                    {item.a}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 ${
        active
          ? 'bg-foreground text-background'
          : 'border border-border bg-background hover:bg-muted'
      }`}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}