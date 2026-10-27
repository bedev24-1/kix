/**
 * Les mots d'un tournoi, sans base de données.
 *
 * Les libellés servent des deux côtés : les consoles d'organisation, rendues
 * sur le serveur, et le formulaire du candidat, rendu dans le navigateur.
 * `lib/tournaments.ts` est marqué `server-only` — ces tables-là ne peuvent
 * donc pas y vivre, sinon le formulaire emporterait la base avec lui.
 */

export const DISCIPLINES: Record<string, string> = {
  "8-ball": "8-ball · rayés ou pleins",
  "9-ball": "9-ball",
  snooker: "Snooker",
  killer: "Killer",
};

/** Comment se joue un tournoi. */
export const FORMATS: Record<string, string> = {
  direct: "Tableau direct, sans poules",
  poules: "Poules puis tableau",
};

/** La phase finale : un seul revers élimine, ou un tableau des perdants offre une seconde chance. */
export const ELIMINATIONS: Record<string, string> = {
  simple: "Élimination simple",
  double: "Double élimination",
};

/** Comment le tournoi se joue, en clair : « Élimination simple », « Poules puis double élimination ». */
export function formule(t: { format: string; elimination: string }): string {
  const fin = ELIMINATIONS[t.elimination] ?? ELIMINATIONS.simple;
  return t.format === "poules" ? `Poules puis ${fin.toLowerCase()}` : fin;
}

/**
 * Pour qui le tableau est ouvert. Un même événement peut en porter plusieurs
 * (« Open hommes · 64 » et « Dames · 24 ») : un tableau, une catégorie.
 */
export const CATEGORIES: Record<string, string> = {
  open: "Open (tous)",
  hommes: "Hommes",
  dames: "Dames",
  mixte: "Mixte",
  juniors: "Juniors",
  veterans: "Vétérans",
};

/** Les tailles de tableau proposées ; toute autre se saisit à la main. */
export const TAILLES = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 256];

/** La plus grande taille acceptée : au-delà, ce n'est plus une salle. */
export const TAILLE_MAX = 512;

export const ETATS: Record<string, string> = {
  brouillon: "Brouillon",
  inscriptions: "Inscriptions ouvertes",
  complet: "Inscriptions closes",
  encours: "En cours",
  termine: "Terminé",
  annule: "Annulé",
};

export const NIVEAUX: Record<string, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  confirme: "Confirmé",
};

/** L'état d'une candidature, tel qu'on l'annonce. */
export const CANDIDATURES: Record<string, string> = {
  candidat: "En attente",
  accepte: "Retenu",
  refuse: "Non retenu",
  retire: "Retiré",
};
