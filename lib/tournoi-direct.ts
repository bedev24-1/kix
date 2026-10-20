import "server-only";
import { createHash } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, matchOfficials, tournamentMatches, tournamentPlayers, tournaments, users } from "@/db";
import { getClassementDesPoules as classementDesPoules } from "@/lib/tournaments";
import { nomDeLaPoule } from "@/lib/poules";

/**
 * Tout ce que montre un tableau en direct, en un seul appel : les poules
 * classées, l'arbre, les arbitres — avec les visages.
 *
 * La page publique, celle du joueur et la console de l'organisateur lisent la
 * même chose ; la signature permet au navigateur de savoir, sans tout
 * recharger, si un score a bougé depuis.
 */

export type Visage = { id: string; userId: string; nom: string; avatar: string | null; seed: number | null };

export type DuelVue = {
  id: string;
  stage: "poule" | "tableau";
  groupe: number | null;
  round: number;
  slot: number;
  a: Visage | null;
  b: Visage | null;
  scoreA: number;
  scoreB: number;
  raceTo: number;
  status: string;
  gagnant: "a" | "b" | null;
  arbitre: { id: string; nom: string; avatar: string | null } | null;
  table: string;
};

export type LigneGroupe = Visage & {
  rang: number;
  joues: number;
  victoires: number;
  defaites: number;
  difference: number;
  points: number;
  qualifie: boolean;
  /** Les cinq derniers résultats, du plus ancien au plus récent. */
  forme: ("V" | "D")[];
};

export type GroupeVue = { numero: number; nom: string; lignes: LigneGroupe[]; duels: DuelVue[]; joues: number; total: number };

export type ArbitreVue = { id: string; nom: string; avatar: string | null; duels: number; termines: number; aVenir: number };

export type TableauDirect = {
  poules: GroupeVue[];
  poulesFinies: boolean;
  arbre: DuelVue[];
  tours: number;
  arbitres: ArbitreVue[];
  /** Ceux qui peuvent encore gagner. */
  enLice: Visage[];
  elimines: Set<string>;
  signature: string;
};

/** L'empreinte de l'état d'un tableau : elle change dès qu'un score, un joueur ou un arbitre bouge. */
export async function signatureDuTableau(tournamentIds: string[]): Promise<string> {
  if (tournamentIds.length === 0) return "";
  const lignes = await db
    .select({
      id: tournamentMatches.id,
      a: tournamentMatches.playerAId,
      b: tournamentMatches.playerBId,
      sa: tournamentMatches.scoreA,
      sb: tournamentMatches.scoreB,
      s: tournamentMatches.status,
      r: tournamentMatches.refereeId,
      t: tournamentMatches.tableLabel,
    })
    .from(tournamentMatches)
    .where(inArray(tournamentMatches.tournamentId, tournamentIds))
    .orderBy(asc(tournamentMatches.id));
  return createHash("sha1").update(JSON.stringify(lignes)).digest("hex").slice(0, 16);
}

export async function tableauEnDirect(tournamentId: string): Promise<TableauDirect> {
  const t = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1))[0];
  const [joueurs, duels, arbitresInscrits] = await Promise.all([
    db
      .select({
        id: tournamentPlayers.id,
        userId: tournamentPlayers.userId,
        nickname: tournamentPlayers.nickname,
        seed: tournamentPlayers.seed,
        nom: users.name,
        avatar: users.avatar,
      })
      .from(tournamentPlayers)
      .innerJoin(users, eq(users.id, tournamentPlayers.userId))
      .where(and(eq(tournamentPlayers.tournamentId, tournamentId), eq(tournamentPlayers.status, "accepte"))),
    db
      .select()
      .from(tournamentMatches)
      .where(eq(tournamentMatches.tournamentId, tournamentId))
      .orderBy(asc(tournamentMatches.groupe), asc(tournamentMatches.round), asc(tournamentMatches.slot)),
    t?.eventId
      ? db
          .select({ id: users.id, nom: users.name, avatar: users.avatar })
          .from(matchOfficials)
          .innerJoin(users, eq(users.id, matchOfficials.userId))
          .where(eq(matchOfficials.eventId, t.eventId))
      : Promise.resolve([] as { id: string; nom: string; avatar: string | null }[]),
  ]);

  const visages = new Map<string, Visage>(
    joueurs.map((j) => [j.id, { id: j.id, userId: j.userId, nom: j.nickname || j.nom, avatar: j.avatar, seed: j.seed }]),
  );

  // Les arbitres désignés sur un duel sans être dans la liste restent visibles.
  const idsArbitres = [...new Set(duels.map((d) => d.refereeId).filter(Boolean))] as string[];
  const horsListe = idsArbitres.filter((id) => !arbitresInscrits.some((a) => a.id === id));
  const autres = horsListe.length
    ? await db.select({ id: users.id, nom: users.name, avatar: users.avatar }).from(users).where(inArray(users.id, horsListe))
    : [];
  const arbitresConnus = new Map([...arbitresInscrits, ...autres].map((a) => [a.id, a]));

  const vue = (d: (typeof duels)[number]): DuelVue => ({
    id: d.id,
    stage: d.stage === "poule" ? "poule" : "tableau",
    groupe: d.groupe,
    round: d.round,
    slot: d.slot,
    a: d.playerAId ? (visages.get(d.playerAId) ?? null) : null,
    b: d.playerBId ? (visages.get(d.playerBId) ?? null) : null,
    scoreA: d.scoreA,
    scoreB: d.scoreB,
    raceTo: d.raceTo,
    status: d.status,
    gagnant: d.winnerId ? (d.winnerId === d.playerAId ? "a" : "b") : null,
    arbitre: d.refereeId ? (arbitresConnus.get(d.refereeId) ?? null) : null,
    table: d.tableLabel,
  });

  const duelsPoule = duels.filter((d) => d.stage === "poule").map(vue);
  const arbre = duels.filter((d) => d.stage === "tableau").map(vue);
  const qualifies = t?.qualifiers ?? 2;

  // Les poules, classées comme le moteur les classe — c'est lui qui décide
  // qui sort, l'écran ne fait que le montrer.
  const classements = duelsPoule.length ? await classementDesPoules(tournamentId) : [];
  const poules: GroupeVue[] = classements.map((lignes, i) => {
    const numero = i + 1;
    const siens = duelsPoule.filter((d) => d.groupe === numero);
    return {
      numero,
      nom: nomDeLaPoule(numero),
      duels: siens,
      joues: siens.filter((d) => d.status === "termine").length,
      total: siens.length,
      lignes: lignes.map((l, rang) => {
        const v = visages.get(l.playerId)!;
        const forme = siens
          .filter((d) => d.status === "termine" && (d.a?.id === l.playerId || d.b?.id === l.playerId))
          .map((d) => ((d.gagnant === "a" ? d.a?.id : d.b?.id) === l.playerId ? "V" : "D") as "V" | "D")
          .slice(-5);
        return {
          ...v,
          rang: rang + 1,
          joues: l.joues,
          victoires: l.victoires,
          defaites: l.defaites,
          difference: l.difference,
          points: l.victoires * 3,
          qualifie: rang < qualifies,
          forme,
        };
      }),
    };
  });
  const poulesFinies = poules.length > 0 && duelsPoule.every((d) => d.status === "termine");

  // Éliminés : perdants d'un duel de l'arbre, et non-qualifiés des poules
  // une fois les poules finies.
  const elimines = new Set<string>();
  for (const d of arbre) {
    if (d.status !== "termine" || !d.gagnant) continue;
    const perdant = d.gagnant === "a" ? d.b : d.a;
    if (perdant) elimines.add(perdant.id);
  }
  if (poulesFinies) for (const p of poules) for (const l of p.lignes) if (!l.qualifie) elimines.add(l.id);

  const arbitres: ArbitreVue[] = [...arbitresConnus.values()]
    .map((a) => {
      const siens = [...duelsPoule, ...arbre].filter((d) => d.arbitre?.id === a.id);
      return {
        ...a,
        duels: siens.length,
        termines: siens.filter((d) => d.status === "termine").length,
        aVenir: siens.filter((d) => d.status !== "termine" && d.status !== "exempt").length,
      };
    })
    .sort((x, y) => y.termines - x.termines || y.duels - x.duels || x.nom.localeCompare(y.nom));

  return {
    poules,
    poulesFinies,
    arbre,
    // Le tableau est créé d'un coup, finale comprise : son dernier tour est le nombre de tours.
    tours: arbre.length ? Math.max(...arbre.map((d) => d.round)) : 0,
    arbitres,
    enLice: [...visages.values()].filter((v) => !elimines.has(v.id)),
    elimines,
    signature: await signatureDuTableau([tournamentId]),
  };
}
