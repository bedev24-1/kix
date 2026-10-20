/**
 * Le sexe d'un joueur, et ce qu'il ouvre comme tableaux.
 *
 * Un tableau « Dames » n'accepte que des joueuses, « Hommes » que des
 * joueurs ; un mixte accepte les deux, dans la limite des places réservées à
 * chacun. Sans sexe déclaré, on ne peut pas trancher : on le demande.
 */
export type Sexe = "homme" | "femme";

export const SEXES: Record<Sexe, string> = { homme: "Homme", femme: "Femme" };

export const lireSexe = (v: unknown): Sexe | null => (v === "homme" || v === "femme" ? v : null);

/** Le sexe qu'exige une catégorie, ou null si elle est ouverte à tous. */
export function sexeExige(category: string): Sexe | null {
  if (category === "hommes") return "homme";
  if (category === "dames") return "femme";
  return null;
}

/** Une catégorie qui a besoin de connaître le sexe du candidat. */
export const categorieSexuee = (category: string) => category === "hommes" || category === "dames" || category === "mixte";

/** Pourquoi ce joueur ne peut pas entrer dans ce tableau, ou null s'il le peut. */
export function refusDeSexe(category: string, sexe: string | null): string | null {
  if (!categorieSexuee(category)) return null;
  const s = lireSexe(sexe);
  if (!s) return "Ce tableau dépend du sexe des joueurs : indique le tien dans ton profil (onglet Profil), puis reviens.";
  const exige = sexeExige(category);
  if (exige && exige !== s) return exige === "femme" ? "Ce tableau est réservé aux dames." : "Ce tableau est réservé aux hommes.";
  return null;
}

/** Les places du sexe de ce joueur dans un mixte, ou null si pas de quota. */
export const placesPour = (t: { category: string; placesHommes: number; placesDames: number }, sexe: Sexe) =>
  t.category !== "mixte" ? null : (sexe === "homme" ? t.placesHommes : t.placesDames) || null;
