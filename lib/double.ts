import { nombreDeTours, premierTour, taillePlateau, type Place } from "@/lib/bracket";

/**
 * La double élimination, comme sur Challonge.
 *
 * Deux arbres : le tableau principal, où une défaite fait descendre, et le
 * tableau des perdants, où une seconde défaite élimine. Le vainqueur de
 * chacun se retrouve en grande finale ; si celui qui vient des perdants
 * l'emporte, chacun a perdu une fois et une seconde finale décide.
 *
 * Chaque duel dit où va son vainqueur et où va son perdant : le moteur n'a
 * plus à deviner, il suit les fils. Les exemptions (tableaux qui ne tombent
 * pas sur une puissance de deux, 24 joueurs par exemple) se propagent par
 * ces mêmes fils.
 */

export type Etape = "tableau" | "perdants" | "finale";
export type Cote = "a" | "b";
export type Cle = string;

export type Noeud = {
  cle: Cle;
  stage: Etape;
  round: number;
  slot: number;
  a: Place;
  b: Place;
  /** Côté vide d'office : une exemption, pas un joueur à venir. */
  videA: boolean;
  videB: boolean;
  versGagnant: { cle: Cle; cote: Cote } | null;
  versPerdant: { cle: Cle; cote: Cote } | null;
};

export const cle = (stage: Etape, round: number, slot: number): Cle => `${stage}:${round}:${slot}`;

/** Le nombre de tours du tableau des perdants. */
export const toursPerdants = (toursPrincipal: number) => Math.max(0, 2 * (toursPrincipal - 1));

/** Combien de duels compte un tour du tableau des perdants. */
export const duelsDuTourPerdants = (taille: number, round: number) => taille / 2 ** (Math.ceil(round / 2) + 1);

export function plateauDouble(joueurs: (string | null)[], taille = taillePlateau(joueurs.length)): Noeud[] {
  if (taille < 2) return [];
  const k = nombreDeTours(taille);
  const L = toursPerdants(k);
  const noeuds = new Map<Cle, Noeud>();
  const vide = (stage: Etape, round: number, slot: number): Noeud => ({
    cle: cle(stage, round, slot),
    stage,
    round,
    slot,
    a: null,
    b: null,
    videA: false,
    videB: false,
    versGagnant: null,
    versPerdant: null,
  });

  // Tableau principal : les mêmes têtes de série qu'en simple élimination.
  for (const d of premierTour(joueurs, taille)) {
    noeuds.set(cle("tableau", 1, d.slot), { ...vide("tableau", 1, d.slot), a: d.a, b: d.b, videA: !d.a, videB: !d.b });
  }
  for (let r = 2; r <= k; r++) for (let s = 0; s < taille / 2 ** r; s++) noeuds.set(cle("tableau", r, s), vide("tableau", r, s));
  for (let r = 1; r <= L; r++) for (let s = 0; s < duelsDuTourPerdants(taille, r); s++) noeuds.set(cle("perdants", r, s), vide("perdants", r, s));
  noeuds.set(cle("finale", 1, 0), vide("finale", 1, 0));
  noeuds.set(cle("finale", 2, 0), vide("finale", 2, 0));

  const n = (c: Cle) => noeuds.get(c)!;

  for (let r = 1; r <= k; r++) {
    const combien = taille / 2 ** r;
    for (let s = 0; s < combien; s++) {
      const d = n(cle("tableau", r, s));
      // Le vainqueur monte ; celui de la finale du principal va en grande finale.
      d.versGagnant = r < k ? { cle: cle("tableau", r + 1, Math.floor(s / 2)), cote: s % 2 === 0 ? "a" : "b" } : { cle: cle("finale", 1, 0), cote: "a" };
      // Le perdant descend. Au premier tour, deux perdants voisins se
      // retrouvent ; ensuite il rejoint un survivant du tableau des perdants,
      // en ordre inversé un tour sur deux pour éviter les revanches immédiates.
      if (L === 0) d.versPerdant = { cle: cle("finale", 1, 0), cote: "b" };
      else if (r === 1) d.versPerdant = { cle: cle("perdants", 1, Math.floor(s / 2)), cote: s % 2 === 0 ? "a" : "b" };
      else {
        const tour = 2 * (r - 1);
        const slot = r % 2 === 0 ? combien - 1 - s : s;
        d.versPerdant = { cle: cle("perdants", tour, slot), cote: "b" };
      }
    }
  }

  for (let r = 1; r <= L; r++) {
    for (let s = 0; s < duelsDuTourPerdants(taille, r); s++) {
      const d = n(cle("perdants", r, s));
      if (r === L) d.versGagnant = { cle: cle("finale", 1, 0), cote: "b" };
      else if (r % 2 === 1) d.versGagnant = { cle: cle("perdants", r + 1, s), cote: "a" };
      else d.versGagnant = { cle: cle("perdants", r + 1, Math.floor(s / 2)), cote: s % 2 === 0 ? "a" : "b" };
    }
  }

  return [...noeuds.values()];
}

/**
 * L'ordre de jeu, et donc la numérotation, de Challonge : principal 1,
 * perdants 1, puis pour chaque tour suivant du principal, ce tour et les
 * deux tours des perdants qu'il alimente ; la grande finale à la fin.
 */
export function ordreDeJeu(d: { stage: string; round: number }): number {
  if (d.stage === "finale") return 10_000 + d.round * 100;
  if (d.stage === "tableau") return d.round === 1 ? 0 : (d.round - 1) * 300 + 100;
  // perdants : le tour 1 suit le premier tour du principal, le tour 2r-2 et
  // 2r-1 suivent le tour r du principal.
  if (d.round === 1) return 50;
  const r = Math.floor(d.round / 2) + 1;
  return (r - 1) * 300 + 100 + (d.round % 2 === 0 ? 100 : 200);
}

/** Le nom d'un duel de phase finale, tel qu'on l'annonce. */
export function nomDuDuel(d: { stage: string; round: number }, toursPrincipal: number, nomDuTour: (r: number, t: number) => string): string {
  if (d.stage === "finale") return d.round === 1 ? "Grande finale" : "Grande finale · revanche";
  if (d.stage === "perdants") {
    return d.round === toursPerdants(toursPrincipal) ? "Finale des perdants" : `Perdants · tour ${d.round}`;
  }
  return nomDuTour(d.round, toursPrincipal);
}
