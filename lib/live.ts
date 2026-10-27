import "server-only";
import { and, desc, eq, inArray, ne, or } from "drizzle-orm";
import {
  challenges,
  db,
  matchEvents,
  matchOfficials,
  matches,
  users,
  venues,
  venueTables,
  type Match,
  type MatchEvent,
  type MatchOfficial,
  type User,
} from "@/db";

/** Master Break Live — lectures des matchs, de leur frise et des statistiques. */

export type Player = Pick<User, "id" | "name" | "avatar" | "points">;

export type MatchCard = {
  match: Match;
  a: Player;
  b: Player;
  venue: { name: string; slug: string };
  table: string | null;
};

const player = {
  id: users.id,
  name: users.name,
  avatar: users.avatar,
  points: users.points,
};

async function hydrate(rows: Match[]): Promise<MatchCard[]> {
  if (rows.length === 0) return [];

  const ids = [...new Set(rows.flatMap((m) => [m.playerAId, m.playerBId]))];
  const venueIds = [...new Set(rows.map((m) => m.venueId))];
  const tableIds = [...new Set(rows.map((m) => m.tableId).filter((x): x is string => Boolean(x)))];

  const [people, halls, tables] = await Promise.all([
    db.select(player).from(users).where(inArray(users.id, ids)),
    db.select({ id: venues.id, name: venues.name, slug: venues.slug }).from(venues).where(inArray(venues.id, venueIds)),
    tableIds.length
      ? db.select({ id: venueTables.id, label: venueTables.label }).from(venueTables).where(inArray(venueTables.id, tableIds))
      : Promise.resolve([]),
  ]);

  const unknown: Player = { id: "", name: "Joueur", avatar: null, points: 0 };
  return rows.map((match) => ({
    match,
    a: people.find((p) => p.id === match.playerAId) ?? unknown,
    b: people.find((p) => p.id === match.playerBId) ?? unknown,
    venue: halls.find((v) => v.id === match.venueId) ?? { name: "Salle", slug: "" },
    table: tables.find((t) => t.id === match.tableId)?.label ?? null,
  }));
}

/** Le hub : ce qui se joue maintenant, ce qui arrive, ce qui vient de finir. */
export async function getLiveBoard(): Promise<{ live: MatchCard[]; soon: MatchCard[]; recent: MatchCard[] }> {
  const [live, soon, recent] = await Promise.all([
    db.select().from(matches).where(eq(matches.status, "live")).orderBy(desc(matches.updatedAt)),
    db.select().from(matches).where(eq(matches.status, "scheduled")).orderBy(matches.startsAt).limit(12),
    db.select().from(matches).where(eq(matches.status, "done")).orderBy(desc(matches.endedAt)).limit(12),
  ]);

  const [l, s, r] = await Promise.all([hydrate(live), hydrate(soon), hydrate(recent)]);
  return { live: l, soon: s, recent: r };
}

export async function getMatch(id: string): Promise<MatchCard | null> {
  const row = (await db.select().from(matches).where(eq(matches.id, id)).limit(1))[0];
  if (!row) return null;
  return (await hydrate([row]))[0] ?? null;
}

export async function getMatchEvents(matchId: string): Promise<MatchEvent[]> {
  return db.select().from(matchEvents).where(eq(matchEvents.matchId, matchId)).orderBy(desc(matchEvents.seq));
}

export type PlayerStats = {
  racks: number;
  breaks: number;
  fouls: number;
  safeties: number;
  pots: number;
  /** Plus longue série de manches gagnées d'affilée. */
  run: number;
};

export type MatchStats = { a: PlayerStats; b: PlayerStats };

const empty = (): PlayerStats => ({ racks: 0, breaks: 0, fouls: 0, safeties: 0, pots: 0, run: 0 });

/**
 * Statistiques d'une rencontre, dérivées de sa frise. Rien n'est stocké en
 * double : le jour où on corrige un événement, les chiffres suivent.
 */
export function computeStats(match: Match, events: MatchEvent[]): MatchStats {
  const stats: MatchStats = { a: empty(), b: empty() };
  const bucket = (playerId: string | null) =>
    playerId === match.playerAId ? stats.a : playerId === match.playerBId ? stats.b : null;

  let streakId: string | null = null;
  let streak = 0;

  // La frise arrive du plus récent au plus ancien : on la remonte à l'endroit.
  for (const event of [...events].sort((x, y) => x.seq - y.seq)) {
    const side = bucket(event.playerId);
    if (!side) continue;

    if (event.kind === "rack") {
      side.racks++;
      streak = event.playerId === streakId ? streak + 1 : 1;
      streakId = event.playerId;
      const owner = bucket(streakId);
      if (owner) owner.run = Math.max(owner.run, streak);
    }
    if (event.kind === "break") side.breaks++;
    if (event.kind === "foul") side.fouls++;
    if (event.kind === "safety") side.safeties++;
    if (event.kind === "pot") side.pots++;
  }

  return stats;
}

export type HeadToHead = { played: number; winsA: number; winsB: number; last: MatchCard[] };

/** Historique des confrontations entre deux joueurs. */
export async function getHeadToHead(aId: string, bId: string, exclude?: string): Promise<HeadToHead> {
  const rows = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.status, "done"),
        or(
          and(eq(matches.playerAId, aId), eq(matches.playerBId, bId)),
          and(eq(matches.playerAId, bId), eq(matches.playerBId, aId)),
        ),
        exclude ? ne(matches.id, exclude) : undefined,
      ),
    )
    .orderBy(desc(matches.endedAt))
    .limit(10);

  return {
    played: rows.length,
    winsA: rows.filter((m) => m.winnerId === aId).length,
    winsB: rows.filter((m) => m.winnerId === bId).length,
    last: await hydrate(rows.slice(0, 5)),
  };
}

export type Form = { wins: number; losses: number; last: ("W" | "L")[] };

/** Forme récente d'un joueur : cinq dernières rencontres, plus récente d'abord. */
export async function getForm(userId: string): Promise<Form> {
  const rows = await db
    .select({ winnerId: matches.winnerId })
    .from(matches)
    .where(
      and(
        eq(matches.status, "done"),
        or(eq(matches.playerAId, userId), eq(matches.playerBId, userId)),
      ),
    )
    .orderBy(desc(matches.endedAt))
    .limit(20);

  const results = rows.map((r) => (r.winnerId === userId ? "W" : "L") as "W" | "L");
  return {
    wins: results.filter((r) => r === "W").length,
    losses: results.filter((r) => r === "L").length,
    last: results.slice(0, 5),
  };
}

/** Les matchs d'une salle, pour la console du gérant et l'écran de la salle. */
export async function getVenueMatches(venueId: string): Promise<MatchCard[]> {
  const rows = await db
    .select()
    .from(matches)
    .where(and(eq(matches.venueId, venueId), inArray(matches.status, ["live", "scheduled"])))
    .orderBy(desc(matches.status), matches.startsAt);
  return hydrate(rows);
}

/** Signature de l'état courant : le flux en direct ne pousse que si elle change. */
export async function liveSignature(): Promise<string> {
  const rows = await db
    .select({ id: matches.id, at: matches.updatedAt })
    .from(matches)
    .where(inArray(matches.status, ["live", "scheduled"]));
  return rows
    .map((r) => `${r.id}:${r.at.getTime()}`)
    .sort()
    .join("|");
}

export async function matchSignature(id: string): Promise<string> {
  const row = (await db.select({ at: matches.updatedAt }).from(matches).where(eq(matches.id, id)).limit(1))[0];
  return row ? String(row.at.getTime()) : "";
}

/* ------------------------------------------------------------- arbitrage */

export type ScoreRight =
  | { ok: true; as: "admin" | "venue" | "official" | "player" }
  | { ok: false; reason: string };

/**
 * Qui a le droit de tenir la feuille de match.
 *
 * Une seule fonction, quatre portes d'entrée, pour qu'il n'y ait jamais deux
 * endroits où l'on décide d'une autorisation :
 *
 *  · la direction, partout ;
 *  · le gérant et l'arbitre rattachés à la salle, sur tous ses matchs ;
 *  · un arbitre habilité pour ce match précis, ou pour le tournoi qui le
 *    contient — c'est la porte des tournois, où l'organisateur distribue les
 *    feuilles sans toucher aux comptes ;
 *  · les deux joueurs eux-mêmes, quand la salle a ouvert l'auto-arbitrage.
 *
 * Un match terminé ou annulé ne se marque plus, quel que soit le titre.
 */
export async function canScore(user: User, match: Match): Promise<ScoreRight> {
  if (match.status === "done") return { ok: false, reason: "Le match est terminé" };
  if (match.status === "cancelled") return { ok: false, reason: "Le match est annulé" };

  if (user.role === "admin") return { ok: true, as: "admin" };

  if ((user.role === "manager" || user.role === "referee") && user.venueId === match.venueId) {
    return { ok: true, as: "venue" };
  }

  const official = (
    await db
      .select({ id: matchOfficials.id })
      .from(matchOfficials)
      .where(
        and(
          eq(matchOfficials.userId, user.id),
          match.eventId
            ? or(eq(matchOfficials.matchId, match.id), eq(matchOfficials.eventId, match.eventId))
            : eq(matchOfficials.matchId, match.id),
        ),
      )
      .limit(1)
  )[0];
  if (official) return { ok: true, as: "official" };

  if (user.id === match.playerAId || user.id === match.playerBId) {
    // Un défi se joue entre deux joueurs, souvent sans arbitre : chacun peut
    // tenir la feuille lui-même. Chaque geste reste signé de son nom.
    const defi = (await db.select({ id: challenges.id }).from(challenges).where(eq(challenges.matchId, match.id)).limit(1))[0];
    if (defi) return { ok: true, as: "player" };
    const venue = (await db.select({ self: venues.selfScoring }).from(venues).where(eq(venues.id, match.venueId)).limit(1))[0];
    if (venue?.self) return { ok: true, as: "player" };
    return { ok: false, reason: "Cette salle n'autorise pas l'auto-arbitrage" };
  }

  return { ok: false, reason: "Tu n'es pas habilité à marquer ce match" };
}

export type OfficialRow = { official: MatchOfficial; user: Player };

/** Les arbitres habilités sur un match, directement ou via son tournoi. */
export async function getOfficials(match: Match): Promise<OfficialRow[]> {
  return db
    .select({ official: matchOfficials, user: player })
    .from(matchOfficials)
    .innerJoin(users, eq(matchOfficials.userId, users.id))
    .where(
      match.eventId
        ? or(eq(matchOfficials.matchId, match.id), eq(matchOfficials.eventId, match.eventId))
        : eq(matchOfficials.matchId, match.id),
    )
    .orderBy(matchOfficials.createdAt);
}

/** Les matchs qu'un compte donné peut marquer en ce moment. */
export async function getScorableMatches(user: User): Promise<MatchCard[]> {
  const open = inArray(matches.status, ["live", "scheduled"]);

  if (user.role === "admin") {
    return hydrate(await db.select().from(matches).where(open).orderBy(desc(matches.status), matches.startsAt));
  }

  if ((user.role === "manager" || user.role === "referee") && user.venueId) {
    return hydrate(
      await db
        .select()
        .from(matches)
        .where(and(open, eq(matches.venueId, user.venueId)))
        .orderBy(desc(matches.status), matches.startsAt),
    );
  }

  const mine = await db
    .select({ matchId: matchOfficials.matchId, eventId: matchOfficials.eventId })
    .from(matchOfficials)
    .where(eq(matchOfficials.userId, user.id));
  if (mine.length === 0) return [];

  const matchIds = mine.map((m) => m.matchId).filter((x): x is string => Boolean(x));
  const eventIds = mine.map((m) => m.eventId).filter((x): x is string => Boolean(x));

  const rows = await db
    .select()
    .from(matches)
    .where(
      and(
        open,
        or(
          matchIds.length ? inArray(matches.id, matchIds) : undefined,
          eventIds.length ? inArray(matches.eventId, eventIds) : undefined,
        ),
      ),
    )
    .orderBy(desc(matches.status), matches.startsAt);

  return hydrate(rows);
}

/** Qui tient la feuille d'un match, nommément. */
export async function arbitresDuMatch(matchId: string) {
  return db
    .select({ id: users.id, name: users.name })
    .from(matchOfficials)
    .innerJoin(users, eq(users.id, matchOfficials.userId))
    .where(eq(matchOfficials.matchId, matchId));
}
