import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, streams, tournamentMatches, tournaments } from "@/db";
import { getMatch, getMatchEvents, matchSignature } from "@/lib/live";
import { chronoReste, lireEtat8, restantes, surLaNoire, type Cote } from "@/lib/huit";
import { nomDuDuel } from "@/lib/double";
import { nomDuTour } from "@/lib/bracket";
import { nomDeLaPoule } from "@/lib/poules";

/**
 * L'état de la Barre Master Break : tout ce que montrent l'incrustation OBS,
 * le lecteur de l'app et la feuille d'arbitre, en un seul objet. Il vient de
 * la feuille d'arbitre — personne ne retape le score.
 */
export type { EtatBarre, JoueurBarre } from "@/lib/barre-types";
import type { EtatBarre, JoueurBarre } from "@/lib/barre-types";

/** Le duel de tournoi joué par ce match, avec son tournoi. */
async function duelDuMatch(matchId: string) {
  const r = (
    await db
      .select({ duel: tournamentMatches, tournoi: tournaments })
      .from(tournamentMatches)
      .innerJoin(tournaments, eq(tournaments.id, tournamentMatches.tournamentId))
      .where(eq(tournamentMatches.matchId, matchId))
      .limit(1)
  )[0];
  if (!r) return null;
  const tours = Number(
    (
      await db
        .select({ max: sql<number>`coalesce(max(${tournamentMatches.round}), 0)` })
        .from(tournamentMatches)
        .where(and(eq(tournamentMatches.tournamentId, r.tournoi.id), eq(tournamentMatches.stage, "tableau")))
    )[0]?.max ?? 0,
  );
  const tour = r.duel.stage === "poule" ? `Poule ${nomDeLaPoule(r.duel.groupe ?? 1)}` : nomDuDuel(r.duel, tours, nomDuTour);
  return { titre: r.tournoi.title, tour, table: r.duel.tableLabel || null };
}

/** Le direct rattaché à ce match (le plus récent). */
export async function directDuMatch(matchId: string) {
  return (
    await db.select().from(streams).where(eq(streams.matchId, matchId)).orderBy(desc(streams.updatedAt)).limit(1)
  )[0] ?? null;
}

export async function etatBarre(matchId: string): Promise<EtatBarre | null> {
  const card = await getMatch(matchId);
  if (!card) return null;
  const { match } = card;
  const [events, duel, direct] = await Promise.all([getMatchEvents(matchId), duelDuMatch(matchId), directDuMatch(matchId)]);
  const maintenant = Date.now();

  const a: JoueurBarre = { id: card.a.id, nom: card.a.name, avatar: card.a.avatar };
  const b: JoueurBarre = { id: card.b.id, nom: card.b.name, avatar: card.b.avatar };
  const nom = (c: Cote) => (c === "A" ? a.nom : b.nom);

  const suivi = match.kind === "8-ball" && Boolean((match.etat8 as { casseur?: string } | null)?.casseur);
  const e = suivi ? lireEtat8(match.etat8) : null;
  const huit = e
    ? {
        manche: e.manche,
        casseur: e.casseur,
        main: e.main,
        phase: e.phase,
        groupes: e.groupes,
        empochees: e.empochees,
        restantes: { A: restantes(e, "A"), B: restantes(e, "B") },
        surLaNoire: { A: surLaNoire(e, "A"), B: surLaNoire(e, "B") },
        billeEnMain: e.billeEnMain,
        dernier: e.dernier,
      }
    : null;
  const chrono =
    e && e.chrono.duree
      ? {
          duree: e.chrono.duree,
          fin: e.chrono.depart !== null ? e.chrono.depart + (e.chrono.duree + e.chrono.bonus) * 1000 : null,
          reste: e.chrono.depart !== null ? null : chronoReste(e.chrono, maintenant),
          ext: e.chrono.ext,
        }
      : null;

  let annonce: string | null = null;
  if (match.status === "done") {
    const gagnant = match.winnerId === a.id ? a.nom : match.winnerId === b.id ? b.nom : null;
    annonce = gagnant ? `Victoire · ${gagnant}` : "Match terminé";
  } else if (match.status === "live" && e) {
    if (e.phase === "casse") annonce = `Casse · ${nom(e.casseur)}`;
    else if (e.billeEnMain) annonce = `Bille en main · ${nom(e.main)}`;
    else if (surLaNoire(e, e.main)) annonce = `Sur la noire · ${nom(e.main)}`;
  }

  const cote = (playerId: string | null): Cote | null => (playerId === match.playerAId ? "A" : playerId === match.playerBId ? "B" : null);
  const moments = events
    .filter((x) => x.detail && x.detail !== "Coup annulé par l'arbitre")
    .slice(0, 12)
    .map((x) => ({ id: x.id, at: x.createdAt.toISOString(), texte: x.detail, kind: x.kind, cote: cote(x.playerId) }));

  return {
    id: match.id,
    status: match.status,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    target: match.target,
    turnId: match.turnId,
    winnerId: match.winnerId,
    a,
    b,
    huit,
    chrono,
    maintenant,
    contexte: {
      titre: duel?.titre ?? null,
      tour: duel?.tour ?? null,
      salle: card.venue.name,
      table: duel?.table ?? card.table,
      label: match.label,
    },
    sponsor: direct?.sponsor ?? "",
    direct: direct?.status === "live",
    barreVideo: direct?.barreVideo ?? false,
    annonce,
    moments,
  };
}

/** L'empreinte de la barre : le match, et son direct (statut, partenaire). */
export async function signatureBarre(matchId: string): Promise<string> {
  const [m, d] = await Promise.all([matchSignature(matchId), directDuMatch(matchId)]);
  return `${m}:${d ? `${d.status}:${d.updatedAt.getTime()}` : ""}`;
}
