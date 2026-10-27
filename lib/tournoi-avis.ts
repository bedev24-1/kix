import "server-only";
import { and, eq, gt, inArray, lte, sql } from "drizzle-orm";
import { db, rappelsTournoi, tournamentMatches, tournamentPlayers, tournaments, users, venues } from "@/db";
import { notify, uid } from "@/lib/domain";
import { nomDuTour } from "@/lib/bracket";
import { nomDeLaPoule } from "@/lib/poules";

/**
 * Ce que le joueur apprend de son tournoi, sans avoir à rafraîchir la page :
 * son duel est appelé, son résultat et la suite, son prochain adversaire, et
 * les rappels avant le jour J.
 */

type Duel = typeof tournamentMatches.$inferSelect;
type Tournoi = typeof tournaments.$inferSelect;

/** Les joueurs (ligne d'inscription → compte, nom porté au tableau). */
async function joueursDe(ids: (string | null)[]) {
  const propres = ids.filter((x): x is string => Boolean(x));
  if (!propres.length) return new Map<string, { userId: string; nom: string }>();
  const rows = await db
    .select({ id: tournamentPlayers.id, userId: tournamentPlayers.userId, surnom: tournamentPlayers.nickname, nom: users.name })
    .from(tournamentPlayers)
    .innerJoin(users, eq(users.id, tournamentPlayers.userId))
    .where(inArray(tournamentPlayers.id, propres));
  return new Map(rows.map((r) => [r.id, { userId: r.userId, nom: r.surnom || r.nom }]));
}

async function toursDuTableau(tournamentId: string) {
  const r = await db
    .select({ max: sql<number>`coalesce(max(${tournamentMatches.round}), 0)` })
    .from(tournamentMatches)
    .where(and(eq(tournamentMatches.tournamentId, tournamentId), eq(tournamentMatches.stage, "tableau")));
  return Number(r[0]?.max ?? 0);
}

/** « Quart de finale », « Poule B », « Tableau des perdants ». */
function phaseDe(d: Duel, tours: number) {
  if (d.stage === "poule") return `Poule ${nomDeLaPoule(d.groupe ?? 1)}`;
  if (d.stage === "perdants") return "Tableau des perdants";
  if (d.stage === "finale") return d.round === 1 ? "Grande finale" : "Revanche de la grande finale";
  return nomDuTour(d.round, tours);
}

const lien = (t: Tournoi) => `/app/tournois/${t.slug}`;

/** Les duels prêts à jouer (deux joueurs connus, pas encore joués) : pour repérer ceux qui le deviennent. */
export async function duelsPrets(tournamentId: string): Promise<Set<string>> {
  const rows = await db
    .select({ id: tournamentMatches.id })
    .from(tournamentMatches)
    .where(
      and(
        eq(tournamentMatches.tournamentId, tournamentId),
        eq(tournamentMatches.status, "attente"),
        sql`${tournamentMatches.playerAId} is not null and ${tournamentMatches.playerBId} is not null`,
      ),
    );
  return new Set(rows.map((r) => r.id));
}

/**
 * Un duel vient d'être joué : chacun des deux apprend comment ça s'est fini
 * et ce qui l'attend ; ceux dont le duel suivant devient prêt apprennent
 * contre qui ils jouent.
 */
export async function avisApresResultat(duelId: string, pretsAvant: Set<string>) {
  const d = (await db.select().from(tournamentMatches).where(eq(tournamentMatches.id, duelId)).limit(1))[0];
  if (!d || d.status !== "termine" || !d.playerAId || !d.playerBId) return;
  const t = (await db.select().from(tournaments).where(eq(tournaments.id, d.tournamentId)).limit(1))[0];
  if (!t) return;
  const tours = await toursDuTableau(t.id);
  const qui = await joueursDe([d.playerAId, d.playerBId]);
  const a = qui.get(d.playerAId), b = qui.get(d.playerBId);
  if (!a || !b) return;
  const phase = phaseDe(d, tours);

  for (const [moi, lui, mes, ses, gagne] of [
    [a, b, d.scoreA, d.scoreB, d.winnerId === d.playerAId],
    [b, a, d.scoreB, d.scoreA, d.winnerId === d.playerBId],
  ] as const) {
    // Le champion reçoit déjà « Titre » avec ses points : pas de doublon.
    if (t.status === "termine" && gagne) continue;
    let suite: string;
    if (t.status === "termine") suite = "Tu termines finaliste. Bravo pour le parcours.";
    else if (d.stage === "poule") suite = "Le classement de la poule se fait sur tous ses duels.";
    else if (gagne) suite = "Tu passes au tour suivant : ton prochain duel s'affiche dès que ton adversaire est connu.";
    else if (d.stage === "tableau" && t.elimination === "double") suite = "Tu continues au tableau des perdants.";
    else suite = "Fin du parcours pour cette édition. Merci d'être venu jouer.";
    await notify(
      moi.userId,
      `${gagne ? "Victoire" : "Défaite"} ${mes}-${ses} · ${t.title}`,
      `Contre ${lui.nom} (${phase}). ${suite}`,
      "event",
      lien(t),
    );
  }

  if (t.status === "termine") return;
  const apres = await duelsPrets(t.id);
  const nouveaux = [...apres].filter((id) => !pretsAvant.has(id));
  for (const id of nouveaux) await avisDuelPret(id);
}

/** Un duel a désormais ses deux joueurs : chacun apprend contre qui il joue. */
export async function avisDuelPret(duelId: string) {
  const d = (await db.select().from(tournamentMatches).where(eq(tournamentMatches.id, duelId)).limit(1))[0];
  // Déjà confié à un arbitre : les joueurs ont reçu l'appel, pas besoin d'un second avis.
  if (!d || !d.playerAId || !d.playerBId || d.status !== "attente" || d.refereeId) return;
  const t = (await db.select().from(tournaments).where(eq(tournaments.id, d.tournamentId)).limit(1))[0];
  if (!t || t.status !== "encours") return;
  const qui = await joueursDe([d.playerAId, d.playerBId]);
  const a = qui.get(d.playerAId), b = qui.get(d.playerBId);
  if (!a || !b) return;
  const phase = phaseDe(d, await toursDuTableau(t.id));
  for (const [moi, lui] of [[a, b], [b, a]] as const) {
    await notify(
      moi.userId,
      `Ton prochain duel · ${t.title}`,
      `${phase} contre ${lui.nom}, course à ${d.raceTo}. Reste près des tables : il sera appelé bientôt.`,
      "event",
      lien(t),
    );
  }
}

/** L'organisateur appelle le duel (table, arbitre) : c'est à eux de jouer. */
export async function avisDuelAppele(duelId: string) {
  const d = (await db.select().from(tournamentMatches).where(eq(tournamentMatches.id, duelId)).limit(1))[0];
  if (!d || !d.playerAId || !d.playerBId || d.status !== "attente") return;
  const t = (await db.select().from(tournaments).where(eq(tournaments.id, d.tournamentId)).limit(1))[0];
  if (!t || t.status !== "encours") return;
  const qui = await joueursDe([d.playerAId, d.playerBId]);
  const a = qui.get(d.playerAId), b = qui.get(d.playerBId);
  if (!a || !b) return;
  const arbitre = d.refereeId ? (await db.select({ nom: users.name }).from(users).where(eq(users.id, d.refereeId)).limit(1))[0] : undefined;
  const phase = phaseDe(d, await toursDuTableau(t.id));
  const ou = [d.tableLabel ? `table ${d.tableLabel}` : "", arbitre ? `arbitre ${arbitre.nom}` : ""].filter(Boolean).join(" · ");
  for (const [moi, lui] of [[a, b], [b, a]] as const) {
    await notify(
      moi.userId,
      `C'est à toi · ${t.title}`,
      `Ton duel contre ${lui.nom} se joue maintenant (${phase}${ou ? ` · ${ou}` : ""}). Présente-toi à la table.`,
      "event",
      lien(t),
    );
  }
}

/** Au lancement : chacun apprend son premier adversaire, quand il est déjà connu. */
export async function premierAdversaire(tournamentId: string): Promise<Map<string, string>> {
  const prets = await db
    .select()
    .from(tournamentMatches)
    .where(
      and(
        eq(tournamentMatches.tournamentId, tournamentId),
        eq(tournamentMatches.status, "attente"),
        eq(tournamentMatches.stage, "tableau"),
        sql`${tournamentMatches.playerAId} is not null and ${tournamentMatches.playerBId} is not null`,
      ),
    );
  const qui = await joueursDe(prets.flatMap((d) => [d.playerAId, d.playerBId]));
  const contre = new Map<string, string>();
  for (const d of prets) {
    contre.set(d.playerAId!, qui.get(d.playerBId!)?.nom ?? "");
    contre.set(d.playerBId!, qui.get(d.playerAId!)?.nom ?? "");
  }
  return contre;
}

/* -------------------------------------------------------------- rappels */

const FUSEAU = "Africa/Douala";
const jourDe = (d: Date) => new Intl.DateTimeFormat("fr-CA", { timeZone: FUSEAU, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const heureDe = (d: Date) => Number(new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU, hour: "2-digit", hour12: false }).format(d));
const heureLisible = (d: Date) => new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU, hour: "2-digit", minute: "2-digit" }).format(d).replace(":", "h");
const dateLisible = (d: Date) => new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU, weekday: "long", day: "numeric", month: "long" }).format(d);
/** Jours calendaires (à Douala) entre aujourd'hui et le jour du tournoi. */
const joursAvant = (maintenant: Date, debut: Date) =>
  Math.round((Date.parse(jourDe(debut)) - Date.parse(jourDe(maintenant))) / 86_400_000);

/**
 * Les rappels des joueurs retenus : J-2, J-1, le jour J, et une heure avant.
 * Appelé par le tour de garde toutes les dix minutes ; chaque rappel ne part
 * qu'une fois. Les rappels du jour partent entre 8 h et 21 h, pas en pleine nuit.
 */
export async function rappelsDesTournois(maintenant = new Date()) {
  const horizon = new Date(maintenant.getTime() + 3 * 86_400_000);
  const proches = await db
    .select({ t: tournaments, salle: venues.name })
    .from(tournaments)
    .leftJoin(venues, eq(venues.id, tournaments.venueId))
    .where(
      and(
        inArray(tournaments.status, ["inscriptions", "complet", "encours"]),
        gt(tournaments.startsAt, maintenant),
        lte(tournaments.startsAt, horizon),
      ),
    );

  const h = heureDe(maintenant);
  for (const { t, salle } of proches) {
    const debut = t.startsAt!;
    const minutes = (debut.getTime() - maintenant.getTime()) / 60_000;
    const j = joursAvant(maintenant, debut);
    const cle =
      minutes <= 75 ? "h-1" : h < 8 || h >= 21 ? null : j === 2 ? "j-2" : j === 1 ? "j-1" : j === 0 ? "j0" : null;
    if (!cle) continue;

    const inscrits = await db
      .select({ userId: tournamentPlayers.userId, fee: tournamentPlayers.fee, payment: tournamentPlayers.payment })
      .from(tournamentPlayers)
      .where(and(eq(tournamentPlayers.tournamentId, t.id), eq(tournamentPlayers.status, "accepte")));
    const ou = salle ? ` · ${salle}` : "";
    for (const p of inscrits) {
      const pose = await db
        .insert(rappelsTournoi)
        .values({ id: uid(), tournamentId: t.id, userId: p.userId, cle })
        .onConflictDoNothing()
        .returning({ id: rappelsTournoi.id });
      if (!pose.length) continue;

      const aRegler = p.fee > 0 && p.payment !== "paye" ? ` N'oublie pas ton droit d'inscription de ${p.fee.toLocaleString("fr-FR")} F.` : "";
      const [titre, corps] =
        cle === "h-1"
          ? [`Ça commence dans 1 h · ${t.title}`, `Début à ${heureLisible(debut)}${ou}. Présente-toi à l'accueil pour le pointage.`]
          : cle === "j0"
            ? [`C'est aujourd'hui · ${t.title}`, `Début à ${heureLisible(debut)}${ou}. Viens 30 minutes avant.${aRegler}`]
            : cle === "j-1"
              ? [`C'est demain · ${t.title}`, `${dateLisible(debut)} à ${heureLisible(debut)}${ou}.${aRegler}`]
              : [`Dans 2 jours · ${t.title}`, `${dateLisible(debut)} à ${heureLisible(debut)}${ou}. Prépare ta queue.${aRegler}`];
      await notify(p.userId, titre, corps, "event", lien(t));
    }
  }
}
