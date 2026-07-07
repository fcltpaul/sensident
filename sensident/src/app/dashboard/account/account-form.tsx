'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, KeyRound, Smartphone, Shield, Check, Eye, EyeOff, Image as ImageIcon, Clock, MapPin } from 'lucide-react';
import { toastError, toastSuccess } from '@/components/toast-helpers';
import type { NewsletterBranding } from '@/lib/newsletter-branding-types';
import type { NewsletterCadence } from '@/db/schema';

// ---------- Props ----------
interface Props {
  practitioner: { id: string; email: string; mfaEnabled: boolean; createdAt: Date };
  cabinet: {
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
  };
  branding: NewsletterBranding;
  cadence: NewsletterCadence | null;
  subscription: {
    plan: string;
    status: string;
    isAmbassador: boolean;
    currentPeriodEnd: Date | null;
    hasStripeCustomer: boolean;
  } | null;
}

const HOURS_DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const;
const HOURS_DAY_LABELS: Record<typeof HOURS_DAYS[number], string> = {
  lundi: 'Lundi',
  mardi: 'Mardi',
  mercredi: 'Mercredi',
  jeudi: 'Jeudi',
  vendredi: 'Vendredi',
  samedi: 'Samedi',
  dimanche: 'Dimanche',
};

const WEEKLY_DAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
];

const FREQUENCY_LABELS: Record<NewsletterCadence['frequency'], string> = {
  weekly: '1 fois par semaine',
  biweekly: 'Toutes les 2 semaines',
  monthly: '1 fois par mois',
};

export function AccountForm({ practitioner, cabinet, branding, cadence, subscription }: Props) {
  const router = useRouter();

  // --- Identite ---
  const [cabinetName, setCabinetName] = useState(cabinet.name);
  const [savingCabinet, setSavingCabinet] = useState(false);
  const [savedCabinet, setSavedCabinet] = useState(false);

  // --- Mot de passe ---
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingPwd, setSavingPwd] = useState(false);

  // --- MFA ---
  const [mfaMsg, setMfaMsg] = useState<string | null>(null);
  const [mfaQr, setMfaQr] = useState<{ qrCodeUrl: string; secret: string } | null>(null);

  // --- Bloc contact ---
  const [contact, setContact] = useState({
    rpps: cabinet.rpps ?? '',
    contactAddress: cabinet.contactAddress ?? '',
    contactPhone: cabinet.contactPhone ?? '',
    contactEmail: cabinet.contactEmail ?? '',
    contactRdvUrl: cabinet.contactRdvUrl ?? '',
    contactMapUrl: cabinet.contactMapUrl ?? '',
    contactOncdMention: cabinet.contactOncdMention,
  });
  const [hours, setHours] = useState<Record<string, string>>(
    cabinet.contactOpeningHours ?? { lundi: '', mardi: '', mercredi: '', jeudi: '', vendredi: '', samedi: '', dimanche: '' }
  );
  const [savingContact, setSavingContact] = useState(false);
  const [savedContact, setSavedContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  // --- Branding newsletter ---
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl ?? '');
  const [accentColor, setAccentColor] = useState(branding.accentColor ?? '#1E40AF');
  const [signature, setSignature] = useState(branding.signature ?? '');
  const [showLogo, setShowLogo] = useState(Boolean(branding.showLogo));
  const [savingBranding, setSavingBranding] = useState(false);
  const [savedBranding, setSavedBranding] = useState(false);
  const [brandingError, setBrandingError] = useState<string | null>(null);

  // --- Cadence newsletter ---
  const [cadenceFrequency, setCadenceFrequency] = useState<NewsletterCadence['frequency'] | ''>(
    cadence?.frequency ?? ''
  );
  const [cadenceDay, setCadenceDay] = useState<number | ''>(
    cadence ? cadence.sendDay : ''
  );
  const [cadenceHour, setCadenceHour] = useState<number | ''>(
    cadence ? cadence.sendHour : ''
  );
  const [savingCadence, setSavingCadence] = useState(false);
  const [savedCadence, setSavedCadence] = useState(false);
  const [cadenceError, setCadenceError] = useState<string | null>(null);

  // =================== Save handlers ===================

  const saveCabinetName = async () => {
    setSavingCabinet(true);
    try {
      const res = await fetch('/api/practitioner/cabinet-name', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cabinetName }),
      });
      if (res.ok) {
        setSavedCabinet(true);
        setTimeout(() => setSavedCabinet(false), 3000);
        router.refresh();
      } else {
        toastError('Erreur sauvegarde nom cabinet.');
      }
    } catch {
      toastError('Erreur reseau.');
    } finally {
      setSavingCabinet(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (newPwd.length < 12) {
      setPwdMsg({ ok: false, text: 'Le mot de passe doit faire au moins 12 caracteres.' });
      return;
    }
    setSavingPwd(true);
    try {
      const res = await fetch('/api/practitioner/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwdMsg({ ok: true, text: 'Mot de passe mis a jour.' });
        setOldPwd('');
        setNewPwd('');
      } else {
        setPwdMsg({ ok: false, text: data.error || 'Erreur' });
      }
    } catch {
      setPwdMsg({ ok: false, text: 'Erreur reseau.' });
    } finally {
      setSavingPwd(false);
    }
  };

  const saveContact = async () => {
    setSavingContact(true);
    setContactError(null);
    try {
      const payload = {
        ...contact,
        contactOpeningHours: hours,
      };
      const res = await fetch('/api/practitioner/contact', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const r = await res.json();
      if (!res.ok) {
        setContactError(r.error || 'Erreur sauvegarde.');
      } else {
        setSavedContact(true);
        setTimeout(() => setSavedContact(false), 3000);
      }
    } catch {
      setContactError('Erreur reseau.');
    } finally {
      setSavingContact(false);
    }
  };

  const saveBranding = async () => {
    setSavingBranding(true);
    setBrandingError(null);
    try {
      const res = await fetch('/api/practitioner/newsletter-branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logoUrl: logoUrl.trim() || null,
          accentColor: accentColor.trim() || null,
          signature: signature.trim() || null,
          showLogo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBrandingError(data.error || 'Erreur sauvegarde.');
      } else {
        setSavedBranding(true);
        setTimeout(() => setSavedBranding(false), 3000);
      }
    } catch {
      setBrandingError('Erreur reseau.');
    } finally {
      setSavingBranding(false);
    }
  };

  const saveCadence = async () => {
    setSavingCadence(true);
    setCadenceError(null);
    try {
      const res = await fetch('/api/practitioner/newsletter-cadence', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frequency: cadenceFrequency,
          sendDay: cadenceDay === '' ? null : cadenceDay,
          sendHour: cadenceHour === '' ? null : cadenceHour,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCadenceError(data.error || 'Erreur sauvegarde.');
      } else {
        setSavedCadence(true);
        setTimeout(() => setSavedCadence(false), 3000);
        router.refresh();
      }
    } catch {
      setCadenceError('Erreur reseau.');
    } finally {
      setSavingCadence(false);
    }
  };

  const clearCadence = async () => {
    if (!confirm('Supprimer la cadence configurée ? Vous pourrez toujours programmer manuellement chaque envoi.')) return;
    setSavingCadence(true);
    setCadenceError(null);
    try {
      const res = await fetch('/api/practitioner/newsletter-cadence', { method: 'DELETE' });
      if (res.ok) {
        setCadenceFrequency('');
        setCadenceDay('');
        setCadenceHour('');
        setSavedCadence(true);
        setTimeout(() => setSavedCadence(false), 3000);
        router.refresh();
      } else {
        const data = await res.json();
        setCadenceError(data.error || 'Erreur');
      }
    } catch {
      setCadenceError('Erreur reseau.');
    } finally {
      setSavingCadence(false);
    }
  };

  // =================== MFA handlers ===================

  const resetMfa = async () => {
    if (!confirm('Reinitialiser le MFA ? Vous devrez re-scanner un QR code avec votre app authenticator.')) return;
    setMfaMsg(null);
    try {
      const res = await fetch('/api/practitioner/mfa-reset', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMfaQr({ qrCodeUrl: data.qrCodeUrl, secret: data.totpSecret });
        setMfaMsg('Scannez ce nouveau QR code avec votre application authenticator, puis saisissez le code ci-dessous.');
      } else {
        setMfaMsg(data.error || 'Erreur');
      }
    } catch {
      setMfaMsg('Erreur reseau.');
    }
  };

  const verifyMfaReset = async (code: string) => {
    try {
      const res = await fetch('/api/practitioner/mfa-verify-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totpCode: code }),
      });
      const data = await res.json();
      if (res.ok) {
        setMfaMsg('✓ MFA reconfigure avec succes.');
        setMfaQr(null);
        router.refresh();
      } else {
        setMfaMsg(data.error || 'Code invalide');
      }
    } catch {
      setMfaMsg('Erreur reseau.');
    }
  };

  // =================== Render ===================

  const dayOptions =
    cadenceFrequency === 'monthly'
      ? Array.from({ length: 28 }, (_, i) => ({ value: i + 1, label: `Le ${i + 1} du mois` }))
      : WEEKLY_DAYS;

  return (
    <div className="space-y-6">
      {/* ============== IDENTITE ============== */}
      <div className="rounded-lg border border-border bg-background p-6">
        <h2 className="text-sm font-semibold">Identité</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <p className="mt-1 text-sm text-muted-foreground">{practitioner.email}</p>
            <p className="text-xs text-muted-foreground">Pour modifier votre email, contactez le support.</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Nom du cabinet</label>
            <div className="mt-1 flex gap-2">
              <input
                value={cabinetName}
                onChange={(e) => setCabinetName(e.target.value)}
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                onClick={saveCabinetName}
                disabled={savingCabinet || cabinetName === cabinet.name}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {savingCabinet ? '...' : 'Enregistrer'}
              </button>
            </div>
            {savedCabinet && <p className="mt-1 text-xs text-green-700">✓ Enregistré</p>}
          </div>
          <div>
            <p className="text-sm font-medium">URL publique</p>
            <p className="mt-1 text-sm font-mono text-muted-foreground">
              sensident.fr/c/{cabinet.slug}
            </p>
            <p className="text-xs text-muted-foreground">Le slug ne peut pas etre modifie apres creation.</p>
          </div>
        </div>
      </div>

      {/* ============== BLOC CONTACT (deplace depuis /dashboard/contact) ============== */}
      <ContactSection
        contact={contact}
        hours={hours}
        saving={savingContact}
        saved={savedContact}
        error={contactError}
        onChangeContact={setContact}
        onChangeHour={(day, value) => setHours((h) => ({ ...h, [day]: value }))}
        onSave={saveContact}
      />

      {/* ============== BRANDING NEWSLETTER (logo + signature + accent) ============== */}
      <BrandingSection
        logoUrl={logoUrl}
        accentColor={accentColor}
        signature={signature}
        showLogo={showLogo}
        saving={savingBranding}
        saved={savedBranding}
        error={brandingError}
        onChangeLogoUrl={setLogoUrl}
        onChangeAccent={setAccentColor}
        onChangeSignature={setSignature}
        onToggleShowLogo={setShowLogo}
        onSave={saveBranding}
      />

      {/* ============== CADENCE NEWSLETTER (frequence + jour + heure) ============== */}
      <CadenceSection
        frequency={cadenceFrequency}
        day={cadenceDay}
        hour={cadenceHour}
        dayOptions={dayOptions}
        saving={savingCadence}
        saved={savedCadence}
        error={cadenceError}
        onChangeFrequency={(f) => {
          setCadenceFrequency(f);
          // reset day pour eviter incoherence (day invalide pour la nouvelle freq)
          setCadenceDay('');
        }}
        onChangeDay={setCadenceDay}
        onChangeHour={setCadenceHour}
        onSave={saveCadence}
        onClear={clearCadence}
        hasExisting={Boolean(cadence)}
      />

      {/* ============== MOT DE PASSE ============== */}
      <div className="rounded-lg border border-border bg-background p-6">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <KeyRound className="h-4 w-4" /> Mot de passe
        </h2>
        <form onSubmit={changePassword} className="mt-4 space-y-3">
          <div>
            <label className="block text-sm">Ancien mot de passe</label>
            <input
              type="password"
              value={oldPwd}
              onChange={(e) => setOldPwd(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm">Nouveau mot de passe</label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              minLength={12}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">12 caracteres min, 1 majuscule, 1 chiffre.</p>
          </div>
          {pwdMsg && (
            <p className={`text-xs ${pwdMsg.ok ? 'text-green-700' : 'text-red-700'}`}>{pwdMsg.text}</p>
          )}
          <button
            type="submit"
            disabled={savingPwd}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {savingPwd ? 'Modification...' : 'Modifier le mot de passe'}
          </button>
        </form>
      </div>

      {/* ============== MFA ============== */}
      <div className="rounded-lg border border-border bg-background p-6">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Smartphone className="h-4 w-4" /> Authentification a deux facteurs (MFA)
        </h2>
        <div className="mt-4">
          {practitioner.mfaEnabled ? (
            <p className="text-sm text-green-700">✓ MFA active. Pour reconfigurer (nouveau telephone par exemple), cliquez ci-dessous.</p>
          ) : (
            <p className="text-sm text-amber-700">⚠ MFA non active (ce cas ne devrait pas se presenter).</p>
          )}
          {mfaMsg && <p className="mt-2 text-sm">{mfaMsg}</p>}
          {mfaQr && (
            <div className="mt-4 rounded-md border border-border bg-muted/30 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mfaQr.qrCodeUrl} alt="QR code" className="mx-auto h-48 w-48" />
              <p className="mt-2 text-center text-xs">Secret : <code className="rounded bg-muted px-1">{mfaQr.secret}</code></p>
              <VerifyMfaInput onSubmit={verifyMfaReset} />
            </div>
          )}
          <button
            onClick={resetMfa}
            className="mt-3 inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            <Shield className="h-4 w-4" />
            {practitioner.mfaEnabled ? 'Reconfigurer le MFA (TOTP)' : 'Activer le MFA'}
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            Vous preferez recevoir un code par email a chaque connexion ?{' '}
            <a href="mailto:dpo@sensident.fr?subject=Bascule%20MFA%20vers%20email-code" className="underline">
              Demander la bascule
            </a>{' '}
            (nos equipes activent l&apos;option sur votre compte sous 24h).
          </p>
        </div>
      </div>

      {/* ============== ABONNEMENT ============== */}
      <SubscriptionSection subscription={subscription} />
    </div>
  );
}

// ============== Sous-composants ==============

interface ContactSectionProps {
  contact: {
    rpps: string;
    contactAddress: string;
    contactPhone: string;
    contactEmail: string;
    contactRdvUrl: string;
    contactMapUrl: string;
    contactOncdMention: boolean;
  };
  hours: Record<string, string>;
  saving: boolean;
  saved: boolean;
  error: string | null;
  onChangeContact: (c: ContactSectionProps['contact']) => void;
  onChangeHour: (day: string, value: string) => void;
  onSave: () => void;
}

function ContactSection({ contact, hours, saving, saved, error, onChangeContact, onChangeHour, onSave }: ContactSectionProps) {
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Bloc contact
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Visible par vos patients sur leur espace. Renseignez uniquement ce que vous voulez afficher.
          </p>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      {error && <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {saved && <div className="mt-3 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800">✓ Bloc contact enregistre.</div>}

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Field
            label="Numero RPPS"
            placeholder="10001234567"
            value={contact.rpps}
            onChange={(v) => onChangeContact({ ...contact, rpps: v })}
            hint="Obligatoire CSP L.4112-1"
          />
          <Field
            label="Adresse"
            placeholder="12 rue de la République, 44000 Nantes"
            value={contact.contactAddress}
            onChange={(v) => onChangeContact({ ...contact, contactAddress: v })}
          />
          <Field
            label="Téléphone"
            placeholder="02 40 12 34 56"
            value={contact.contactPhone}
            onChange={(v) => onChangeContact({ ...contact, contactPhone: v })}
          />
          <Field
            label="Email"
            placeholder="contact@cabinet-dupont.fr"
            value={contact.contactEmail}
            onChange={(v) => onChangeContact({ ...contact, contactEmail: v })}
          />
          <Field
            label="Lien de prise de RDV (Doctolib, etc.)"
            placeholder="https://www.doctolib.fr/..."
            value={contact.contactRdvUrl}
            onChange={(v) => onChangeContact({ ...contact, contactRdvUrl: v })}
          />
          <Field
            label="Lien Google Maps"
            placeholder="https://maps.google.com/..."
            value={contact.contactMapUrl}
            onChange={(v) => onChangeContact({ ...contact, contactMapUrl: v })}
          />
        </div>

        <div className="space-y-3">
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
            <h3 className="text-sm font-semibold">Horaires d'ouverture</h3>
            <div className="mt-2 space-y-1">
              {HOURS_DAYS.map((d) => (
                <div key={d} className="flex items-center gap-2 text-sm">
                  <span className="w-20 text-muted-foreground">{HOURS_DAY_LABELS[d]}</span>
                  <input
                    type="text"
                    value={hours[d] ?? ''}
                    onChange={(e) => onChangeHour(d, e.target.value)}
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
              id="oncd-mention"
              checked={contact.contactOncdMention}
              onChange={(e) => onChangeContact({ ...contact, contactOncdMention: e.target.checked })}
              className="mt-1"
            />
            <label htmlFor="oncd-mention" className="text-xs text-muted-foreground">
              Afficher la mention « Membre de l&apos;Ordre national des chirurgiens-dentistes »
            </label>
          </div>

          <ContactPreview contact={contact} hours={hours} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, placeholder, value, onChange, hint }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const displayed = value && value.length > 0;
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <span>{label}</span>
        {displayed ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-green-700">
            <Eye className="h-3 w-3" /> visible
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <EyeOff className="h-3 w-3" /> masqué
          </span>
        )}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ContactPreview({ contact, hours }: { contact: ContactSectionProps['contact']; hours: Record<string, string> }) {
  const anyValue = Object.values(contact).some((v) => typeof v === 'string' ? v.length > 0 : v) || Object.values(hours).some((v) => v);
  if (!anyValue) return <p className="text-xs text-muted-foreground">Apercu : rien de rempli pour l&apos;instant.</p>;
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
      <h3 className="text-sm font-semibold">Aperçu patient</h3>
      <ul className="mt-2 space-y-1">
        {contact.rpps && <li><strong>RPPS :</strong> {contact.rpps}</li>}
        {contact.contactAddress && <li><strong>Adresse :</strong> {contact.contactAddress}</li>}
        {contact.contactPhone && <li><strong>Tel :</strong> {contact.contactPhone}</li>}
        {contact.contactEmail && <li><strong>Email :</strong> {contact.contactEmail}</li>}
        {contact.contactRdvUrl && <li><strong>RDV :</strong> <a href={contact.contactRdvUrl} className="text-accent underline">prendre RDV</a></li>}
        {Object.values(hours).some((v) => v) && (
          <li><strong>Horaires :</strong> {Object.entries(hours).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' ; ')}</li>
        )}
        {contact.contactOncdMention && <li className="text-[10px] text-muted-foreground">Membre de l&apos;Ordre national des chirurgiens-dentistes</li>}
      </ul>
    </div>
  );
}

interface BrandingSectionProps {
  logoUrl: string;
  accentColor: string;
  signature: string;
  showLogo: boolean;
  saving: boolean;
  saved: boolean;
  error: string | null;
  onChangeLogoUrl: (v: string) => void;
  onChangeAccent: (v: string) => void;
  onChangeSignature: (v: string) => void;
  onToggleShowLogo: (v: boolean) => void;
  onSave: () => void;
}

function BrandingSection(props: BrandingSectionProps) {
  const safeAccent = /^#[0-9a-fA-F]{6}$/.test(props.accentColor) ? props.accentColor : '#1E40AF';
  const safeLogo = props.logoUrl && /^https?:\/\//.test(props.logoUrl) ? props.logoUrl : '';
  const showPreview = props.showLogo && safeLogo;

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <ImageIcon className="h-4 w-4" /> Branding newsletter
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Personnalisation visuelle des emails envoyes a vos patients.
          </p>
        </div>
        <button
          onClick={props.onSave}
          disabled={props.saving}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {props.saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      {props.error && <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{props.error}</div>}
      {props.saved && <div className="mt-3 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800">✓ Branding enregistre.</div>}

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">URL du logo</label>
            <input
              type="url"
              value={props.logoUrl}
              onChange={(e) => props.onChangeLogoUrl(e.target.value)}
              placeholder="https://votre-site.fr/logo.png"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Coller l&apos;URL publique d&apos;un logo deja heberge (https uniquement).
              Idealement un PNG transparent ou SVG, 200×80 px.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium">Couleur d&apos;accent</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={safeAccent}
                onChange={(e) => props.onChangeAccent(e.target.value)}
                className="h-10 w-12 cursor-pointer rounded-md border border-border"
              />
              <input
                type="text"
                value={props.accentColor}
                onChange={(e) => props.onChangeAccent(e.target.value)}
                placeholder="#1E40AF"
                maxLength={7}
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Format hex 6 chars (#RRGGBB). Utilise pour les boutons et separateurs.</p>
          </div>

          <div>
            <label className="block text-sm font-medium">Message de signature</label>
            <input
              type="text"
              value={props.signature}
              onChange={(e) => props.onChangeSignature(e.target.value)}
              placeholder="Prenez soin de vous, Dr X"
              maxLength={120}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-0.5 text-[10px] text-muted-foreground">Apparait en bas de chaque newsletter. Max 120 caracteres.</p>
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="show-logo"
              checked={props.showLogo}
              onChange={(e) => props.onToggleShowLogo(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="show-logo" className="text-xs text-muted-foreground">
              Afficher le logo dans l&apos;en-tete de la newsletter
            </label>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-4">
          <h3 className="text-sm font-semibold">Aperçu</h3>
          <div className="mt-3 rounded-md border border-border bg-background p-3">
            <div
              style={{
                borderTop: `4px solid ${safeAccent}`,
                paddingTop: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {showPreview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={safeLogo} alt="logo cabinet" style={{ height: 40, maxWidth: 160 }} />
              ) : (
                <div style={{ height: 40, width: 40, background: safeAccent, borderRadius: 6 }} />
              )}
              <div>
                <div style={{ fontWeight: 600 }}>Votre cabinet</div>
                <div style={{ fontSize: 11, color: '#666' }}>Service de prevention dentaire</div>
              </div>
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: '#444' }}>
              <p>Bonjour, voici votre article de prevention de la semaine...</p>
            </div>
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid #eee',
                fontSize: 10,
                color: '#666',
              }}
            >
              {props.signature || 'Dr X — Votre praticien'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CadenceSectionProps {
  frequency: NewsletterCadence['frequency'] | '';
  day: number | '';
  hour: number | '';
  dayOptions: Array<{ value: number; label: string }>;
  saving: boolean;
  saved: boolean;
  error: string | null;
  onChangeFrequency: (f: NewsletterCadence['frequency'] | '') => void;
  onChangeDay: (v: number | '') => void;
  onChangeHour: (v: number | '') => void;
  onSave: () => void;
  onClear: () => void;
  hasExisting: boolean;
}

function CadenceSection(props: CadenceSectionProps) {
  const canSave = props.frequency !== '' && props.day !== '' && props.hour !== '';
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" /> Cadence newsletter
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Choisit quand envoyer automatiquement. Utilise par le bouton « Programmer » du composer
            (propose 3 prochaines occurrences) et par le futur cron d&apos;envoi automatique.
          </p>
        </div>
        <div className="flex gap-2">
          {props.hasExisting && (
            <button
              onClick={props.onClear}
              disabled={props.saving}
              className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              Supprimer
            </button>
          )}
          <button
            onClick={props.onSave}
            disabled={props.saving || !canSave}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {props.saving ? 'Enregistrement...' : props.hasExisting ? 'Mettre à jour' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {props.error && <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{props.error}</div>}
      {props.saved && <div className="mt-3 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800">✓ Cadence mise à jour.</div>}

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium">Fréquence</label>
          <select
            value={props.frequency}
            onChange={(e) => props.onChangeFrequency(e.target.value as NewsletterCadence['frequency'] | '')}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Choisir…</option>
            <option value="weekly">{FREQUENCY_LABELS.weekly}</option>
            <option value="biweekly">{FREQUENCY_LABELS.biweekly}</option>
            <option value="monthly">{FREQUENCY_LABELS.monthly}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">
            {props.frequency === 'monthly' ? 'Quantieme du mois' : 'Jour de la semaine'}
          </label>
          <select
            value={props.day === '' ? '' : String(props.day)}
            onChange={(e) => props.onChangeDay(e.target.value === '' ? '' : Number(e.target.value))}
            disabled={props.frequency === ''}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">{props.frequency === '' ? 'Choisir d\'abord la fréquence' : 'Choisir…'}</option>
            {props.dayOptions.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Heure d&apos;envoi (heure Paris)</label>
          <select
            value={props.hour === '' ? '' : String(props.hour)}
            onChange={(e) => props.onChangeHour(e.target.value === '' ? '' : Number(e.target.value))}
            disabled={props.frequency === ''}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">Choisir…</option>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}h00
              </option>
            ))}
          </select>
        </div>
      </div>

      {!props.hasExisting && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Astuce : laissez vide si vous preferez programmer manuellement chaque envoi a la date/heure de votre choix.
        </p>
      )}
    </div>
  );
}

function SubscriptionSection({ subscription: _subscription }: { subscription: Props['subscription'] }) {
  /*
   * 2026-07-07 14h (Tartrinator) — Demande Paul : un seul abonnement
   * (pas de Free vs Pro vs Cabinet) et gratuit pour l'instant. Cette section
   * affiche donc juste un bandeau "inclus dans l'acces beta", sans CTA Stripe.
   * L'objet subscription reste recu pour eviter un changement de Props cote
   * page.tsx (mieux pour le diff), mais n'est plus utilise.
   *
   * Quand le plan payant sera active : reintroduire un seul plan via Stripe.
   */
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h2 className="text-sm font-semibold">Abonnement</h2>
      <p className="mt-2 text-sm">
        Pendant la phase de lancement, l&apos;acc&egrave;s &agrave; Sensident
        est <span className="font-semibold">gratuit pour tous les praticiens</span>.
        Vous b&eacute;n&eacute;ficiez de l&apos;int&eacute;gralit&eacute; des fonctionnalit&eacute;s
        (biblioth&egrave;que, composer de newsletters, engagement, analytics) sans limite.
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        Un seul abonnement sera propos&eacute; lors du passage en version commerciale.
        Vous serez pr&eacute;venu &agrave; l&apos;avance et aucune fonctionnalit&eacute; ne sera
        supprim&eacute;e sans pr&eacute;avis.
      </p>
    </div>
  );
}

function VerifyMfaInput({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [code, setCode] = useState('');
  return (
    <div className="mt-4 flex gap-2">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="000000"
        className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-center text-lg tracking-widest"
      />
      <button
        onClick={() => onSubmit(code)}
        disabled={code.length !== 6}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        Valider
      </button>
    </div>
  );
}
