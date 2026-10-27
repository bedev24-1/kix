import "server-only";
import { revalidatePath as revaliderNext } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, matchOfficials, matches, tournamentMatches, tournamentPlayers, tournaments } from "@/db";
import { notify, uid } from "@/lib/domain";
import { nomDuDuel } from "@/lib/double";
import { nomDuTour } from "@/lib/bracket";
import { nomDeLaPoule } from "@/lib/poules";

/**
 * Un duel de tournoi et sa feuille de match.
 *
 * Le duel se joue sur une table, arbitré coup par coup sur la feuille 8-ball
 * (le même outil que les matchs de salle et les défis) : c'est elle qui
 * alimente la Barre du direct. Quand le match s'achève, son score remonte
 * tout seul au tableau — avis aux joueurs, arbitre suivant, titre.
 */

/** Rafraîchir une page ; sans effet hors d'une requête (script, tâche de fond). */
function revalidatePath(chemin: string, genre?: "layout" | "page") {
  try {
    revaliderNext(chemin, genre);
  } catch {
    /* hors requête : rien à rafraîchir */
  }
}

/** Enregistrer le score d'un duel (sans contrôle d'accès : l'appelant l'a fait). */
export async function enregistrerResultatDuel(duelId: string, scoreA: number, scoreB: number) {
  const duel = (await db.select().from(tournamentMatches).where(eq(tournamentMatches.id, duelId)).limit(1))[0];
  if (!duel) return { ok: false as const, error: "Duel introuvable." };
  const { noterResultat, getTournamentById } = await import("@/lib/tournaments");
  const avis = await import("@/lib/tournoi-avis");
  const arbitrage = await import("@/lib/tournoi-arbitrage");
  const pretsAvant = await avis.duelsPrets(duel.tournamentId);
  const res = await noterResultat(duelId, scoreA, scoreB);
  if (!res.ok) return res;
  // L'arbitre est libre : les duels prêts sont confiés (et leurs joueurs appelés).
  await arbitrage.apresResultat(duel.tournamentId);
  // Les deux joueurs apprennent le résultat et la suite ; un prochain duel encore sans arbitre est annoncé.
  await avis.avisApresResultat(duelId, pretsAvant);

  // Le tournoi a pu se refermer sur ce résultat : on prévient le champion.
  const apres = await getTournamentById(duel.tournamentId);
  if (apres?.status === "termine" && apres.winnerId) {
    await notify(apres.winnerId, `Titre · ${apres.title}`, "Tu remportes le tournoi. Les points de classement sont crédités.", "reward", `/app/tournois/${apres.slug}`);
  }
  if (apres) revalidatePath(`/app/tournois/${apres.slug}`);
  revalidatePath("/gerant/tournois", "layout");
  revalidatePath("/admin/tournois", "layout");
  revalidatePath("/app/classement");
  return res;
}

/** Le duel joué par ce match, s'il y en a un. */
export async function duelDeLaFeuille(matchId: string) {
  return (await db.select().from(tournamentMatches).where(eq(tournamentMatches.matchId, matchId)).limit(1))[0] ?? null;
}

/**
 * Le match d'un duel vient de s'achever : son score remonte au tableau.
 * Sans effet si ce n'est pas un duel, s'il est déjà noté, ou si le score
 * n'atteint pas la course (match arrêté avant la fin) — l'organisateur
 * le saisit alors à la main.
 */
export async function reporterAuTournoi(matchId: string): Promise<{ ok: boolean; error?: string } | null> {
  const duel = await duelDeLaFeuille(matchId);
  if (!duel || duel.status === "termine" || !duel.playerAId || !duel.playerBId) return null;
  const m = (await db.select().from(matches).where(eq(matches.id, matchId)).limit(1))[0];
  if (!m || m.status !== "done") return null;
  const joueurs = await db
    .select({ id: tournamentPlayers.id, userId: tournamentPlayers.userId })
    .from(tournamentPlayers)
    .where(eq(tournamentPlayers.tournamentId, duel.tournamentId));
  const compteA = joueurs.find((j) => j.id === duel.playerAId)?.userId;
  const [scoreA, scoreB] = compteA === m.playerAId ? [m.scoreA, m.scoreB] : [m.scoreB, m.scoreA];
  const res = await enregistrerResultatDuel(duel.id, scoreA, scoreB);
  // Match arrêté avant la course : le duel redevient « à saisir » pour l'organisateur.
  if (!res.ok) await db.update(tournamentMatches).set({ status: "attente" }).where(eq(tournamentMatches.id, duel.id));
  return res;
}

/**
 * La feuille d'un duel : la retrouver, ou la créer (le match en direct, sa
 * course, ses joueurs, son arbitre). Contrôle d'accès à la charge de l'appelant.
 */
export async function feuilleDuDuel(duelId: string, parId: string): Promise<{ ok: true; matchId: string } | { ok: false; error: string }> {
  const duel = (await db.select().from(tournamentMatches).where(eq(tournamentMatches.id, duelId)).limit(1))[0];
  if (!duel) return { ok: false, error: "Duel introuvable." };
  const t = (await db.select().from(tournaments).where(eq(tournaments.id, duel.tournamentId)).limit(1))[0];
  if (!t) return { ok: false, error: "Tournoi introuvable." };
  if (t.status !== "encours") return { ok: false, error: "Le tournoi n'est pas lancé." };
  if (duel.status === "termine" || duel.status === "exempt") return { ok: false, error: "Ce duel est déjà joué." };
  if (!duel.playerAId || !duel.playerBId) return { ok: false, error: "Ce duel attend encore ses deux joueurs." };

  if (duel.matchId) {
    const deja = (await db.select({ id: matches.id, status: matches.status }).from(matches).where(eq(matches.id, duel.matchId)).limit(1))[0];
    if (deja && deja.status !== "cancelled") return { ok: true, matchId: deja.id };
  }
  if (!t.venueId) return { ok: false, error: "Le tournoi n'a pas de salle : choisis-la dans ses réglages." };

  const joueurs = await db
    .select({ id: tournamentPlayers.id, userId: tournamentPlayers.userId })
    .from(tournamentPlayers)
    .where(and(eq(tournamentPlayers.tournamentId, t.id)));
  const a = joueurs.find((j) => j.id === duel.playerAId)?.userId;
  const b = joueurs.find((j) => j.id === duel.playerBId)?.userId;
  if (!a || !b) return { ok: false, error: "Joueurs introuvables." };

  const tours = (await db.select({ round: tournamentMatches.round }).from(tournamentMatches).where(and(eq(tournamentMatches.tournamentId, t.id), eq(tournamentMatches.stage, "tableau"))))
    .reduce((m, r) => Math.max(m, r.round), 0);
  const phase = duel.stage === "poule" ? `Poule ${nomDeLaPoule(duel.groupe ?? 1)}` : nomDuDuel(duel, tours, nomDuTour);

  const matchId = uid();
  await db.insert(matches).values({
    id: matchId,
    venueId: t.venueId,
    eventId: t.eventId,
    kind: t.discipline,
    target: duel.raceTo,
    playerAId: a,
    playerBId: b,
    turnId: a,
    label: `${t.title} · ${phase}`.slice(0, 120),
    status: "scheduled",
    startsAt: new Date(),
    createdBy: parId,
  });
  await db.update(tournamentMatches).set({ matchId, status: "encours" }).where(eq(tournamentMatches.id, duel.id));
  // L'arbitre du duel tient la feuille.
  if (duel.refereeId) {
    await db.insert(matchOfficials).values({ id: uid(), matchId, userId: duel.refereeId, role: "referee", createdBy: parId });
  }
  revalidatePath(`/app/tournois/${t.slug}`);
  revalidatePath("/gerant/live");
  return { ok: true, matchId };
}
