"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, matches, streams, venues } from "@/db";
import type { Match, Stream, User } from "@/db";
import { uid } from "@/lib/domain";
import { canScore, getMatch } from "@/lib/live";
import { requireUser } from "@/lib/session";
import { newStreamKey, newStreamPath } from "@/lib/stream";

/**
 * Le direct d'un match, depuis la feuille d'arbitre : le créer, en lier un
 * déjà ouvert, le détacher, et régler le partenaire affiché sur la barre.
 *
 * Qui peut : l'administration, le gérant de la salle, et un arbitre de ce
 * match qui a le niveau de diffusion. Pour toucher à un direct existant, il
 * faut en plus en être l'auteur — sauf pour l'administration et le gérant.
 */
type R = { ok: true; streamId?: string } | { ok: false; error: string };

async function contexte(matchId: string): Promise<{ user: User; match: Match } | string> {
  const user = await requireUser();
  const match = (await db.select().from(matches).where(eq(matches.id, matchId)).limit(1))[0];
  if (!match) return "Match introuvable.";
  return { user, match };
}

const duComptoir = (u: User, venueId: string) => u.role === "admin" || (u.role === "manager" && u.venueId === venueId);

async function peutDiffuserLeMatch(u: User, m: Match): Promise<boolean> {
  if (duComptoir(u, m.venueId)) return true;
  const droit = await canScore(u, m);
  if (!droit.ok) return false;
  const { peutDiffuser } = await import("@/lib/niveaux");
  return peutDiffuser(u.points);
}

const peutGerer = (u: User, s: Stream) => duComptoir(u, s.venueId) || s.createdBy === u.id;

function rafraichir(matchId: string) {
  revalidatePath(`/arbitre/${matchId}`);
  revalidatePath(`/app/live/${matchId}`);
  revalidatePath("/gerant/direct");
  revalidatePath("/direct");
}

/** Ouvrir le direct de ce match : un titre « A – B », accès libre, la caméra au choix. */
export async function creerDirectDuMatch(matchId: string): Promise<R> {
  const c = await contexte(matchId);
  if (typeof c === "string") return { ok: false, error: c };
  if (!(await peutDiffuserLeMatch(c.user, c.match))) {
    return { ok: false, error: "La diffusion s'ouvre au gérant de la salle, ou aux arbitres de niveau Cogneur." };
  }
  const deja = (await db.select({ id: streams.id }).from(streams).where(and(eq(streams.matchId, matchId))).limit(1))[0];
  if (deja) return { ok: false, error: "Ce match a déjà son direct." };
  const venue = (await db.select().from(venues).where(eq(venues.id, c.match.venueId)).limit(1))[0];
  const card = await getMatch(matchId);
  if (!venue || !card) return { ok: false, error: "Salle introuvable." };

  const id = uid();
  await db.insert(streams).values({
    id,
    venueId: venue.id,
    matchId,
    title: `${card.a.name} – ${card.b.name}`.slice(0, 120),
    level: "phone",
    access: "free",
    price: 0,
    discipline: c.match.kind,
    path: newStreamPath(venue.slug),
    streamKey: newStreamKey(),
    status: "idle",
    createdBy: c.user.id,
  });
  rafraichir(matchId);
  return { ok: true, streamId: id };
}

/** Rattacher à ce match un direct déjà ouvert dans la salle. */
export async function lierDirect(matchId: string, streamId: string): Promise<R> {
  const c = await contexte(matchId);
  if (typeof c === "string") return { ok: false, error: c };
  const s = (await db.select().from(streams).where(eq(streams.id, streamId)).limit(1))[0];
  if (!s) return { ok: false, error: "Direct introuvable." };
  if (s.venueId !== c.match.venueId) return { ok: false, error: "Ce direct est filmé dans une autre salle." };
  if (s.status === "ended") return { ok: false, error: "Ce direct est terminé." };
  if (!peutGerer(c.user, s) || !(await peutDiffuserLeMatch(c.user, c.match))) {
    return { ok: false, error: "Seul l'auteur de ce direct, ou le gérant, peut le rattacher." };
  }
  // Un direct suit un seul match ; un match garde un seul direct.
  await db.update(streams).set({ matchId: null, updatedAt: new Date() }).where(eq(streams.matchId, matchId));
  await db.update(streams).set({ matchId, updatedAt: new Date() }).where(eq(streams.id, streamId));
  rafraichir(matchId);
  return { ok: true, streamId };
}

/** Détacher le direct : la vidéo continue, sans la barre de ce match. */
export async function detacherDirect(matchId: string): Promise<R> {
  const c = await contexte(matchId);
  if (typeof c === "string") return { ok: false, error: c };
  const s = (await db.select().from(streams).where(eq(streams.matchId, matchId)).limit(1))[0];
  if (!s) return { ok: true };
  if (!peutGerer(c.user, s)) return { ok: false, error: "Seul l'auteur de ce direct, ou le gérant, peut le détacher." };
  await db.update(streams).set({ matchId: null, updatedAt: new Date() }).where(eq(streams.id, s.id));
  rafraichir(matchId);
  return { ok: true };
}

/** Le partenaire affiché sur la barre (« Présenté par … »). Vide : rien. */
export async function reglerPartenaire(streamId: string, partenaire: string): Promise<R> {
  const user = await requireUser();
  const s = (await db.select().from(streams).where(eq(streams.id, streamId)).limit(1))[0];
  if (!s) return { ok: false, error: "Direct introuvable." };
  if (!peutGerer(user, s)) return { ok: false, error: "Seul l'auteur de ce direct, ou le gérant, règle son partenaire." };
  await db.update(streams).set({ sponsor: partenaire.trim().slice(0, 40), updatedAt: new Date() }).where(eq(streams.id, streamId));
  if (s.matchId) rafraichir(s.matchId);
  return { ok: true, streamId };
}

/** La barre est-elle déjà incrustée dans la vidéo (OBS) ? Le lecteur de l'app s'y adapte. */
export async function reglerBarreVideo(streamId: string, incrustee: boolean): Promise<R> {
  const user = await requireUser();
  const s = (await db.select().from(streams).where(eq(streams.id, streamId)).limit(1))[0];
  if (!s) return { ok: false, error: "Direct introuvable." };
  if (!peutGerer(user, s)) return { ok: false, error: "Seul l'auteur de ce direct, ou le gérant, règle sa barre." };
  await db.update(streams).set({ barreVideo: incrustee, updatedAt: new Date() }).where(eq(streams.id, streamId));
  if (s.matchId) rafraichir(s.matchId);
  return { ok: true, streamId };
}
