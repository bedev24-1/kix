import "server-only";
import { periode } from "@/lib/periode";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  tournaments,
  tournamentPlayers,
  users,
  venues,
  type Tournament,
  type TournamentMatch,
} from "@/db";
import * as moteur from "@/lib/tournoi-moteur";

export { CANDIDATURES, DISCIPLINES, ETATS, FORMATS, NIVEAUX } from "@/lib/tournois";

/* ------------------------------------------------------------- lectures */

const compteAcceptes = sql<number>`(select count(*) from mb.tournament_players p
                                     where p.tournament_id = mb.tournaments.id
                                       and p.status = 'accepte')`;

const compteCandidats = sql<number>`(select count(*) from mb.tournament_players p
                                      where p.tournament_id = mb.tournaments.id
                                        and p.status = 'candidat')`;

/** L'affiche : tout sauf les brouillons, que seul l'organisateur voit. */
export async function getTournaments(avecBrouillons = false) {
  const q = db
    .select({ tournament: tournaments, venue: venues, acceptes: compteAcceptes, candidats: compteCandidats })
    .from(tournaments)
    .leftJoin(venues, eq(venues.id, tournaments.venueId))
    .orderBy(desc(tournaments.startsAt), desc(tournaments.createdAt));

  return avecBrouillons ? q : q.where(sql`${tournaments.status} <> 'brouillon'`);
}

export async function getTournament(slug: string) {
  const rows = await db
    .select({ tournament: tournaments, venue: venues, acceptes: compteAcceptes, candidats: compteCandidats })
    .from(tournaments)
    .leftJoin(venues, eq(venues.id, tournaments.venueId))
    .where(eq(tournaments.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function getPlayers(tournamentId: string) {
  return db
    .select({ player: tournamentPlayers, user: users })
    .from(tournamentPlayers)
    .innerJoin(users, eq(users.id, tournamentPlayers.userId))
    .where(eq(tournamentPlayers.tournamentId, tournamentId))
    .orderBy(asc(tournamentPlayers.seed), desc(tournamentPlayers.createdAt));
}

export const getBracket = (tournamentId: string) => moteur.getBracket(db, tournamentId);

/** Les duels de poule, dans l'ordre des poules. */
export const getDuelsDePoule = (tournamentId: string) => moteur.duelsDePoule(db, tournamentId);

/** Le classement de chaque poule. */
export const getClassementDesPoules = (tournamentId: string) => moteur.classementDesPoules(db, tournamentId);

export const poulesTerminees = (tournamentId: string) => moteur.poulesTerminees(db, tournamentId);

/** Le tirage des poules, sur la base de l'application. */
export const tirerLesPoules = (tournamentId: string) => moteur.tirerLesPoules(db, tournamentId);

/** L'ouverture du tableau entre les qualifiés. */
export const ouvrirLeTableau = (tournamentId: string) => moteur.ouvrirLeTableau(db, tournamentId);

/** Le tirage au sort du tableau, sur la base de l'application. */
export const tirerLeTableau = (tournamentId: string) => moteur.tirerLeTableau(db, tournamentId);

/** Le résultat d'un duel, sur la base de l'application. */
export const noterResultat = (duelId: string, scoreA: number, scoreB: number) =>
  moteur.noterResultat(db, duelId, scoreA, scoreB);

/* --------------------------------------------------------- côté joueur */

export async function maCandidature(tournamentId: string, userId: string) {
  const rows = await db
    .select()
    .from(tournamentPlayers)
    .where(and(eq(tournamentPlayers.tournamentId, tournamentId), eq(tournamentPlayers.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Les noms des joueurs d'un tableau, pour l'affichage. */
export async function nomsDuTableau(tournamentId: string) {
  const rows = await db
    .select({
      id: tournamentPlayers.id,
      userId: tournamentPlayers.userId,
      nickname: tournamentPlayers.nickname,
      seed: tournamentPlayers.seed,
      nom: users.name,
    })
    .from(tournamentPlayers)
    .innerJoin(users, eq(users.id, tournamentPlayers.userId))
    .where(eq(tournamentPlayers.tournamentId, tournamentId));

  // Le compte est porté avec le nom : c'est lui qui mène au profil, et un
  // nom de tableau sans lien est la première chose qu'on essaie de toucher.
  return new Map(rows.map((r) => [r.id, { nom: r.nickname || r.nom, seed: r.seed, userId: r.userId }]));
}

/** Les tournois auxquels un joueur a postulé, avec l'état de sa candidature. */
export async function getMesTournois(userId: string) {
  return db
    .select({ player: tournamentPlayers, tournament: tournaments, venue: venues })
    .from(tournamentPlayers)
    .innerJoin(tournaments, eq(tournaments.id, tournamentPlayers.tournamentId))
    .leftJoin(venues, eq(venues.id, tournaments.venueId))
    .where(eq(tournamentPlayers.userId, userId))
    .orderBy(desc(tournaments.startsAt), desc(tournamentPlayers.createdAt));
}

export async function getTournamentById(id: string) {
  const rows = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
  return rows[0] ?? null;
}

/* ---------------------------------------------------------- classement */

/**
 * Le classement des joueurs.
 *
 * Les points viennent des parties arbitrées et des tournois ; le palmarès, lui,
 * se compte en titres. Deux joueurs à égalité de points ne se valent pas si
 * l'un a gagné un tournoi — d'où la colonne des titres à côté.
 */
export async function getClassement(limite = 100) {
  const titres = sql<number>`(select count(*) from mb.tournaments t
                               where t.winner_id = mb.users.id and t.status = 'termine')`;
  const tableaux = sql<number>`(select count(*) from mb.tournament_players p
                                 where p.user_id = mb.users.id and p.seed is not null)`;

  return db
    .select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
      points: users.points,
      memberUntil: users.memberUntil,
      titres,
      tableaux,
    })
    .from(users)
    .where(eq(users.role, "client"))
    .orderBy(desc(users.points), asc(users.createdAt))
    .limit(limite);
}

/** Les tournois déjà remportés, pour la vitrine du classement. */
export async function getPalmares(limite = 6) {
  return db
    .select({ tournament: tournaments, venue: venues, champion: users })
    .from(tournaments)
    .leftJoin(venues, eq(venues.id, tournaments.venueId))
    .leftJoin(users, eq(users.id, tournaments.winnerId))
    .where(eq(tournaments.status, "termine"))
    .orderBy(desc(tournaments.startsAt))
    .limit(limite);
}

/* -------------------------------------------------------------- petits */

export const estOuvert = (t: Tournament) => t.status === "inscriptions";

/** Le tour en cours : le premier qui a encore un duel à jouer. */
export function tourEnCours(duels: TournamentMatch[]): number {
  const restants = duels.filter((d) => d.status === "attente" || d.status === "encours");
  return restants.length ? Math.min(...restants.map((d) => d.round)) : Math.max(1, ...duels.map((d) => d.round));
}

/** « du 12 au 14 octobre », ou la seule date quand tout tient en un jour. */
export function duree(t: Tournament): string {
  return periode(t.startsAt, t.endsAt);
}

export { inArray };
