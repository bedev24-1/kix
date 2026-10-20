/**
 * Le moteur d'un tournoi : tirage, montée des vainqueurs, clôture.
 *
 * Il ne connaît pas `@/db` — il reçoit sa base en argument. C'est ce qui
 * permet au jeu de démonstration, qui tourne dans Node et non dans le
 * serveur, de dérouler un vrai tableau au lieu d'en recopier un à la main :
 * ce que la démonstration montre est alors exactement ce que l'application
 * produit.
 */
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { events, tournaments, tournamentMatches, tournamentPlayers, users } from "@/db/schema";
import type { Db } from "@/db/client";
import {
  courseDuTour,
  duelSuivant,
  nombreDeTours,
  plateauComplet,
  pointsDeClassement,
  taillePlateau,
} from "@/lib/bracket";
import {
  classerLaPoule,
  duelsDeLaPoule,
  nombreDePoules,
  ordreDesQualifies,
  repartirEnPoules,
  type DuelJoue,
  type ResultatPoule,
} from "@/lib/poules";
import { plateauDouble } from "@/lib/double";

const uid = () => crypto.randomUUID();

/** Ce que rapporte une phase de poules sans qualification : être venu jouer. */
const POINTS_DE_POULE = 25;

/** Les duels du tableau. Les poules se lisent par `duelsDePoule`. */
export function getBracket(db: Db, tournamentId: string) {
  return db
    .select()
    .from(tournamentMatches)
    .where(and(eq(tournamentMatches.tournamentId, tournamentId), eq(tournamentMatches.stage, "tableau")))
    .orderBy(asc(tournamentMatches.round), asc(tournamentMatches.slot));
}

/** Toute la phase finale : tableau principal, et en double élimination les perdants et la grande finale. */
export function phaseFinale(db: Db, tournamentId: string) {
  return db
    .select()
    .from(tournamentMatches)
    .where(and(eq(tournamentMatches.tournamentId, tournamentId), inArray(tournamentMatches.stage, ["tableau", "perdants", "finale"])))
    .orderBy(asc(tournamentMatches.stage), asc(tournamentMatches.round), asc(tournamentMatches.slot));
}

/** Les duels de poule, dans l'ordre des poules puis du calendrier. */
export function duelsDePoule(db: Db, tournamentId: string) {
  return db
    .select()
    .from(tournamentMatches)
    .where(and(eq(tournamentMatches.tournamentId, tournamentId), eq(tournamentMatches.stage, "poule")))
    .orderBy(asc(tournamentMatches.groupe), asc(tournamentMatches.slot));
}

/**
 * Le tirage au sort du tableau.
 *
 * Les têtes de série suivent les points de classement : c'est la seule mesure
 * objective dont on dispose, et elle récompense ceux qui jouent. À égalité,
 * l'ancienneté de la candidature départage — arriver tôt vaut mieux que tard.
 *
 * Le tableau entier est créé d'un coup, tours vides compris : on voit dès
 * l'ouverture où mène chaque victoire.
 */
export async function tirerLeTableau(
  db: Db,
  tournamentId: string,
  mode: ModeDeTirage = "classement",
): Promise<{ ok: true; duels: number } | { ok: false; error: string }> {
  const t = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1))[0];
  if (!t) return { ok: false, error: "Tournoi introuvable." };
  if (t.status === "encours" || t.status === "termine") {
    return { ok: false, error: "Le tableau est déjà tiré." };
  }

  // Un droit d'inscription impayé ne prend pas de place au tableau : le tirage
  // se fait une fois, et un tableau qu'on refait fait perdre la salle.
  const { tous, regles: inscrits } = await inscritsClasses(db, tournamentId, mode);
  if (inscrits.length < 2) {
    return {
      ok: false,
      error:
        tous.length >= 2
          ? "Moins de deux inscriptions sont réglées. Relance les joueurs ou passe leur droit à zéro."
          : "Il faut au moins deux joueurs acceptés.",
    };
  }

  const classes = inscrits.map((r) => r.player.id);

  // Le rang de tête de série est écrit sur la candidature : il sert ensuite à
  // l'affichage, et on ne veut pas le recalculer à chaque rendu.
  await Promise.all(
    classes.map((id, i) =>
      db.update(tournamentPlayers).set({ seed: i + 1 }).where(eq(tournamentPlayers.id, id)),
    ),
  );

  await db.delete(tournamentMatches).where(eq(tournamentMatches.tournamentId, tournamentId));

  const combien = await creerPhaseFinale(db, t, classes);
  await db
    .update(tournaments)
    .set({ status: "encours", size: taillePlateau(classes.length) })
    .where(eq(tournaments.id, tournamentId));
  return { ok: true, duels: combien };
}


/* -------------------------------------------------------------- poules */

/** Les inscrits retenus et réglés, dans l'ordre des têtes de série. */
/** Fisher-Yates : chaque ordre a la même chance — c'est tout ce qu'on demande à un tirage au sort. */
function melanger<T>(liste: T[]): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

export type ModeDeTirage = "classement" | "hasard";

async function inscritsClasses(db: Db, tournamentId: string, mode: ModeDeTirage = "classement") {
  const tous = await db
    .select({ player: tournamentPlayers, points: users.points })
    .from(tournamentPlayers)
    .innerJoin(users, eq(users.id, tournamentPlayers.userId))
    .where(and(eq(tournamentPlayers.tournamentId, tournamentId), eq(tournamentPlayers.status, "accepte")))
    .orderBy(desc(users.points), asc(tournamentPlayers.createdAt));

  const regles = tous.filter((r) => r.player.fee === 0 || r.player.payment === "paye");
  // Au hasard : plus de têtes de série, l'ordre est celui du sort.
  return { tous, regles: mode === "hasard" ? melanger(regles) : regles };
}

/**
 * Le tirage des poules.
 *
 * Même principe que le tableau : les têtes de série sortent du classement,
 * puis on répartit en serpentin pour qu'aucune poule ne concentre les
 * favoris. Tous les duels de poule sont créés d'un coup — le calendrier de la
 * soirée doit être lisible avant que la première bille ne bouge.
 */
export async function tirerLesPoules(
  db: Db,
  tournamentId: string,
  mode: ModeDeTirage = "classement",
): Promise<{ ok: true; poules: number; duels: number } | { ok: false; error: string }> {
  const t = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1))[0];
  if (!t) return { ok: false, error: "Tournoi introuvable." };
  if (t.status === "encours" || t.status === "termine") return { ok: false, error: "Le tirage a déjà eu lieu." };

  const { tous, regles } = await inscritsClasses(db, tournamentId, mode);
  if (regles.length < 3) {
    return {
      ok: false,
      error:
        tous.length >= 3
          ? "Moins de trois inscriptions sont réglées. Relance les joueurs ou passe leur droit à zéro."
          : "Il faut au moins trois joueurs pour des poules.",
    };
  }

  const classes = regles.map((r) => r.player.id);
  const nb = nombreDePoules(classes.length, t.groupSize);
  const poules = repartirEnPoules(classes, nb);

  await Promise.all(
    classes.map((id, i) =>
      db.update(tournamentPlayers).set({ seed: i + 1, groupe: null }).where(eq(tournamentPlayers.id, id)),
    ),
  );
  await db.delete(tournamentMatches).where(eq(tournamentMatches.tournamentId, tournamentId));

  const duels: (typeof tournamentMatches.$inferInsert)[] = [];
  for (const [i, membres] of poules.entries()) {
    const groupe = i + 1;
    await Promise.all(
      membres.map((id) => db.update(tournamentPlayers).set({ groupe }).where(eq(tournamentPlayers.id, id))),
    );
    for (const d of duelsDeLaPoule(groupe, membres)) {
      duels.push({
        id: uid(),
        tournamentId,
        stage: "poule",
        groupe,
        round: 1,
        slot: d.slot,
        playerAId: d.a,
        playerBId: d.b,
        raceTo: t.raceTo,
        status: "attente",
      });
    }
  }

  if (duels.length) await db.insert(tournamentMatches).values(duels);
  await db.update(tournaments).set({ status: "encours" }).where(eq(tournaments.id, tournamentId));

  return { ok: true, poules: poules.length, duels: duels.length };
}

/** Le classement de chaque poule, dans l'ordre des poules. */
export async function classementDesPoules(db: Db, tournamentId: string): Promise<ResultatPoule[][]> {
  const [joueurs, duels] = await Promise.all([
    db
      .select()
      .from(tournamentPlayers)
      .where(eq(tournamentPlayers.tournamentId, tournamentId))
      .orderBy(asc(tournamentPlayers.seed)),
    db
      .select()
      .from(tournamentMatches)
      .where(and(eq(tournamentMatches.tournamentId, tournamentId), eq(tournamentMatches.stage, "poule"))),
  ]);

  const groupes = [...new Set(joueurs.map((j) => j.groupe).filter((g): g is number => g !== null))].sort(
    (a, b) => a - b,
  );

  return groupes.map((g) => {
    const membres = joueurs.filter((j) => j.groupe === g).map((j) => j.id);
    const joues: DuelJoue[] = duels
      .filter((d) => d.groupe === g && d.playerAId && d.playerBId)
      .map((d) => ({
        aId: d.playerAId!,
        bId: d.playerBId!,
        scoreA: d.scoreA,
        scoreB: d.scoreB,
        termine: d.status === "termine",
      }));
    return classerLaPoule(membres, joues);
  });
}

/** Reste-t-il un duel de poule à jouer ? */
export async function poulesTerminees(db: Db, tournamentId: string): Promise<boolean> {
  const restants = await db
    .select({ id: tournamentMatches.id })
    .from(tournamentMatches)
    .where(
      and(
        eq(tournamentMatches.tournamentId, tournamentId),
        eq(tournamentMatches.stage, "poule"),
        sql`${tournamentMatches.status} <> 'termine'`,
      ),
    )
    .limit(1);
  return restants.length === 0;
}

/**
 * Les poules finies, on ouvre le tableau entre les qualifiés.
 *
 * Les têtes de série du tableau ne sont pas celles des poules : c'est le
 * classement de la poule qui compte, sinon un favori sorti deuxième
 * repartirait devant le premier d'une autre poule.
 */
export async function ouvrirLeTableau(
  db: Db,
  tournamentId: string,
): Promise<{ ok: true; duels: number } | { ok: false; error: string }> {
  const t = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1))[0];
  if (!t) return { ok: false, error: "Tournoi introuvable." };
  if (!(await poulesTerminees(db, tournamentId))) {
    return { ok: false, error: "Des duels de poule restent à jouer." };
  }

  const deja = await db
    .select({ id: tournamentMatches.id })
    .from(tournamentMatches)
    .where(and(eq(tournamentMatches.tournamentId, tournamentId), eq(tournamentMatches.stage, "tableau")))
    .limit(1);
  if (deja.length) return { ok: false, error: "Le tableau est déjà ouvert." };

  const classements = await classementDesPoules(db, tournamentId);
  const qualifies = ordreDesQualifies(classements, Math.max(1, t.qualifiers));
  if (qualifies.length < 2) return { ok: false, error: "Pas assez de qualifiés pour un tableau." };

  const combien = await creerPhaseFinale(db, t, qualifies);
  await db.update(tournaments).set({ size: taillePlateau(qualifies.length) }).where(eq(tournaments.id, tournamentId));
  return { ok: true, duels: combien };
}

/**
 * La phase finale, entre des joueurs donnés dans l'ordre des têtes de série :
 * simple élimination, ou double (tableau des perdants et grande finale).
 */
async function creerPhaseFinale(db: Db, t: typeof tournaments.$inferSelect, classes: string[]): Promise<number> {
  const tours = nombreDeTours(classes.length);

  if (t.elimination !== "double") {
    const duels = plateauComplet(classes);
    await db.insert(tournamentMatches).values(
      duels.map((d) => ({
        id: uid(),
        tournamentId: t.id,
        stage: "tableau" as const,
        groupe: null,
        round: d.round,
        slot: d.slot,
        playerAId: d.a?.playerId ?? null,
        playerBId: d.b?.playerId ?? null,
        raceTo: courseDuTour(d.round, tours, t.raceTo),
        status: "attente" as const,
      })),
    );
    // Les exemptions se résolvent tout de suite : un joueur seul face à personne
    // a gagné, et son adversaire du tour suivant doit pouvoir l'apprendre.
    await resoudreExemptions(db, t.id);
    return duels.length;
  }

  const noeuds = plateauDouble(classes);
  const ids = new Map(noeuds.map((n) => [n.cle, uid()]));
  const course = (n: (typeof noeuds)[number]) =>
    n.stage === "tableau" ? courseDuTour(n.round, tours, t.raceTo) : n.stage === "finale" ? courseDuTour(tours, tours, t.raceTo) : t.raceTo;
  await db.insert(tournamentMatches).values(
    noeuds.map((n) => ({
      id: ids.get(n.cle)!,
      tournamentId: t.id,
      stage: n.stage,
      groupe: null,
      round: n.round,
      slot: n.slot,
      playerAId: n.a?.playerId ?? null,
      playerBId: n.b?.playerId ?? null,
      videA: n.videA,
      videB: n.videB,
      versGagnant: n.versGagnant ? ids.get(n.versGagnant.cle)! : null,
      coteGagnant: n.versGagnant?.cote ?? null,
      versPerdant: n.versPerdant ? ids.get(n.versPerdant.cle)! : null,
      cotePerdant: n.versPerdant?.cote ?? null,
      raceTo: course(n),
      status: "attente" as const,
    })),
  );
  // Les exemptions du premier tour descendent par les fils, jusque dans le
  // tableau des perdants.
  for (const n of noeuds) if (n.stage === "tableau" && n.round === 1) await resoudreDuel(db, ids.get(n.cle)!);
  return noeuds.length;
}

/** Poser un joueur — ou une absence — sur un côté d'un duel, puis voir si ce duel se résout seul. */
async function placer(db: Db, duelId: string, cote: string | null, joueur: string | null) {
  await db
    .update(tournamentMatches)
    .set(cote === "b" ? { playerBId: joueur, videB: joueur === null } : { playerAId: joueur, videA: joueur === null })
    .where(eq(tournamentMatches.id, duelId));
  await resoudreDuel(db, duelId);
}

/**
 * Un duel dont les deux côtés sont connus mais où il manque quelqu'un se
 * résout tout seul : le présent passe, et l'absence descend vers le perdant.
 */
async function resoudreDuel(db: Db, duelId: string) {
  const d = (await db.select().from(tournamentMatches).where(eq(tournamentMatches.id, duelId)).limit(1))[0];
  if (!d || d.status !== "attente") return;
  const connuA = Boolean(d.playerAId) || d.videA;
  const connuB = Boolean(d.playerBId) || d.videB;
  if (!connuA || !connuB || (d.playerAId && d.playerBId)) return;
  if (d.stage === "finale" && d.round === 2) return; // la revanche ne se joue que si on la demande

  const seul = d.playerAId ?? d.playerBId ?? null;
  await db.update(tournamentMatches).set({ status: "exempt", winnerId: seul }).where(eq(tournamentMatches.id, d.id));
  if (d.versGagnant) await placer(db, d.versGagnant, d.coteGagnant, seul);
  if (d.versPerdant) await placer(db, d.versPerdant, d.cotePerdant, null);
}

/** Après un résultat en double élimination : chacun suit son fil. */
async function avancerDouble(db: Db, d: typeof tournamentMatches.$inferSelect, vainqueur: string, perdant: string) {
  if (d.stage === "finale") {
    const revanche = (
      await db
        .select()
        .from(tournamentMatches)
        .where(and(eq(tournamentMatches.tournamentId, d.tournamentId), eq(tournamentMatches.stage, "finale"), eq(tournamentMatches.round, 2)))
        .limit(1)
    )[0];
    // Grande finale gagnée par celui du tableau principal : il n'a jamais
    // perdu, c'est fini. Gagnée par celui des perdants : chacun a perdu une
    // fois, la seconde finale décide.
    if (d.round === 1 && vainqueur !== d.playerAId && revanche) {
      await db
        .update(tournamentMatches)
        .set({ playerAId: d.playerAId, playerBId: d.playerBId, videA: false, videB: false })
        .where(eq(tournamentMatches.id, revanche.id));
      return;
    }
    if (d.round === 1 && revanche) {
      await db.update(tournamentMatches).set({ status: "exempt", videA: true, videB: true }).where(eq(tournamentMatches.id, revanche.id));
    }
    await cloreDouble(db, d.tournamentId, vainqueur, perdant);
    return;
  }
  if (d.versGagnant) await placer(db, d.versGagnant, d.coteGagnant, vainqueur);
  if (d.versPerdant) await placer(db, d.versPerdant, d.cotePerdant, perdant);
}

/** Le champion connu : points selon l'endroit où chacun est tombé, puis on referme. */
async function cloreDouble(db: Db, tournamentId: string, champion: string, finaliste: string) {
  const [joueurs, duels] = await Promise.all([
    db.select().from(tournamentPlayers).where(eq(tournamentPlayers.tournamentId, tournamentId)),
    db.select().from(tournamentMatches).where(eq(tournamentMatches.tournamentId, tournamentId)),
  ]);
  const derniers = Math.max(0, ...duels.filter((d) => d.stage === "perdants").map((d) => d.round));
  // Le tour des perdants où chacun a pris sa seconde défaite.
  const chute = new Map<string, number>();
  for (const d of duels) {
    if (d.stage !== "perdants" || d.status !== "termine" || !d.winnerId) continue;
    const battu = d.winnerId === d.playerAId ? d.playerBId : d.playerAId;
    if (battu) chute.set(battu, d.round);
  }
  const auTableau = new Set(duels.filter((d) => d.stage !== "poule").flatMap((d) => [d.playerAId, d.playerBId]).filter(Boolean) as string[]);

  for (const j of joueurs) {
    if (j.status !== "accepte") continue;
    const tour = chute.get(j.id) ?? 0;
    const points =
      j.id === champion ? 1000
      : j.id === finaliste ? 600
      : !auTableau.has(j.id) ? POINTS_DE_POULE
      : tour >= derniers ? 360
      : tour >= derniers - 1 ? 250
      : tour >= derniers - 3 ? 150
      : tour >= derniers - 5 ? 80
      : 50;
    await db.update(users).set({ points: sql`${users.points} + ${points}` }).where(eq(users.id, j.userId));
  }

  const gagnant = joueurs.find((j) => j.id === champion);
  await db.update(tournaments).set({ status: "termine", winnerId: gagnant?.userId ?? null }).where(eq(tournaments.id, tournamentId));
  const t = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1))[0];
  if (t?.eventId) await db.update(events).set({ endedAt: new Date() }).where(eq(events.id, t.eventId));
}

/** Un duel sans adversaire est gagné d'office : on le propage. */
async function resoudreExemptions(db: Db, tournamentId: string) {
  const duels = await getBracket(db, tournamentId);

  for (const d of duels) {
    if (d.status !== "attente" || d.round !== 1) continue;
    const seul = d.playerAId && !d.playerBId ? d.playerAId : !d.playerAId && d.playerBId ? d.playerBId : null;
    if (!seul) continue;

    await db
      .update(tournamentMatches)
      .set({ winnerId: seul, status: "exempt" })
      .where(eq(tournamentMatches.id, d.id));
    await faireMonter(db, tournamentId, d.round, d.slot, seul);
  }
}

/** Inscrire un vainqueur à sa place du tour suivant. */
async function faireMonter(db: Db, tournamentId: string, round: number, slot: number, playerId: string) {
  const suite = duelSuivant({ round, slot });
  const cible = (
    await db
      .select()
      .from(tournamentMatches)
      .where(
        and(
          eq(tournamentMatches.tournamentId, tournamentId),
          eq(tournamentMatches.stage, "tableau"),
          eq(tournamentMatches.round, suite.round),
          eq(tournamentMatches.slot, suite.slot),
        ),
      )
      .limit(1)
  )[0];
  if (!cible) return; // c'était la finale

  await db
    .update(tournamentMatches)
    .set(suite.cote === "a" ? { playerAId: playerId } : { playerBId: playerId })
    .where(eq(tournamentMatches.id, cible.id));
}

/* ------------------------------------------------------------- résultat */

/**
 * Enregistrer le résultat d'un duel.
 *
 * Le vainqueur monte, le perdant garde le tour qu'il a atteint — c'est lui
 * qui décide de ses points de classement. Quand la finale tombe, le tournoi
 * se referme et les points partent sur les comptes.
 */
export async function noterResultat(
  db: Db,
  duelId: string,
  scoreA: number,
  scoreB: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const d = (await db.select().from(tournamentMatches).where(eq(tournamentMatches.id, duelId)).limit(1))[0];
  if (!d) return { ok: false, error: "Duel introuvable." };
  if (!d.playerAId || !d.playerBId) return { ok: false, error: "Ce duel attend encore ses deux joueurs." };
  if (scoreA === scoreB) return { ok: false, error: "Un duel ne peut pas finir à égalité." };
  if (Math.max(scoreA, scoreB) < d.raceTo) {
    return {
      ok: false,
      error:
        d.raceTo <= 1
          ? "Partie sèche : celui qui met la noire marque 1, l'autre 0."
          : `La course est à ${d.raceTo} parties gagnantes.`,
    };
  }

  const vainqueur = scoreA > scoreB ? d.playerAId : d.playerBId;
  const perdant = scoreA > scoreB ? d.playerBId : d.playerAId;

  await db
    .update(tournamentMatches)
    .set({ scoreA, scoreB, winnerId: vainqueur, status: "termine" })
    .where(eq(tournamentMatches.id, duelId));

  // Double élimination : le duel sait où envoyer chacun.
  if (d.versGagnant || d.stage === "perdants" || d.stage === "finale") {
    await avancerDouble(db, d, vainqueur, perdant);
    return { ok: true };
  }

  // Le perdant s'arrête ici ; le vainqueur, au moins au tour suivant. En
  // poule on ne touche à rien : personne n'est éliminé avant la fin.
  if (d.stage === "tableau") {
    await db.update(tournamentPlayers).set({ reachedRound: d.round }).where(eq(tournamentPlayers.id, perdant));
    await db.update(tournamentPlayers).set({ reachedRound: d.round + 1 }).where(eq(tournamentPlayers.id, vainqueur));
  }

  // Un duel de poule ne fait monter personne : c'est le classement de la
  // poule qui décide, une fois tous ses duels joués.
  if (d.stage === "tableau") {
    await faireMonter(db, d.tournamentId, d.round, d.slot, vainqueur);
    await cloreSiFini(db, d.tournamentId);
  }
  return { ok: true };
}

/** La finale jouée, on ferme et on distribue les points. */
async function cloreSiFini(db: Db, tournamentId: string) {
  const duels = await getBracket(db, tournamentId);
  const dernierTour = Math.max(...duels.map((d) => d.round));
  const finale = duels.find((d) => d.round === dernierTour);
  if (!finale?.winnerId) return;

  const joueurs = await db
    .select()
    .from(tournamentPlayers)
    .where(eq(tournamentPlayers.tournamentId, tournamentId));

  const auTableau = new Set(
    duels.flatMap((d) => [d.playerAId, d.playerBId]).filter((v): v is string => Boolean(v)),
  );

  for (const j of joueurs) {
    if (j.status !== "accepte") continue;
    const gagne = j.id === finale.winnerId;
    // Sorti en poule : il a joué ses matchs sans atteindre le tableau. Lui
    // donner les points d'un premier tour serait injuste pour qui s'est
    // qualifié ; ne rien lui donner le serait pour qui est venu jouer.
    const points = auTableau.has(j.id)
      ? pointsDeClassement(gagne ? dernierTour : j.reachedRound, dernierTour, gagne)
      : POINTS_DE_POULE;
    await db
      .update(users)
      .set({ points: sql`${users.points} + ${points}` })
      .where(eq(users.id, j.userId));
  }

  const champion = joueurs.find((j) => j.id === finale.winnerId);
  await db
    .update(tournaments)
    .set({ status: "termine", winnerId: champion?.userId ?? null })
    .where(eq(tournaments.id, tournamentId));

  // Le tournoi est un événement : sa finale jouée, la soirée jumelle se
  // referme dans la foulée. Elle reste à l'affiche, marquée « terminé », mais
  // ne vend plus un seul billet pour une nuit déjà passée.
  const t = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1))[0];
  if (t?.eventId) {
    await db.update(events).set({ endedAt: new Date() }).where(eq(events.id, t.eventId));
  }
}

/**
 * Échanger deux joueurs de place — dans les poules ou sur l'arbre.
 *
 * C'est le placement à la main : l'organisateur tire, puis corrige (deux amis
 * dans la même poule, un favori à éloigner). On échange les deux identités
 * partout où elles figurent dans la phase en cours : poule, tête de série,
 * duels, exemption. Une fois qu'un des deux a joué, on ne touche plus à rien —
 * un résultat ne se déplace pas.
 */
export async function echangerJoueurs(
  db: Db,
  tournamentId: string,
  idA: string,
  idB: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (idA === idB) return { ok: false, error: "Choisis deux joueurs différents." };
  const [a, b] = await Promise.all(
    [idA, idB].map(async (id) =>
      (await db.select().from(tournamentPlayers).where(and(eq(tournamentPlayers.id, id), eq(tournamentPlayers.tournamentId, tournamentId))).limit(1))[0],
    ),
  );
  if (!a || !b) return { ok: false, error: "Joueur introuvable dans ce tableau." };

  const duels = await db.select().from(tournamentMatches).where(eq(tournamentMatches.tournamentId, tournamentId));
  const tableauOuvert = duels.some((d) => d.stage === "tableau");
  const phase = duels.filter((d) => d.stage === (tableauOuvert ? "tableau" : "poule"));
  const lesSiens = phase.filter((d) => [d.playerAId, d.playerBId].some((p) => p === idA || p === idB));
  if (lesSiens.some((d) => d.status === "termine")) {
    return { ok: false, error: "L'un des deux a déjà joué : sa place ne bouge plus." };
  }
  if (lesSiens.length === 0) return { ok: false, error: "Ces joueurs ne sont pas encore placés." };

  const autre = (id: string | null) => (id === idA ? idB : id === idB ? idA : id);
  for (const d of lesSiens) {
    await db
      .update(tournamentMatches)
      .set({ playerAId: autre(d.playerAId), playerBId: autre(d.playerBId), winnerId: autre(d.winnerId) })
      .where(eq(tournamentMatches.id, d.id));
  }
  await db.update(tournamentPlayers).set({ groupe: b.groupe, seed: b.seed }).where(eq(tournamentPlayers.id, a.id));
  await db.update(tournamentPlayers).set({ groupe: a.groupe, seed: a.seed }).where(eq(tournamentPlayers.id, b.id));
  return { ok: true };
}
