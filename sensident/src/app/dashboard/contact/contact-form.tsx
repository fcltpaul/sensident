'use client';

import { useState } from 'react';
import { Save, Eye, EyeOff } from 'lucide-react';

interface Cabinet {
  id: string;
  name: string;
  slug: string;
  rpps: string | null;
  contactAddress: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactRdvUrl: string | null;
  contactOpeningHours: Record<string, string> | null;
  contactFacadePhotoUrl: string | null;
  contactOncdMention: boolean;
  contactMapUrl: string | null;
}

const FIELD_DEFS: Array<{ key: keyof Cabinet; label: string; placeholder: string; type: 'text' | 'url' | 'tel' | 'email' }> = [
  { key: 'name', label: 'Nom du cabinet', placeholder: 'Cabinet du Dr Dupont', type: 'text' },
  { key: 'rpps', label: 'Numéro RPPS', placeholder: '10001234567 (obligatoire CSP L.4112-1)', type: 'text' },
  { key: 'contactAddress', label: 'Adresse', placeholder: '12 rue de la République, 44000 Nantes', type: 'text' },
  { key: 'contactPhone', label: 'Téléphone', placeholder: '02 40 12 34 56', type: 'tel' },
  { key: 'contactEmail', label: 'Email', placeholder: 'contact@cabinet-dupont.fr', type: 'email' },
  { key: 'contactRdvUrl', label: 'Lien de prise de RDV (Doctolib, etc.)', placeholder: 'https://www.doctolib.fr/...', type: 'url' },
  { key: 'contactMapUrl', label: 'Lien Google Maps', placeholder: 'https://maps.google.com/...', type: 'url' },
];

const HOURS_DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

export function ContactForm({ cabinet }: { cabinet: Cabinet }) {
  const [data, setData] = useState(cabinet);
  const [hours, setHours] = useState<Record<string, string>>(
    cabinet.contactOpeningHours ?? { lundi: '', mardi: '', mercredi: '', jeudi: '', vendredi: '', samedi: '', dimanche: '' }
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/practitioner/contact', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, contactOpeningHours: hours }),
      });
      const r = await res.json();
      if (!res.ok) {
        setError(r.error || 'Erreur');
        setSaving(false);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Erreur reseau.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {saved && <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800">✓ Enregistré</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Form */}
        <div className="space-y-4 rounded-lg border border-border bg-background p-6">
          <h2 className="text-sm font-semibold">Informations</h2>

          {FIELD_DEFS.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium">{f.label}</label>
              <input
                type={f.type}
                value={(data[f.key] as string) ?? ''}
                onChange={(e) => setData({ ...data, [f.key]: e.target.value || null })}
                placeholder={f.placeholder}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {data[f.key] ? <><Eye className="inline h-3 w-3" /> Affiché aux patients</> : <><EyeOff className="inline h-3 w-3" /> Masqué</>}
              </p>
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium">Horaires d'ouverture</label>
            <div className="mt-1 space-y-1">
              {HOURS_DAYS.map((d) => (
                <div key={d} className="flex items-center gap-2 text-sm">
                  <span className="w-20 text-muted-foreground capitalize">{d}</span>
                  <input
                    type="text"
                    value={hours[d] ?? ''}
                    onChange={(e) => setHours({ ...hours, [d]: e.target.value })}
                    placeholder="9h-12h / 14h-18h ou 'Fermé'"
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="oncd"
              checked={data.contactOncdMention}
              onChange={(e) => setData({ ...data, contactOncdMention: e.target.checked })}
              className="mt-1"
            />
            <label htmlFor="oncd" className="text-xs text-muted-foreground">
              Afficher la mention « Membre de l'Ordre national des chirurgiens-dentistes »
            </label>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>

        {/* Preview */}
        <div className="rounded-lg border border-border bg-background p-6">
          <h2 className="text-sm font-semibold">Aperçu patient</h2>
          <p className="text-xs text-muted-foreground">Ce que vos patients voient</p>
          <div className="mt-4 space-y-3 rounded-md border border-border bg-muted/30 p-4 text-sm">
            <h3 className="text-lg font-semibold">{data.name}</h3>
            {data.rpps && <p className="text-xs text-muted-foreground">RPPS : {data.rpps}</p>}
            {data.contactAddress && (
              <p>
                <strong>Adresse :</strong> {data.contactAddress}
                {data.contactMapUrl && (
                  <> · <a href={data.contactMapUrl} target="_blank" rel="noopener" className="text-accent underline">Voir l'itinéraire</a></>
                )}
              </p>
            )}
            {data.contactPhone && (
              <p><strong>Téléphone :</strong> <a href={`tel:${data.contactPhone}`} className="text-accent">{data.contactPhone}</a></p>
            )}
            {data.contactEmail && (
              <p><strong>Email :</strong> <a href={`mailto:${data.contactEmail}`} className="text-accent">{data.contactEmail}</a></p>
            )}
            {data.contactRdvUrl && (
              <a href={data.contactRdvUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                Prendre RDV
              </a>
            )}

            {Object.values(hours).some((v) => v) && (
              <div>
                <strong>Horaires :</strong>
                <ul className="mt-1 ml-4 list-disc text-xs">
                  {HOURS_DAYS.filter((d) => hours[d]).map((d) => (
                    <li key={d}><span className="capitalize">{d}</span> : {hours[d]}</li>
                  ))}
                </ul>
              </div>
            )}

            {data.contactOncdMention && (
              <p className="text-[10px] text-muted-foreground border-t border-border pt-2">
                Membre de l'Ordre national des chirurgiens-dentistes
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
