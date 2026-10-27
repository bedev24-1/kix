"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db, matchEvents, matches } from "@/db";
import type { Match } from "@/db";
import { uid } from "@/lib/domain";
import { canScore } from "@/lib/live";
import { requireUser } from "@/lib/session";
import { scoreRack } from "@/lib/actions";
import {
  chronoExtension,
  chronoPause,
  chronoRelance,
  chronoReprise,
  etatInitial,
  jouer,
  lireEtat8,
  mancheSuivante,
  type Cote,
  type Coup,
  type Etat8,
  type ReglesCasse,
} from "@/lib/huit";

/** Ce qu'on garde en base : l'état de la manche, et de quoi annuler les derniers coups. */
type Stocke = Etat8 & { pile?: Etat8[] };
const PILE_MAX = 15;

type R = { ok: true } | { ok: false; error: string };

async function arbitre(matchId: string): Promise<{ match: Match; byId: string } | string> {
  const user = await requireUser();
  const match = (await db.select().from(matches).where(eq(matches.id, matchId)).limit(1))[0];
  if (!match) return "Match introuvable.";
  const droit = await canScore(user, match);
  if (!droit.ok) return droit.reason;
  return { match, byId: user.id };
}

const idDe = (m: Match, c: Cote) => (c === "A" ? m.playerAId : m.playerBId);

async function nextSeq(matchId: string) {
  const r = await db.select({ max: sql<number>`coalesce(max(${matchEvents.seq}), 0)` }).from(matchEvents).where(eq(matchEvents.matchId, matchId));
  return Number(r[0]?.max ?? 0) + 1;
}

function rafraichir(matchId: string) {
  revalidatePath(`/arbitre/${matchId}`);
  revalidatePath(`/app/live/${matchId}`);
  revalidatePath("/gerant/live");
}

/** Avant la première casse : qui casse (le gagnant du « lag ») et la règle de casse. */
export async function preparer8(matchId: string, casseur: Cote, regle: ReglesCasse): Promise<R> {
  const a = await arbitre(matchId);
  if (typeof a === "string") return { ok: false, error: a };
  const actuel = lireEtat8(a.match.etat8);
  if (a.match.scoreA + a.match.scoreB > 0 || actuel.phase === "jeu") {
    return { ok: false, error: "La première casse a déjà eu lieu." };
  }
  const e = etatInitial(casseur === "B" ? "B" : "A", regle === "gagnant" ? "gagnant" : "alternee");
  await db.update(matches).set({ etat8: e, turnId: idDe(a.match, e.casseur), updatedAt: new Date() }).where(eq(matches.id, matchId));
  rafraichir(matchId);
  return { ok: true };
}

/** Un coup de la manche en cours. */
export async function coup8(matchId: string, coup: Coup): Promise<R & { manche?: Cote }> {
  const a = await arbitre(matchId);
  if (typeof a === "string") return { ok: false, error: a };
  const { match, byId } = a;
  if (match.status !== "live") return { ok: false, error: "Lance le match avant de marquer." };

  const stocke = (match.etat8 ?? {}) as Stocke;
  const avant = lireEtat8(stocke, etatInitial(match.turnId === match.playerBId ? "B" : "A"));
  let res;
  try {
    res = jouer(avant, coup);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  await db.insert(matchEvents).values({
    id: uid(), matchId, playerId: idDe(match, res.evenement.qui), byId,
    // La manche elle-même est inscrite par scoreRack : ici, son motif.
    kind: res.gagnant ? "note" : res.evenement.kind,
    seq: await nextSeq(matchId), scoreA: match.scoreA, scoreB: match.scoreB,
    detail: res.evenement.detail.slice(0, 120),
  });

  if (!res.gagnant) {
    const pile = [...(stocke.pile ?? []), avant].slice(-PILE_MAX);
    // Le coup est joué : le chrono repart à plein pour le suivant.
    const etat = { ...res.etat, chrono: chronoRelance(res.etat.chrono, Date.now()) };
    await db.update(matches).set({ etat8: { ...etat, pile }, turnId: idDe(match, etat.main), updatedAt: new Date() }).where(eq(matches.id, matchId));
    rafraichir(matchId);
    return { ok: true };
  }

  // Manche gagnée : le score, puis la manche suivante (la casse suit la règle).
  await scoreRack(matchId, idDe(match, res.gagnant), 1);
  const apres = (await db.select().from(matches).where(eq(matches.id, matchId)).limit(1))[0];
  if (apres && apres.status === "live") {
    const suivante = mancheSuivante(res.etat, res.gagnant);
    await db.update(matches).set({ etat8: { ...suivante, pile: [] }, turnId: idDe(match, suivante.casseur), updatedAt: new Date() }).where(eq(matches.id, matchId));
  }
  rafraichir(matchId);
  return { ok: true, manche: res.gagnant };
}

/** Annuler le dernier coup de la manche en cours (pas une manche déjà comptée). */
export async function annuler8(matchId: string): Promise<R> {
  const a = await arbitre(matchId);
  if (typeof a === "string") return { ok: false, error: a };
  const stocke = (a.match.etat8 ?? {}) as Stocke;
  const pile = [...(stocke.pile ?? [])];
  const precedent = pile.pop();
  if (!precedent) return { ok: false, error: "Rien à annuler dans cette manche." };
  await db.update(matches).set({ etat8: { ...precedent, pile }, turnId: idDe(a.match, precedent.main), updatedAt: new Date() }).where(eq(matches.id, matchId));
  await db.insert(matchEvents).values({
    id: uid(), matchId, byId: a.byId, kind: "note", seq: await nextSeq(matchId),
    scoreA: a.match.scoreA, scoreB: a.match.scoreB, detail: "Coup annulé par l'arbitre",
  });
  rafraichir(matchId);
  return { ok: true };
}

export type GesteChrono =
  | { type: "regler"; duree: number }
  | { type: "demarrer" }
  | { type: "pause" }
  | { type: "relancer" }
  | { type: "extension"; cote: Cote };

/**
 * Le chrono de coup, à la main de l'arbitre : le régler (30 s, 45 s, éteint),
 * le lancer, l'arrêter, le remettre à plein, accorder une extension. Il
 * repart seul après chaque coup noté.
 */
export async function chrono8(matchId: string, geste: GesteChrono): Promise<R> {
  const a = await arbitre(matchId);
  if (typeof a === "string") return { ok: false, error: a };
  const stocke = (a.match.etat8 ?? {}) as Stocke;
  const e = lireEtat8(stocke, etatInitial(a.match.turnId === a.match.playerBId ? "B" : "A"));
  const maintenant = Date.now();
  let chrono = e.chrono;
  try {
    if (geste.type === "regler") {
      const duree = [0, 15, 20, 30, 45, 60].includes(geste.duree) ? geste.duree : 30;
      chrono = { ...chrono, duree, depart: null, reste: null, bonus: 0 };
    } else if (geste.type === "demarrer") chrono = chronoReprise(chrono, maintenant);
    else if (geste.type === "pause") chrono = chronoPause(chrono, maintenant);
    else if (geste.type === "relancer") chrono = chronoRelance(chrono, maintenant);
    else chrono = chronoExtension(chrono, geste.cote === "B" ? "B" : "A");
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  await db.update(matches).set({ etat8: { ...stocke, ...e, chrono, pile: stocke.pile ?? [] }, updatedAt: new Date() }).where(eq(matches.id, matchId));
  if (geste.type === "extension") {
    await db.insert(matchEvents).values({
      id: uid(), matchId, playerId: idDe(a.match, geste.cote), byId: a.byId, kind: "note",
      seq: await nextSeq(matchId), scoreA: a.match.scoreA, scoreB: a.match.scoreB, detail: "Extension du chrono",
    });
  }
  rafraichir(matchId);
  return { ok: true };
}
