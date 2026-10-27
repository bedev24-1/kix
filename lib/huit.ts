/**
 * Le 8-ball (billard américain), coup par coup.
 *
 * La console d'arbitrage ne demande plus seulement « qui a gagné la partie ? » :
 * elle suit la manche comme l'arbitre la voit — la casse, la table ouverte,
 * qui prend les pleines (1 à 7) et qui prend les rayées (9 à 15), les billes
 * qui tombent, la main qui passe, les fautes et la bille en main, et enfin la
 * noire. Chaque coup est un geste ; ce fichier dit ce qu'il change.
 *
 * Pur : ni base, ni serveur, ni React. La console, le serveur et les tests
 * appliquent exactement la même règle.
 *
 * Règle suivie (WPA, adaptée à l'usage des salles) :
 *  - une bille légalement empochée laisse la main ; un raté, une sécurité ou
 *    une faute la passe ;
 *  - après une faute, l'adversaire a la bille en main ;
 *  - la table reste ouverte jusqu'à la première bille légalement empochée
 *    après la casse (les billes de la casse n'attribuent pas les groupes) ;
 *  - la noire gagne la manche si le joueur a fini son groupe et la met sans
 *    faute ; elle la perd si elle tombe trop tôt, sur une faute ou dans la
 *    mauvaise poche ;
 *  - noire à la casse : la salle choisit (gagner la manche, ou la replacer).
 */

export type Cote = "A" | "B";
export type Groupe = "pleines" | "rayees";
export type ReglesCasse = "alternee" | "gagnant";

export const PLEINES = [1, 2, 3, 4, 5, 6, 7] as const;
export const RAYEES = [9, 10, 11, 12, 13, 14, 15] as const;
export const NOIRE = 8;

export const FAUTES = {
  blanche: "Blanche empochée",
  mauvaise_bille: "Mauvaise bille touchée en premier",
  aucune_bille: "Aucune bille touchée",
  bande: "Aucune bande après le contact",
  sortie: "Bille sortie de la table",
  double: "Double touche / queue poussée",
  contact: "Bille touchée à la main ou au vêtement",
} as const;
export type Faute = keyof typeof FAUTES;

export type Etat8 = {
  manche: number;
  casseur: Cote;
  main: Cote;
  phase: "casse" | "jeu";
  /** Les groupes, une fois la table fermée. */
  groupes: { A: Groupe | null; B: Groupe | null };
  empochees: number[];
  billeEnMain: boolean;
  regle: ReglesCasse;
  /** Le dernier coup, en clair, pour la frise et l'écran. */
  dernier: string;
};

export type Coup =
  | { type: "casse"; empochees: number[]; faute?: boolean }
  | { type: "empoche"; billes: number[] }
  | { type: "rate" }
  | { type: "securite" }
  | { type: "faute"; faute: Faute; billes?: number[] }
  | { type: "noire"; legale: boolean; motif?: string }
  | { type: "noire_casse"; gagne: boolean };

export type Resultat = {
  etat: Etat8;
  /** La manche est finie : qui la gagne. */
  gagnant?: Cote;
  /** Ce qu'on écrit dans la frise du match. */
  evenement: { kind: "break" | "pot" | "foul" | "safety" | "note" | "rack"; qui: Cote; detail: string };
};

export const autre = (c: Cote): Cote => (c === "A" ? "B" : "A");
export const groupeDe = (bille: number): Groupe | null =>
  bille >= 1 && bille <= 7 ? "pleines" : bille >= 9 && bille <= 15 ? "rayees" : null;
export const NOMS_GROUPES: Record<Groupe, string> = { pleines: "pleines", rayees: "rayées" };

export function etatInitial(casseur: Cote = "A", regle: ReglesCasse = "alternee"): Etat8 {
  return {
    manche: 1, casseur, main: casseur, phase: "casse",
    groupes: { A: null, B: null }, empochees: [], billeEnMain: false, regle,
    dernier: "Casse à venir",
  };
}

/** Lire un état stocké (jsonb) sans faire confiance à sa forme. */
export function lireEtat8(brut: unknown, defaut: Etat8 = etatInitial()): Etat8 {
  const e = (brut ?? {}) as Partial<Etat8>;
  if (!e || typeof e !== "object" || !e.casseur) return defaut;
  const cote = (c: unknown): Cote => (c === "B" ? "B" : "A");
  const grp = (g: unknown): Groupe | null => (g === "pleines" || g === "rayees" ? g : null);
  return {
    manche: Math.max(1, Number(e.manche) || 1),
    casseur: cote(e.casseur),
    main: cote(e.main),
    phase: e.phase === "jeu" ? "jeu" : "casse",
    groupes: { A: grp(e.groupes?.A), B: grp(e.groupes?.B) },
    empochees: Array.isArray(e.empochees) ? [...new Set(e.empochees.map(Number).filter((n) => n >= 1 && n <= 15 && n !== NOIRE))] : [],
    billeEnMain: !!e.billeEnMain,
    regle: e.regle === "gagnant" ? "gagnant" : "alternee",
    dernier: typeof e.dernier === "string" ? e.dernier.slice(0, 120) : "",
  };
}

/** Combien de billes de son groupe il reste au joueur (7 tant que la table est ouverte). */
export function restantes(e: Etat8, c: Cote): number {
  const g = e.groupes[c];
  if (!g) return 7;
  const billes: readonly number[] = g === "pleines" ? PLEINES : RAYEES;
  return billes.filter((b) => !e.empochees.includes(b)).length;
}

/** Le joueur peut-il viser la noire ? */
export const surLaNoire = (e: Etat8, c: Cote) => e.groupes[c] !== null && restantes(e, c) === 0;

const liste = (b: number[]) => b.sort((x, y) => x - y).join(", ");

/** La manche suivante : on remet les billes, et la casse suit la règle choisie. */
export function mancheSuivante(e: Etat8, gagnant: Cote): Etat8 {
  const casseur = e.regle === "gagnant" ? gagnant : autre(e.casseur);
  return { ...etatInitial(casseur, e.regle), manche: e.manche + 1, dernier: `Manche ${e.manche + 1} · casse` };
}

/**
 * Appliquer un coup. Lève une Error lisible si le coup n'a pas de sens
 * (empocher une bille déjà empochée, jouer la noire avant la casse…).
 */
export function jouer(e: Etat8, coup: Coup): Resultat {
  const qui = e.main;
  const nouvelles = (billes: number[] = []) => {
    const n = [...new Set(billes.map(Number))].filter((b) => b >= 1 && b <= 15 && b !== NOIRE);
    const deja = n.filter((b) => e.empochees.includes(b));
    if (deja.length) throw new Error(`Bille déjà empochée : ${liste(deja)}.`);
    return n;
  };

  switch (coup.type) {
    case "casse": {
      if (e.phase !== "casse") throw new Error("La casse a déjà eu lieu.");
      const b = nouvelles(coup.empochees);
      const etat: Etat8 = {
        ...e, phase: "jeu", empochees: [...e.empochees, ...b],
        // Casse avec faute (blanche) : main à l'adversaire, bille en main.
        // Casse légale avec bille empochée : le casseur continue, table ouverte.
        main: coup.faute || b.length === 0 ? autre(qui) : qui,
        billeEnMain: !!coup.faute,
        dernier: coup.faute ? "Faute à la casse : bille en main" : b.length ? `Casse : ${b.length} bille(s), table ouverte` : "Casse sans bille",
      };
      return { etat, evenement: { kind: coup.faute ? "foul" : "break", qui, detail: etat.dernier + (b.length ? ` (${liste(b)})` : "") } };
    }

    case "noire_casse": {
      if (e.phase !== "casse") throw new Error("Ce n'est pas la casse.");
      if (coup.gagne) {
        return { etat: { ...e, dernier: "Noire à la casse" }, gagnant: qui, evenement: { kind: "rack", qui, detail: "Noire à la casse : manche gagnée" } };
      }
      const etat = { ...e, phase: "jeu" as const, dernier: "Noire à la casse, replacée : table ouverte" };
      return { etat, evenement: { kind: "break", qui, detail: etat.dernier } };
    }

    case "empoche": {
      if (e.phase === "casse") throw new Error("Commence par la casse.");
      const b = nouvelles(coup.billes);
      if (!b.length) throw new Error("Touche les billes empochées.");
      const groupes = { ...e.groupes };
      if (!groupes[qui]) {
        // Table ouverte : la première bille légalement empochée attribue le groupe.
        const g = groupeDe(b[0])!;
        groupes[qui] = g;
        groupes[autre(qui)] = g === "pleines" ? "rayees" : "pleines";
      } else {
        const mien = groupes[qui];
        const hors = b.filter((x) => groupeDe(x) !== mien);
        // Une bille adverse tombée en même temps qu'une des siennes n'est pas une faute ;
        // empocher seulement des billes adverses, si (c'est un raté au mieux).
        if (hors.length === b.length) throw new Error(`Ce ne sont pas ses billes (${NOMS_GROUPES[mien!]}). Utilise « Raté » ou « Faute ».`);
      }
      const etat: Etat8 = {
        ...e, groupes, empochees: [...e.empochees, ...b], billeEnMain: false,
        dernier: `Empoche ${liste(b)}${!e.groupes[qui] ? ` · prend les ${NOMS_GROUPES[groupes[qui]!]}` : ""}`,
      };
      return { etat, evenement: { kind: "pot", qui, detail: etat.dernier } };
    }

    case "rate":
    case "securite": {
      if (e.phase === "casse") throw new Error("Commence par la casse.");
      const etat = { ...e, main: autre(qui), billeEnMain: false, dernier: coup.type === "rate" ? "Raté : la main passe" : "Sécurité : la main passe" };
      return { etat, evenement: { kind: coup.type === "rate" ? "note" : "safety", qui, detail: etat.dernier } };
    }

    case "faute": {
      const b = nouvelles(coup.billes);
      // Les billes tombées pendant une faute restent dans les poches.
      const etat: Etat8 = {
        ...e, phase: "jeu", empochees: [...e.empochees, ...b], main: autre(qui), billeEnMain: true,
        dernier: `Faute : ${FAUTES[coup.faute]} · bille en main`,
      };
      return { etat, evenement: { kind: "foul", qui, detail: etat.dernier } };
    }

    case "noire": {
      if (e.phase === "casse") throw new Error("Commence par la casse.");
      const pret = surLaNoire(e, qui);
      const gagne = coup.legale && pret;
      const motif = !coup.legale
        ? coup.motif || "noire avec faute ou dans la mauvaise poche"
        : "noire empochée avant la fin de son groupe";
      return {
        etat: { ...e, dernier: gagne ? "Noire : manche gagnée" : `Noire perdante : ${motif}` },
        gagnant: gagne ? qui : autre(qui),
        evenement: { kind: "rack", qui, detail: gagne ? "Noire empochée : manche gagnée" : `Manche perdue : ${motif}` },
      };
    }
  }
}
