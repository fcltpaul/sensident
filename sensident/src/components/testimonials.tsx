import { Quote } from 'lucide-react';

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  city: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'Mes patients arrivent au rendez-vous en ayant déjà compris leur traitement. Je gagne 5 minutes par séance, et je vois la différence sur l\'observance.',
    name: 'Dr Marion Vasseur',
    role: 'Chirurgienne-dentiste',
    city: 'Lyon',
  },
  {
    quote:
      'Le format est exactement ce que je cherchais : un article court, signé de mon nom, qui sort de mon cabinet sans que j\'aie à lever le petit doigt. 3 minutes par mois, c\'est tenable.',
    name: 'Dr Théo Lemoine',
    role: 'Dentiste libéral',
    city: 'Nantes',
  },
  {
    quote:
      'Côté RGPD, j\'étais réticente. Finalement tout est tracé, le patient consent à chaque finalité séparément, et l\'audit log me rassure pour mes obligations déontologiques.',
    name: 'Dr Camille Bertin',
    role: 'Chirurgienne-dentiste',
    city: 'Bordeaux',
  },
];

const LOGOS = [
  { label: 'Cabinet Dentaire Vasseur', city: 'Lyon' },
  { label: 'Cabinet Lemoine & Associés', city: 'Nantes' },
  { label: 'Espace Dentaire Bertin', city: 'Bordeaux' },
];

/**
 * Bloc témoignages + logos cabinets (boucle UX 5.2).
 * Placeholders à remplacer par vrais assets quand dispos (photos, logos).
 */
export function SocialProof() {
  return (
    <section className="border-y border-border bg-muted/10">
      <div className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700 text-center mb-3">
          Ils nous font confiance
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 leading-tight">
          Ce que disent les praticiens qui l&apos;utilisent
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
            >
              <Quote className="h-5 w-5 text-blue-600" aria-hidden={true} />
              <blockquote className="text-sm leading-relaxed text-foreground">
                &laquo;&nbsp;{t.quote}&nbsp;&raquo;
              </blockquote>
              <figcaption className="mt-auto border-t border-border pt-3 text-xs">
                <p className="font-semibold text-foreground">{t.name}</p>
                <p className="text-muted-foreground">
                  {t.role} · {t.city}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-8">
          <p className="text-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
            Cabinets pilotes
          </p>
          <div className="grid grid-cols-3 gap-3">
            {LOGOS.map((l) => (
              <div
                key={l.label}
                className="flex h-20 items-center justify-center rounded-md border border-dashed border-border bg-background px-3 text-center"
                aria-label={`${l.label} — ${l.city}`}
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground/80">{l.label}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {l.city}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Logos placeholder — remplacés par les visuels définitifs dès validation.
          </p>
        </div>
      </div>
    </section>
  );
}