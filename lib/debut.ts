/**
 * Quand commence un événement, pour le compte à rebours de l'accueil.
 *
 * `events.day` est du texte libre (« Samedi 03 octobre ») et `hours` aussi
 * (« 21:00 → 02:00 », « 21h »). Le tournoi jumeau, lui, porte une vraie date :
 * on la prend d'abord. Sinon on lit le jour et l'heure ; si on n'y arrive pas,
 * pas de minuteur — mieux vaut rien qu'un compte faux.
 */

const MOIS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];

const sansAccents = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Douala vit à UTC+1 toute l'année : pas d'heure d'été à gérer. */
const DECALAGE_MS = 60 * 60 * 1000;

export function lireDebut(day: string, hours: string, maintenant = new Date()): Date | null {
  const jour = sansAccents(day).match(/(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?/);
  if (!jour) return null;
  const mois = MOIS.findIndex((m) => jour[2].startsWith(m.slice(0, 4)));
  if (mois < 0) return null;
  const heure = sansAccents(hours).match(/(\d{1,2})\s*[:h]\s*(\d{2})?/);
  const h = heure ? Number(heure[1]) : 0;
  const min = heure?.[2] ? Number(heure[2]) : 0;

  const an = jour[3] ? Number(jour[3]) : new Date(maintenant.getTime() + DECALAGE_MS).getUTCFullYear();
  const date = (a: number) => new Date(Date.UTC(a, mois, Number(jour[1]), h, min) - DECALAGE_MS);
  let debut = date(an);
  // Sans année écrite : une date passée de plus de deux mois est celle de l'an prochain.
  if (!jour[3] && maintenant.getTime() - debut.getTime() > 60 * 86_400_000) debut = date(an + 1);
  return Number.isNaN(debut.getTime()) ? null : debut;
}
