import "server-only";
import { createHash } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, matchOfficials, tournamentMatches, tournamentPlayers, tournaments, users } from "@/db";
import { getClassementDesPoules as classementDesPoules } from "@/lib/tournaments";
import { nomDeLaPoule } from "@/lib/poules";
import { ordreDeJeu } from "@/lib/double";
import { idsPro } from "@/lib/profils-db";

/**
 * Tout ce que montre un tableau en direct, en un seul appel : les poules
 * classées, l'arbre, les arbitres — avec les visages.
 *
 * La page publique, celle du joueur et la console de l'organisateur lisent la
 * même chose ; la signature permet au navigateur de savoir, sans tout
 * recharger, si un score a bougé depuis.
 */

export type Visage = { id: string; userId: string; nom: string; avatar: string | null; seed: number | null; pro?: boolean };

export type DuelVue = {
  id: string;
  stage: "poule" | "tableau" | "perdants" | "finale";
  /** Le numéro du duel, comme sur Challonge : exemptions non comptées. */
  numero: number | null;
  /** Qui est attendu d'un côté vide : « Perdant de 16 », « Vainqueur de 3 ». */
  attenteA: string | null;
  attenteB: string | null;
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
  /** Double élimination : le tableau des perdants et la grande finale. */
  perdants: DuelVue[];
  finales: DuelVue[];
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

  const pros = await idsPro(joueurs.map((j) => j.userId));
  const visages = new Map<string, Visage>(
    joueurs.map((j) => [j.id, { id: j.id, userId: j.userId, nom: j.nickname || j.nom, avatar: j.avatar, seed: j.seed, pro: pros.has(j.userId) }]),
  );

  // Les arbitres désignés sur un duel sans être dans la liste restent visibles.
  const idsArbitres = [...new Set(duels.map((d) => d.refereeId).filter(Boolean))] as string[];
  const horsListe = idsArbitres.filter((id) => !arbitresInscrits.some((a) => a.id === id));
  const autres = horsListe.length
    ? await db.select({ id: users.id, nom: users.name, avatar: users.avatar }).from(users).where(inArray(users.id, horsListe))
    : [];
  const arbitresConnus = new Map([...arbitresInscrits, ...autres].map((a) => [a.id, a]));

  // Numérotation à la Challonge : ordre de jeu, exemptions non comptées.
  const finaux = duels.filter((d) => d.stage !== "poule");
  const toursPrincipal = Math.max(0, ...finaux.filter((d) => d.stage === "tableau").map((d) => d.round));
  const numeros = new Map<string, number>();
  [...finaux]
    .sort((x, y) => ordreDeJeu(x) - ordreDeJeu(y) || x.round - y.round || x.slot - y.slot)
    .filter((d) => d.status !== "exempt")
    .forEach((d, i) => numeros.set(d.id, i + 1));

  // D'où vient chaque côté : par les fils en double élimination, par le
  // calcul (tour précédent, slots 2s et 2s+1) en simple.
  const attendu = new Map<string, string>();
  for (const d of finaux) {
    const n = numeros.get(d.id);
    if (!n) continue;
    if (d.versGagnant) attendu.set(`${d.versGagnant}:${d.coteGagnant}`, `Vainqueur de ${n}`);
    if (d.versPerdant) attendu.set(`${d.versPerdant}:${d.cotePerdant}`, `Perdant de ${n}`);
  }
  const parPlace = new Map(finaux.filter((d) => d.stage === "tableau").map((d) => [`${d.round}:${d.slot}`, d]));
  const attente = (d: (typeof duels)[number], cote: "a" | "b"): string | null => {
    if (d.stage === "poule") return null;
    if (cote === "a" ? d.playerAId || d.videA : d.playerBId || d.videB) return null;
    const fil = attendu.get(`${d.id}:${cote}`);
    if (fil) return fil;
    if (d.stage === "tableau" && d.round > 1 && !d.versGagnant) {
      const source = parPlace.get(`${d.round - 1}:${2 * d.slot + (cote === "a" ? 0 : 1)}`);
      const n = source ? numeros.get(source.id) : undefined;
      return n ? `Vainqueur de ${n}` : null;
    }
    return null;
  };

  const vue = (d: (typeof duels)[number]): DuelVue => ({
    id: d.id,
    stage: d.stage === "poule" || d.stage === "perdants" || d.stage === "finale" ? d.stage : "tableau",
    numero: numeros.get(d.id) ?? null,
    attenteA: attente(d, "a"),
    attenteB: attente(d, "b"),
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
  const perdants = duels.filter((d) => d.stage === "perdants").map(vue);
  const finales = duels.filter((d) => d.stage === "finale").map(vue);
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
  // En double élimination, une défaite au tableau principal fait descendre,
  // pas sortir ; et le joueur du principal battu en grande finale a droit à
  // sa revanche.
  const elimines = new Set<string>();
  for (const d of finaux) {
    if (d.status !== "termine" || !d.winnerId || d.versPerdant) continue;
    if (d.stage === "finale" && d.round === 1 && d.winnerId === d.playerBId) continue;
    const perdant = d.winnerId === d.playerAId ? d.playerBId : d.playerAId;
    if (perdant) elimines.add(perdant);
  }
  if (poulesFinies) for (const p of poules) for (const l of p.lignes) if (!l.qualifie) elimines.add(l.id);

  const arbitres: ArbitreVue[] = [...arbitresConnus.values()]
    .map((a) => {
      const siens = [...duelsPoule, ...arbre, ...perdants, ...finales].filter((d) => d.arbitre?.id === a.id);
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
    perdants,
    finales,
    // Le tableau est créé d'un coup, finale comprise : son dernier tour est le nombre de tours.
    tours: toursPrincipal,
    arbitres,
    enLice: [...visages.values()].filter((v) => !elimines.has(v.id)),
    elimines,
    signature: await signatureDuTableau([tournamentId]),
  };
}
