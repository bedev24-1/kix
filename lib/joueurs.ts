import "server-only";
import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import {
  db,
  events,
  friendships,
  matches,
  tickets,
  tournamentPlayers,
  tournaments,
  users,
  venues,
  type User,
} from "@/db";
import { levelFor } from "@/lib/constants";

/**
 * Le profil public d'un joueur.
 *
 * Une salle de billard vit de sa réputation : qui a battu qui, qui a gagné
 * quoi. L'application comptait des points sans jamais montrer à quoi ils
 * correspondaient — on ne pouvait même pas regarder la fiche de son
 * adversaire du soir.
 *
 * Ce qui est public l'est parce qu'il se joue en salle, devant tout le
 * monde : les victoires, le classement, les titres. Le numéro de téléphone,
 * lui, ne l'est jamais — c'est la seule chose qu'on ne devine pas en
 * regardant jouer.
 */

export type Palmares = {
  user: Pick<User, "id" | "name" | "avatar" | "points" | "createdAt" | "code" | "certifie">;
  rang: number;
  matchs: number;
  victoires: number;
  defaites: number;
  manches: number;
  titres: number;
  tableaux: number;
  soirees: number;
};

export async function getJoueur(id: string): Promise<Palmares | null> {
  const compte = (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
  if (!compte || compte.role !== "client") return null;

  const joues = await db
    .select({
      id: matches.id,
      aId: matches.playerAId,
      bId: matches.playerBId,
      scoreA: matches.scoreA,
      scoreB: matches.scoreB,
      winnerId: matches.winnerId,
    })
    .from(matches)
    .where(and(eq(matches.status, "done"), or(eq(matches.playerAId, id), eq(matches.playerBId, id))));

  const victoires = joues.filter((m) => m.winnerId === id).length;
  const manches = joues.reduce((n, m) => n + (m.aId === id ? m.scoreA : m.scoreB), 0);

  const [titres, tableaux, soirees, devant] = await Promise.all([
    compter(db.select({ n: sql<number>`count(*)` }).from(tournaments).where(and(eq(tournaments.winnerId, id), eq(tournaments.status, "termine")))),
    compter(db.select({ n: sql<number>`count(*)` }).from(tournamentPlayers).where(and(eq(tournamentPlayers.userId, id), eq(tournamentPlayers.status, "accepte")))),
    compter(db.select({ n: sql<number>`count(*)` }).from(tickets).where(and(eq(tickets.userId, id), inArray(tickets.status, ["valid", "used"])))),
    compter(
      db
        .select({ n: sql<number>`count(*)` })
        .from(users)
        .where(and(eq(users.role, "client"), sql`${users.points} > ${compte.points}`)),
    ),
  ]);

  return {
    user: {
      id: compte.id,
      name: compte.name,
      avatar: compte.avatar,
      points: compte.points,
      createdAt: compte.createdAt,
      code: compte.code,
      certifie: compte.certifie,
    },
    rang: devant + 1,
    matchs: joues.length,
    victoires,
    defaites: joues.length - victoires,
    manches,
    titres,
    tableaux,
    soirees,
  };
}

const compter = async (q: Promise<{ n: number }[]>) => Number((await q)[0]?.n ?? 0);

/** Les dernières rencontres d'un joueur, avec l'adversaire et le lieu. */
export async function derniersMatchs(id: string, limite = 8) {
  const rows = await db
    .select({ match: matches, venue: venues })
    .from(matches)
    .leftJoin(venues, eq(venues.id, matches.venueId))
    .where(and(eq(matches.status, "done"), or(eq(matches.playerAId, id), eq(matches.playerBId, id))))
    .orderBy(desc(matches.createdAt))
    .limit(limite);

  const adversaires = [...new Set(rows.map((r) => (r.match.playerAId === id ? r.match.playerBId : r.match.playerAId)))];
  const noms = adversaires.length
    ? await db.select({ id: users.id, name: users.name, avatar: users.avatar }).from(users).where(inArray(users.id, adversaires))
    : [];
  const par = new Map(noms.map((n) => [n.id, n]));

  return rows.map(({ match, venue }) => {
    const chezA = match.playerAId === id;
    const adverse = chezA ? match.playerBId : match.playerAId;
    return {
      id: match.id,
      quand: match.createdAt,
      adversaire: par.get(adverse) ?? { id: adverse, name: "Joueur", avatar: null },
      pour: chezA ? match.scoreA : match.scoreB,
      contre: chezA ? match.scoreB : match.scoreA,
      gagne: match.winnerId === id,
      venue: venue?.name ?? null,
      kind: match.kind,
    };
  });
}

/** Les tournois d'un joueur, et jusqu'où il est allé. */
export async function tournoisDuJoueur(id: string, limite = 6) {
  return db
    .select({ player: tournamentPlayers, tournament: tournaments, venue: venues })
    .from(tournamentPlayers)
    .innerJoin(tournaments, eq(tournaments.id, tournamentPlayers.tournamentId))
    .leftJoin(venues, eq(venues.id, tournaments.venueId))
    .where(and(eq(tournamentPlayers.userId, id), ne(tournamentPlayers.status, "retire")))
    .orderBy(desc(tournaments.startsAt))
    .limit(limite);
}

/** Les soirées auxquelles il est allé — celles dont le billet a été scanné. */
export async function soireesDuJoueur(id: string, limite = 6) {
  return db
    .select({ event: events, ticket: tickets })
    .from(tickets)
    .innerJoin(events, eq(events.id, tickets.eventId))
    .where(and(eq(tickets.userId, id), inArray(tickets.status, ["valid", "used"])))
    .orderBy(desc(tickets.createdAt))
    .limit(limite);
}

/* ------------------------------------------------------------- badges */

export type Badge = { cle: string; nom: string; detail: string; obtenu: boolean };

/**
 * Les badges.
 *
 * Chacun se déduit de ce que le joueur a réellement fait : aucun n'est
 * attribué à la main, aucun ne se stocke. Un badge qui se donne n'en est pas
 * un — et une table de badges se serait désynchronisée du premier match
 * corrigé.
 */
export function badgesDe(p: Palmares): Badge[] {
  const { current } = levelFor(p.user.points);
  const ratio = p.matchs > 0 ? p.victoires / p.matchs : 0;

  return [
    { cle: "premier-match", nom: "Première casse", detail: "Un match joué", obtenu: p.matchs >= 1 },
    { cle: "dix-matchs", nom: "Habitué des tables", detail: "Dix matchs joués", obtenu: p.matchs >= 10 },
    { cle: "dix-victoires", nom: "Cogneur", detail: "Dix victoires", obtenu: p.victoires >= 10 },
    { cle: "majorite", nom: "Plus souvent devant", detail: "Plus de victoires que de défaites", obtenu: p.matchs >= 5 && ratio > 0.5 },
    { cle: "tableau", nom: "Homme de tableau", detail: "Un tournoi disputé", obtenu: p.tableaux >= 1 },
    { cle: "titre", nom: "Champion", detail: "Un tournoi remporté", obtenu: p.titres >= 1 },
    { cle: "serie-titres", nom: "Habitué du trophée", detail: "Trois titres", obtenu: p.titres >= 3 },
    { cle: "noctambule", nom: "Noctambule", detail: "Cinq soirées", obtenu: p.soirees >= 5 },
    { cle: "niveau", nom: current.name, detail: `Niveau ${current.level}`, obtenu: current.level > 1 },
  ];
}

/* --------------------------------------------------------------- amis */

export type LienAmitie = "aucun" | "envoyee" | "recue" | "amis" | "refusee";

/** Où en sont deux joueurs l'un avec l'autre. */
export async function lienAvec(moi: string, autre: string): Promise<{ etat: LienAmitie; id?: string }> {
  if (moi === autre) return { etat: "aucun" };
  const rows = await db
    .select()
    .from(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, moi), eq(friendships.addresseeId, autre)),
        and(eq(friendships.requesterId, autre), eq(friendships.addresseeId, moi)),
      ),
    );

  // Une paire ne doit avoir qu'une ligne, et la base l'impose désormais. Mais
  // si deux demandes croisées ont survécu quelque part, c'est l'amitié qui
  // gagne : prendre « la première venue » revenait à proposer « Ajouter en
  // ami » à quelqu'un avec qui on l'est déjà, une fois sur deux.
  const rang = (statut: string) =>
    statut === "acceptee" ? 0 : statut === "attente" ? 1 : statut === "bloquee" ? 2 : 3;
  const lien = [...rows].sort((a, b) => rang(a.status) - rang(b.status))[0];
  if (!lien) return { etat: "aucun" };
  if (lien.status === "acceptee") return { etat: "amis", id: lien.id };
  if (lien.status === "refusee" || lien.status === "bloquee") return { etat: "refusee", id: lien.id };
  return { etat: lien.requesterId === moi ? "envoyee" : "recue", id: lien.id };
}

/** Mes amis, et les demandes en attente dans les deux sens. */
export async function mesAmis(moi: string) {
  const liens = await db
    .select()
    .from(friendships)
    .where(or(eq(friendships.requesterId, moi), eq(friendships.addresseeId, moi)));

  const autres = liens.map((l) => (l.requesterId === moi ? l.addresseeId : l.requesterId));
  const gens = autres.length
    ? await db
        .select({ id: users.id, name: users.name, avatar: users.avatar, points: users.points })
        .from(users)
        .where(inArray(users.id, autres))
    : [];
  const par = new Map(gens.map((g) => [g.id, g]));

  const vue = (l: (typeof liens)[number]) => ({
    lien: l,
    autre: par.get(l.requesterId === moi ? l.addresseeId : l.requesterId) ?? null,
  });

  return {
    amis: liens.filter((l) => l.status === "acceptee").map(vue).filter((v) => v.autre),
    recues: liens.filter((l) => l.status === "attente" && l.addresseeId === moi).map(vue).filter((v) => v.autre),
    envoyees: liens.filter((l) => l.status === "attente" && l.requesterId === moi).map(vue).filter((v) => v.autre),
  };
}

/** Les identifiants de mes amis : c'est à eux qu'on annonce mes matchs. */
export async function idsDesAmis(moi: string): Promise<string[]> {
  const liens = await db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "acceptee"),
        or(eq(friendships.requesterId, moi), eq(friendships.addresseeId, moi)),
      ),
    );
  return liens.map((l) => (l.requesterId === moi ? l.addresseeId : l.requesterId));
}

/**
 * Chercher un joueur, par son code à six chiffres ou par son nom.
 *
 * Le code d'abord, et c'est lui qui compte : chercher « Blaise » remonte cinq
 * homonymes, et rien n'oblige quiconque à inscrire son vrai nom. Le code se
 * donne de vive voix à la table et désigne une personne exactement.
 *
 * Jamais par numéro de téléphone : cela permettrait de vérifier si un numéro
 * a un compte chez nous, ce qui n'est l'affaire de personne.
 */
export async function chercherJoueurs(terme: string, saufMoi: string, limite = 12) {
  const propre = terme.trim();

  // Six chiffres : c'est un code, la réponse est unique ou vide.
  if (/^\d{6}$/.test(propre)) {
    return db
      .select({ id: users.id, name: users.name, avatar: users.avatar, points: users.points, code: users.code })
      .from(users)
      .where(and(eq(users.role, "client"), ne(users.id, saufMoi), eq(users.code, propre)))
      .limit(1);
  }

  // Des chiffres, mais pas six : on attend la suite plutôt que de chercher un
  // nom qui n'en est pas un.
  if (/^\d+$/.test(propre)) return [];
  if (propre.length < 2) return [];

  return db
    .select({ id: users.id, name: users.name, avatar: users.avatar, points: users.points, code: users.code })
    .from(users)
    .where(
      and(
        eq(users.role, "client"),
        ne(users.id, saufMoi),
        sql`${users.name} ilike ${"%" + propre.replace(/[%_]/g, "") + "%"}`,
      ),
    )
    .orderBy(desc(users.points))
    .limit(limite);
}
