/**
 * Sensident — utilitaires pour la cadence d'envoi newsletter.
 *
 * Sert à :
 *  - calculer la "prochaine occurrence", la suivante et celle d'apres a partir
 *    d'une cadence { frequency, sendDay, sendHour } (Europe/Paris, fuseau du praticien)
 *  - aider le composant composer send-step a proposer 3 boutons intelligents
 *  - aider l'API send a decaler les newsletters deja programmees en cas de
 *    collision
 *
 * Regles :
 *  - weekly   : sendDay = 0..6 (0=dim, ..., 6=sam)
 *  - biweekly : idem, decale de 14 jours a chaque pas
 *  - monthly  : sendDay = 1..28, on conserve le quantieme (annees bissextiles OK)
 *  - sendHour : 0..23
 *  - Reference timezone : Europe/Paris (le praticien en France metropole).
 *    Pour le MVP on neglige DOM-TOM (ces praticiens utilisent deja Europe/Paris
 *    pour leurs RDV ; les conversions complexes arrivent en P3).
 */

export type CadenceFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface Cadence {
  frequency: CadenceFrequency;
  sendDay: number; // 0..6 (hebdo/biweekly) ou 1..28 (mensuel)
  sendHour: number; // 0..23
}

const PARIS_TZ = 'Europe/Paris';
const PARIS_FORMATTER_DATE = new Intl.DateTimeFormat('fr-FR', {
  timeZone: PARIS_TZ,
  weekday: 'long',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Renvoie les N prochaines occurrences (Date[]) d'apres la cadence en TZ Europe/Paris,
 * strictement superieures a `from` (egalite exclue pour eviter programmer dans le passe
 * pile a la minute).
 */
export function nextOccurrences(cadence: Cadence, count: number, from: Date = new Date()): Date[] {
  if (count <= 0) return [];
  const out: Date[] = [];
  // Premiere candidate : la plus proche strictement > from.
  let cursor = new Date(from.getTime());
  let stepCount = 0;
  while (out.length < count && stepCount < 24) {
    const candidate = computeNextFromCursor(cadence, cursor);
    if (candidate.getTime() <= from.getTime()) {
      // Defense en profondeur : si la candidate est <= from, on pousse le cursor
      // au-dela de from et on recommence.
      cursor = new Date(from.getTime() + (out.length + 1) * 24 * 3600 * 1000);
      stepCount++;
      continue;
    }
    out.push(candidate);
    // Decale le cursor juste apres cette candidate pour la prochaine iteration.
    cursor = new Date(candidate.getTime() + 60 * 1000); // +1 minute suffit
    stepCount++;
  }
  return out;
}

/**
 * Calcule l'occurrence suivante >= cursor en tenant compte du fuseau Europe/Paris.
 *
 * Strategie : on travaille en UTC, on regarde le jour local Paris du cursor,
 * on calcule l'ecart en jours jusqu'au prochain sendDay, on fixe l'heure,
 * et on compare au cursor pour choisir la bonne date.
 */
function computeNextFromCursor(cadence: Cadence, cursor: Date): Date {
  const { frequency, sendDay, sendHour } = cadence;

  if (frequency === 'weekly' || frequency === 'biweekly') {
    // 0=dim, 1=lun, ..., 6=sam en JS Date.getDay() (locale),
    // mais on veut strictement 'sendDay' calcule en Europe/Paris.
    const currentParisDay = parisDayOfWeek(cursor); // 0..6 (0=dim comme JS getDay)
    let delta = (sendDay - currentParisDay + 7) % 7;
    let candidateUtc = new Date(cursor.getTime() + delta * 24 * 3600 * 1000);
    // Fixe l'heure locale Paris a sendHour:00
    candidateUtc = setParisHour(candidateUtc, sendHour);

    // Si la candidate est <= cursor (meme journee mais heure passee, ou delai
    // nul sur sendDay), on l'avance d'une semaine.
    if (candidateUtc.getTime() <= cursor.getTime()) {
      candidateUtc = new Date(candidateUtc.getTime() + 7 * 24 * 3600 * 1000);
    }
    return candidateUtc;
  }

  // monthly : sendDay = 1..28, on prend le quantieme du mois courant en Paris.
  const ymd = parisYmdParts(cursor);
  let year = ymd.year;
  let month = ymd.month; // 1..12
  const day = sendDay;

  // Tente le mois courant d'abord
  let candidateUtc = parisDateAt(year, month, day, sendHour);
  if (candidateUtc.getTime() <= cursor.getTime()) {
    // Passe au mois suivant
    month += 1;
    if (month > 12) { month = 1; year += 1; }
    candidateUtc = parisDateAt(year, month, day, sendHour);
  }
  return candidateUtc;
}

/**
 * Lit le jour de la semaine en Europe/Paris (0=dim, 1=lun, ..., 6=sam) d'une Date UTC.
 */
function parisDayOfWeek(d: Date): number {
  // weekday 'long' fr-FR retourne 'lundi', 'mardi', ...
  const w = new Intl.DateTimeFormat('en-US', { timeZone: PARIS_TZ, weekday: 'short' }).format(d);
  // 'Sun','Mon','Tue','Wed','Thu','Fri','Sat' -> 0..6
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[w] ?? 0;
}

/**
 * Renvoie year/month/day en TZ Paris d'un instant UTC.
 */
function parisYmdParts(d: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PARIS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  return { year: get('year'), month: get('month'), day: get('day') };
}

/**
 * Construit une Date UTC qui correspond a l'horodatage [year]-[month]-[day] T [sendHour]:00 en Europe/Paris.
 * On gere le passage a l'heure ete/hiver automatiquement grace au formatter inverse.
 */
function parisDateAt(year: number, month: number, day: number, hour: number): Date {
  // Astuce : on prend un Date UTC avec les memes champs numeriques et on calcule
  // le decalage TZ en faisant la difference entre ce qu'on lit en Paris et ce qu'on a ecrit.
  const naive = new Date(Date.UTC(year, month - 1, day, hour, 0, 0));
  const parisGet = parisYmdParts(naive);
  // Recalcule l'heure en tenant compte du decalage exact
  const expectedParis = { ...parisGet };
  const hourParisParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: PARIS_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(naive);
  const hh = Number(hourParisParts.find((p) => p.type === 'hour')?.value ?? '0');
  const mm = Number(hourParisParts.find((p) => p.type === 'minute')?.value ?? '0');
  const offsetMin = (hour * 60) - (hh * 60 + mm);
  return new Date(naive.getTime() + offsetMin * 60 * 1000);
}

/**
 * Fixe l'heure (minute=0, seconde=0, ms=0) en Europe/Paris sur la date UTC donnee,
 * en preservant le jour Paris.
 */
function setParisHour(d: Date, hour: number): Date {
  const ymdInner = parisYmdParts(d);
  return parisDateAt(ymdInner.year, ymdInner.month, ymdInner.day, hour);
}

/**
 * Formate une date en Europe/Paris au format "lundi 14 juillet 2026 à 09:00".
 */
export function formatParisDateLong(d: Date): string {
  // On formate en deux temps pour avoir le format lisible francais.
  const datePart = new Intl.DateTimeFormat('fr-FR', {
    timeZone: PARIS_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
  const timePart = new Intl.DateTimeFormat('fr-FR', {
    timeZone: PARIS_TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
  return `${datePart} à ${timePart}`.replace('à 00:', 'à 0:');
}

/**
 * Formate une date courte pour affichage compact "lun. 14 juil. 09:00".
 */
export function formatParisDateShort(d: Date): string {
  const datePart = new Intl.DateTimeFormat('fr-FR', {
    timeZone: PARIS_TZ,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(d);
  const timePart = new Intl.DateTimeFormat('fr-FR', {
    timeZone: PARIS_TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
  return `${datePart} ${timePart}`;
}

/**
 * Parse un objet cadence brant depuis la BDD.
 * Renvoie `null` si la cadence est invalide ou 'none' (= praticien sans cadence).
 */
export function parseCadence(value: unknown): Cadence | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (v.frequency === 'none') return null;
  if (v.frequency === 'weekly' || v.frequency === 'biweekly') {
    const sd = typeof v.sendDay === 'number' ? v.sendDay : 1;
    const sh = typeof v.sendHour === 'number' ? v.sendHour : 9;
    if (sd < 0 || sd > 6) return null;
    if (sh < 0 || sh > 23) return null;
    return { frequency: v.frequency, sendDay: sd, sendHour: sh };
  }
  if (v.frequency === 'monthly') {
    const sd = typeof v.sendDay === 'number' ? v.sendDay : 1;
    const sh = typeof v.sendHour === 'number' ? v.sendHour : 9;
    if (sd < 1 || sd > 31) return null;
    if (sh < 0 || sh > 23) return null;
    return { frequency: 'monthly', sendDay: sd, sendHour: sh };
  }
  return null;
}

/**
 * Renvoie la prochaine occurrence de la cadence STRICTEMENT après `after`.
 * Wrapper sur nextOccurrences(1, after)[0] ou null si pas de cadence.
 */
export function nextCadenceOccurrence(cadence: Cadence | null, after: Date): Date | null {
  if (!cadence) return null;
  const occ = nextOccurrences(cadence, 1, after);
  return occ[0] ?? null;
}
