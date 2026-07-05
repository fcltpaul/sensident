'use client';

import { useState } from 'react';
import { ChevronDown, Stethoscope, User } from 'lucide-react';

export interface FaqItem {
  q: string;
  a: string;
  audience: 'patient' | 'praticien' | 'both';
}

interface Props {
  items: FaqItem[];
}

export function FaqList({ items }: Props) {
  const [open, setOpen] = useState<number | null>(0);
  const [filter, setFilter] = useState<'all' | 'patient' | 'praticien'>('all');

  const filtered =
    filter === 'all' ? items : items.filter((i) => i.audience === filter || i.audience === 'both');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label="Tout" />
        <FilterChip active={filter === 'patient'} onClick={() => setFilter('patient')} label="Patient" />
        <FilterChip active={filter === 'praticien'} onClick={() => setFilter('praticien')} label="Praticien" />
      </div>

      <ul className="mx-auto max-w-3xl space-y-2">
        {filtered.map((item, idx) => {
          const isOpen = open === idx;
          const Icon = item.audience === 'patient' ? User : Stethoscope;
          return (
            <li key={`${item.q}-${idx}`} className="rounded-lg border border-border bg-card">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : idx)}
                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${idx}`}
              >
                <span className="flex items-start gap-2">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden={true} />
                  <span className="text-sm font-medium text-foreground">{item.q}</span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  aria-hidden={true}
                />
              </button>
              {isOpen && (
                <div
                  id={`faq-panel-${idx}`}
                  className="border-t border-border px-4 py-3 text-sm leading-relaxed text-muted-foreground"
                >
                  {item.a}
                </div>
              )}
            </li>
          );
        })}
      </ul>
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
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active ? 'bg-foreground text-background' : 'border border-border bg-background hover:bg-muted'
      }`}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}