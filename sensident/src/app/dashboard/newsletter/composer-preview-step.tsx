'use client';

interface Props {
  previewHtml: string;
  subject: string;
  onChangeSubject: (s: string) => void;
  onBack: () => void;
  onNext: () => void;
}

/**
 * Étape 3 : aperçu iframe + édition du sujet de l'email.
 */
export function PreviewStep({ previewHtml, subject, onChangeSubject, onBack, onNext }: Props) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium">Sujet de l'email</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => onChangeSubject(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="rounded-md border border-border bg-white">
        <iframe srcDoc={previewHtml} className="h-96 w-full rounded-md" title="Aperçu" />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="rounded-md border border-border px-4 py-2 text-sm"
        >
          Précédent
        </button>
        <button
          onClick={onNext}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Continuer : envoi
        </button>
      </div>
    </>
  );
}
