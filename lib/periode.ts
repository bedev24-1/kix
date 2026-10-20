/**
 * Une période lisible : « samedi 7 novembre », « du 7 au 8 novembre »,
 * « du 30 octobre au 2 novembre ». Un tournoi dure souvent plusieurs jours,
 * et n'en montrer que le premier faisait croire qu'il tenait en une soirée.
 */
const TZ = "Africa/Douala";

const cle = (d: Date) => d.toLocaleDateString("fr-CA", { timeZone: TZ }); // 2026-11-07

export function periode(debut: Date | null | undefined, fin?: Date | null, { jourSemaine = false } = {}): string {
  if (!debut) return "Dates à confirmer";
  const d = new Date(debut);
  const f = fin ? new Date(fin) : null;
  const opts = (avec: Intl.DateTimeFormatOptions) =>
    ({ timeZone: TZ, ...(jourSemaine ? { weekday: "long" } : {}), ...avec }) as Intl.DateTimeFormatOptions;

  if (!f || f <= d || cle(f) === cle(d)) {
    return d.toLocaleDateString("fr-FR", opts({ day: "numeric", month: "long" }));
  }
  const memeAnnee = cle(d).slice(0, 4) === cle(f).slice(0, 4);
  const memeMois = memeAnnee && cle(d).slice(0, 7) === cle(f).slice(0, 7);
  const de = d.toLocaleDateString(
    "fr-FR",
    opts(memeMois ? { day: "numeric" } : memeAnnee ? { day: "numeric", month: "long" } : { day: "numeric", month: "long", year: "numeric" }),
  );
  const a = f.toLocaleDateString("fr-FR", opts({ day: "numeric", month: "long", ...(memeAnnee ? {} : { year: "numeric" }) }));
  return `du ${de} au ${a}`;
}

/** L'heure de début, « 16:30 », à l'heure de Douala. */
export const heureDebut = (d: Date | null | undefined) =>
  d ? new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ }) : null;
