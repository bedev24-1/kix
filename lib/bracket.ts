/**
 * L'arbre d'un tournoi à élimination directe.
 *
 * Trois exigences, qui viennent du billard et non de l'informatique :
 *
 *  · Le tableau a toujours une taille en puissance de deux. Douze inscrits
 *    jouent donc un tableau de seize, où quatre têtes de série passent le
 *    premier tour sans jouer — c'est l'exemption, le « bye ».
 *
 *  · Les exemptions vont aux meilleures têtes de série, jamais au hasard :
 *    récompenser le classement est le sens même d'une tête de série.
 *
 *  · Les deux meilleurs ne doivent pas se croiser avant la finale. D'où
 *    l'appariement 1-16, 8-9, 5-12, 4-13… : à chaque tour, la somme des
 *    rangs d'un duel est constante, et les favoris s'éloignent.
 */

export type Place = { seed: number; playerId: string } | null;

export type Duel = {
  /** 1 = premier tour joué, puis 2, 3… ; la finale porte le numéro le plus haut. */
  round: number;
  /** Position dans le tour, à partir de 0 — elle détermine la suite de l'arbre. */
  slot: number;
  a: Place;
  b: Place;
};

/** La taille du tableau : la puissance de deux qui contient tout le monde. */
export function taillePlateau(joueurs: number): number {
  if (joueurs <= 1) return joueurs === 1 ? 1 : 0;
  let n = 1;
  while (n < joueurs) n *= 2;
  return n;
}

/** Combien de tours pour désigner un vainqueur. */
export const nombreDeTours = (joueurs: number) => Math.max(0, Math.log2(taillePlateau(joueurs)) | 0);

/**
 * L'ordre des rangs sur le tableau, tête de série par tête de série.
 *
 * On construit par doublement : [1, 2] devient [1, 4, 3, 2], puis
 * [1, 8, 5, 4, 3, 6, 7, 2]. À chaque étape, chaque rang r est suivi de son
 * complément (taille + 1 − r) — c'est ce qui garantit que la somme des rangs
 * d'un duel reste constante et que les favoris ne se rencontrent qu'à la fin.
 */
export function ordreDesRangs(taille: number): number[] {
  if (taille < 2) return taille === 1 ? [1] : [];
  let ordre = [1, 2];
  while (ordre.length < taille) {
    const n = ordre.length * 2;
    const suivant: number[] = [];
    for (const rang of ordre) {
      suivant.push(rang, n + 1 - rang);
    }
    ordre = suivant;
  }
  return ordre;
}

/**
 * Le premier tour, exemptions comprises.
 *
 * `joueurs` est donné dans l'ordre des têtes de série : le premier est la
 * tête de série n°1. Un duel dont l'adversaire est absent est une exemption,
 * et son `b` vaut `null`.
 */
export function premierTour(joueurs: (string | null)[], taille = taillePlateau(joueurs.length)): Duel[] {
  if (taille < 2) return [];

  // Un tableau préparé avant la fin des inscriptions a des rangs encore libres :
  // `null` à leur place, et une taille fixée d'avance (les 16 places prévues).
  const ordre = ordreDesRangs(taille);
  const place = (rang: number): Place => {
    const id = joueurs[rang - 1];
    return id ? { seed: rang, playerId: id } : null;
  };

  const duels: Duel[] = [];
  for (let i = 0; i < taille; i += 2) {
    duels.push({ round: 1, slot: i / 2, a: place(ordre[i]), b: place(ordre[i + 1]) });
  }
  return duels;
}

/**
 * Le tableau entier, tours suivants vides.
 *
 * Les tours d'après n'ont pas encore de joueurs : ils se remplissent au fur
 * et à mesure des résultats. Les créer tout de suite permet d'afficher l'arbre
 * complet dès l'ouverture — on voit où mène chaque victoire.
 */
export function plateauComplet(joueurs: (string | null)[], taille = taillePlateau(joueurs.length)): Duel[] {
  if (taille < 2) return [];

  const duels = premierTour(joueurs, taille);
  for (let round = 2; round <= nombreDeTours(taille); round++) {
    const combien = taille / 2 ** round;
    for (let slot = 0; slot < combien; slot++) {
      duels.push({ round, slot, a: null, b: null });
    }
  }
  return duels;
}

/** Où va le vainqueur d'un duel : même arbre, tour suivant, moitié du slot. */
export const duelSuivant = (duel: Pick<Duel, "round" | "slot">) => ({
  round: duel.round + 1,
  slot: Math.floor(duel.slot / 2),
  /** Le vainqueur d'un slot pair prend la place A, un slot impair la place B. */
  cote: duel.slot % 2 === 0 ? ("a" as const) : ("b" as const),
});

/**
 * Le nom d'un tour, vu du nombre de duels qu'il contient.
 *
 * « Seizièmes », « huitièmes », « quarts » : on nomme par ce qui reste, comme
 * partout dans le sport, et non « tour 3 » qui ne dit rien à personne.
 */
export function nomDuTour(round: number, tours: number): string {
  const restants = tours - round; // 0 = finale
  if (restants === 0) return "Finale";
  if (restants === 1) return "Demi-finales";
  if (restants === 2) return "Quarts de finale";
  if (restants === 3) return "Huitièmes de finale";
  if (restants === 4) return "Seizièmes de finale";
  return `${2 ** (restants + 1)}es de finale`;
}

/**
 * Le nombre de parties gagnantes, par tour.
 *
 * Un tournoi en course s'allonge vers la fin : une finale au même format
 * qu'un premier tour se décide sur un coup de chance, ce qu'aucun joueur
 * n'accepte pour un titre. Un tournoi en parties sèches, lui, ne s'allonge
 * jamais : la sèche est la règle du tournoi, pas un raccourci qu'on abandonne
 * en demi-finale.
 */
export function courseDuTour(round: number, tours: number, base: number): number {
  if (base <= 1) return 1; // parties sèches, du premier tour à la finale
  const restants = tours - round;
  if (restants === 0) return base + 2; // finale
  if (restants === 1) return base + 1; // demi-finales
  return base;
}

/** Les points de classement, selon l'endroit où l'on s'arrête. */
export function pointsDeClassement(tourAtteint: number, tours: number, vainqueur: boolean): number {
  if (vainqueur) return 1000;
  const restants = tours - tourAtteint;
  if (restants === 0) return 600; // finaliste
  if (restants === 1) return 360;
  if (restants === 2) return 200;
  if (restants === 3) return 100;
  return 50;
}
