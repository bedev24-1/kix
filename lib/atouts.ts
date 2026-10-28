/**
 * Les atouts d'un article, cochés par le vendeur : une liste fermée, pour que
 * chaque promesse affichée sur la fiche ait un sens précis (et un pictogramme)
 * plutôt qu'un texte libre qui dirait n'importe quoi. `icone` désigne une
 * icône du jeu maison (components/icons), jamais un emoji.
 */
export const ATOUTS = {
  pros: { label: "Choix des pros", icone: "award" },
  echange: { label: "Échange 7 jours", icone: "swap" },
  scelle: { label: "Scellé d'origine", icone: "lock" },
  garantie: { label: "Garantie 3 mois", icone: "shield" },
  neuf: { label: "Neuf, jamais servi", icone: "spark" },
} as const;

export type Atout = keyof typeof ATOUTS;

export const estAtout = (x: unknown): x is Atout => typeof x === "string" && x in ATOUTS;

/** Une ligne de fiche technique : « Batterie » → « 1000 mAh ». */
export type Spec = { l: string; v: string };

/**
 * La fiche technique saisie par le vendeur, une ligne par caractéristique :
 * « Batterie : 1000 mAh ». Une ligne sans deux-points est ignorée.
 */
export function lireSpecs(texte: string): Spec[] {
  return texte
    .split(/\r?\n/)
    .map((ligne) => {
      const i = ligne.indexOf(":");
      if (i <= 0) return null;
      const l = ligne.slice(0, i).trim().slice(0, 40);
      const v = ligne.slice(i + 1).trim().slice(0, 80);
      return l && v ? { l, v } : null;
    })
    .filter((s): s is Spec => s !== null)
    .slice(0, 12);
}

export const ecrireSpecs = (specs: Spec[]) => specs.map((s) => `${s.l} : ${s.v}`).join("\n");
