import "server-only";
import { nomDuTour } from "@/lib/bracket";
import { nomDuDuel } from "@/lib/double";
import { nomDeLaPoule, type ResultatPoule } from "@/lib/poules";
import type { LignePoule, DuelDePoule, LigneProgramme } from "@/components/tournoi/Poules";
import type { TournamentMatch } from "@/db";

/**
 * De quoi la base porte à ce que l'écran montre.
 *
 * Deux pages affichent les mêmes tableaux — la fiche publique et la console
 * de l'organisateur. Sans ce module, la conversion serait écrite deux fois et
 * finirait par diverger sur un détail que personne ne remarquerait avant une
 * finale.
 */

export type Noms = Map<string, { nom: string; seed: number | null; userId: string }>;

const quiEst = (noms: Noms, id: string | null) => (id ? (noms.get(id)?.nom ?? "—") : "à désigner");

export function vuesDesPoules(
  classements: ResultatPoule[][],
  noms: Noms,
  qualifiesParPoule: number,
): LignePoule[][] {
  return classements.map((lignes) =>
    lignes.map((l, rang) => ({
      ...l,
      nom: noms.get(l.playerId)?.nom ?? "—",
      seed: noms.get(l.playerId)?.seed ?? null,
      userId: noms.get(l.playerId)?.userId ?? null,
      qualifie: rang < qualifiesParPoule,
    })),
  );
}

export function vuesDesDuelsDePoule(duels: TournamentMatch[], noms: Noms): DuelDePoule[] {
  return duels.map((d) => ({
    id: d.id,
    groupe: d.groupe ?? 1,
    nomA: quiEst(noms, d.playerAId),
    nomB: quiEst(noms, d.playerBId),
    scoreA: d.scoreA,
    scoreB: d.scoreB,
    raceTo: d.raceTo,
    termine: d.status === "termine",
    gagnantA: d.winnerId !== null && d.winnerId === d.playerAId,
  }));
}

/**
 * Le programme complet, poules et tableau mêlés.
 *
 * L'étiquette dit d'où vient le duel — « Poule B », « Quarts » : c'est la
 * seule information qui manque quand on mélange les deux phases.
 */
export function programme(
  duels: TournamentMatch[],
  noms: Noms,
  tours: number,
): { aVenir: LigneProgramme[]; joues: LigneProgramme[] } {
  const ligne = (d: TournamentMatch): LigneProgramme => ({
    id: d.id,
    quand: d.stage === "poule" ? `Poule ${nomDeLaPoule(d.groupe ?? 1)}` : nomDuDuel(d, tours, nomDuTour),
    nomA: quiEst(noms, d.playerAId),
    nomB: quiEst(noms, d.playerBId),
    scoreA: d.scoreA,
    scoreB: d.scoreB,
    raceTo: d.raceTo,
    termine: d.status === "termine",
    gagnantA: d.winnerId !== null && d.winnerId === d.playerAId,
  });

  const jouables = duels.filter((d) => d.status !== "exempt");
  return {
    aVenir: jouables.filter((d) => d.status !== "termine" && d.playerAId && d.playerBId).map(ligne),
    joues: jouables.filter((d) => d.status === "termine").map(ligne),
  };
}
