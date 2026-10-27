import "server-only";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db, matchOfficials, tournamentMatches, tournamentPlayers, tournaments, users } from "@/db";
import { notify } from "@/lib/domain";

/**
 * L'attribution des arbitres d'un tournoi.
 *
 * Un duel ne se joue pas sans arbitre. Dès qu'il est prêt (ses deux joueurs
 * connus), il est confié à un arbitre libre de la liste du tournoi : celui
 * qui en a le moins arbitré, pour partager la soirée, et jamais l'un des deux
 * joueurs. L'arbitre suit son duel jusqu'au résultat, puis reçoit le suivant.
 * Sans arbitre libre, le duel attend son tour.
 *
 * Les arbitres sont ceux de l'événement : un même arbitre sert les tableaux
 * frères d'une affiche (hommes, dames), et n'en tient qu'un à la fois.
 */

type Tournoi = typeof tournaments.$inferSelect;

/** L'affiche et ses tableaux frères : la liste d'arbitres et les duels qu'ils tiennent. */
async function famille(t: Tournoi) {
  const principalId = t.parentId ?? t.id;
  const freres = await db
    .select()
    .from(tournaments)
    .where(or(eq(tournaments.id, principalId), eq(tournaments.parentId, principalId)));
  const eventId = t.eventId ?? freres.find((f) => f.id === principalId)?.eventId ?? null;
  return { eventId, ids: freres.map((f) => f.id) };
}

/** Les arbitres annoncés pour l'affiche. */
export async function arbitresDuTournoi(t: Tournoi) {
  const { eventId } = await famille(t);
  if (!eventId) return [];
  return db
    .select({ id: users.id, nom: users.name })
    .from(matchOfficials)
    .innerJoin(users, eq(users.id, matchOfficials.userId))
    .where(and(eq(matchOfficials.eventId, eventId), eq(matchOfficials.role, "referee")));
}

/**
 * Confier à un arbitre libre chaque duel prêt qui n'en a pas.
 * Appelé au lancement, après chaque résultat, et quand la liste des arbitres change.
 * Renvoie les duels attribués.
 */
export async function attribuerLesArbitres(tournamentId: string): Promise<string[]> {
  const t = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1))[0];
  if (!t || t.status !== "encours") return [];
  const arbitres = await arbitresDuTournoi(t);
  if (!arbitres.length) return [];
  const { ids } = await famille(t);

  // Ce que chacun tient déjà, sur toute l'affiche.
  const tenus = await db
    .select({ refereeId: tournamentMatches.refereeId, status: tournamentMatches.status })
    .from(tournamentMatches)
    .where(and(inArray(tournamentMatches.tournamentId, ids), sql`${tournamentMatches.refereeId} is not null`));
  const occupe = new Set(tenus.filter((d) => d.status === "attente" || d.status === "encours").map((d) => d.refereeId!));
  const faits = new Map<string, number>();
  for (const d of tenus) if (d.status === "termine") faits.set(d.refereeId!, (faits.get(d.refereeId!) ?? 0) + 1);

  // Les duels prêts sans arbitre, dans l'ordre du programme.
  const prets = await db
    .select()
    .from(tournamentMatches)
    .where(
      and(
        eq(tournamentMatches.tournamentId, tournamentId),
        eq(tournamentMatches.status, "attente"),
        sql`${tournamentMatches.refereeId} is null`,
        sql`${tournamentMatches.playerAId} is not null and ${tournamentMatches.playerBId} is not null`,
      ),
    );
  const ordre = { poule: 0, tableau: 1, perdants: 2, finale: 3 } as Record<string, number>;
  prets.sort((a, b) => a.round - b.round || (ordre[a.stage] ?? 9) - (ordre[b.stage] ?? 9) || (a.groupe ?? 0) - (b.groupe ?? 0) || a.slot - b.slot);
  if (!prets.length) return [];

  // Les comptes des joueurs : un arbitre ne tient pas le duel où il joue.
  const comptes = new Map(
    (
      await db
        .select({ id: tournamentPlayers.id, userId: tournamentPlayers.userId })
        .from(tournamentPlayers)
        .where(eq(tournamentPlayers.tournamentId, tournamentId))
    ).map((p) => [p.id, p.userId]),
  );

  const attribues: string[] = [];
  for (const d of prets) {
    const joueurs = [comptes.get(d.playerAId!), comptes.get(d.playerBId!)];
    const libre = arbitres
      .filter((a) => !occupe.has(a.id) && !joueurs.includes(a.id))
      .sort((a, b) => (faits.get(a.id) ?? 0) - (faits.get(b.id) ?? 0) || a.nom.localeCompare(b.nom))[0];
    if (!libre) continue;
    // Écrit seulement si personne ne l'a désigné entre-temps.
    const pose = await db
      .update(tournamentMatches)
      .set({ refereeId: libre.id })
      .where(and(eq(tournamentMatches.id, d.id), sql`${tournamentMatches.refereeId} is null`))
      .returning({ id: tournamentMatches.id });
    if (!pose.length) continue;
    occupe.add(libre.id);
    attribues.push(d.id);
    await notify(
      libre.id,
      `À toi d'arbitrer · ${t.title}`,
      `Un duel t'est confié${d.tableLabel ? ` · table ${d.tableLabel}` : ""}. Suis-le jusqu'au bout et saisis le score depuis la page du tournoi.`,
      "event",
      `/app/tournois/${t.slug}`,
    );
  }

  // Les joueurs de ces duels sont appelés : leur arbitre les attend.
  if (attribues.length) {
    const { avisDuelAppele } = await import("@/lib/tournoi-avis");
    for (const id of attribues) await avisDuelAppele(id);
  }
  return attribues;
}

/** Un arbitre quitte la liste : ses duels non joués sont rendus, puis redistribués. */
export async function liberer(tournamentId: string, userId: string) {
  const t = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1))[0];
  if (!t) return;
  const { ids } = await famille(t);
  await db
    .update(tournamentMatches)
    .set({ refereeId: null })
    .where(
      and(
        inArray(tournamentMatches.tournamentId, ids),
        eq(tournamentMatches.refereeId, userId),
        inArray(tournamentMatches.status, ["attente", "encours"]),
      ),
    );
  for (const id of ids) await attribuerLesArbitres(id);
}

/** Après un résultat sur l'un des tableaux : l'arbitre redevient libre, sur toute l'affiche. */
export async function apresResultat(tournamentId: string) {
  const t = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1))[0];
  if (!t) return;
  const { ids } = await famille(t);
  for (const id of ids) await attribuerLesArbitres(id);
}
