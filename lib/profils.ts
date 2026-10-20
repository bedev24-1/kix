/**
 * Les profils spéciaux : ce qu'ils coûtent, ce qu'ils ouvrent.
 *
 * Un abonnement au mois, sans renouvellement automatique — comme le reste :
 * au Cameroun le paiement mobile se valide à chaque fois. L'arbitre passe
 * d'abord par la validation de l'administration : on ne confie pas une
 * feuille de match à quelqu'un qu'on ne connaît pas.
 */
export type TypeProfil = "pro" | "arbitre";

export const PROFILS: Record<
  TypeProfil,
  { nom: string; prix: number; jours: number; validation: boolean; avantages: string[] }
> = {
  pro: {
    nom: "Joueur pro",
    prix: 5000,
    jours: 30,
    validation: false,
    avantages: ["Badge PRO sur ton profil", "Badge PRO à côté de ton nom dans les poules et l'arbre des tournois"],
  },
  arbitre: {
    nom: "Arbitre",
    prix: 2000,
    jours: 30,
    validation: true,
    avantages: ["Désignable sur les duels des tournois", "Saisie des scores depuis ton téléphone", "Classement des arbitres"],
  },
};

export const lireType = (v: unknown): TypeProfil | null => (v === "pro" || v === "arbitre" ? v : null);

/** Un profil en vigueur : actif, et pas échu. */
export const enVigueur = (p: { status: string; actifJusqu: Date | null } | null | undefined) =>
  Boolean(p && p.status === "actif" && (!p.actifJusqu || new Date(p.actifJusqu).getTime() > Date.now()));

/** La nouvelle échéance : on prolonge depuis la fin en cours, pas depuis aujourd'hui. */
export function prolongerProfil(actuelle: Date | null | undefined, jours: number): Date {
  const depart = actuelle && new Date(actuelle).getTime() > Date.now() ? new Date(actuelle) : new Date();
  return new Date(depart.getTime() + jours * 86_400_000);
}
