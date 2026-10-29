"use server";

import { and, desc, eq } from "drizzle-orm";
import { db, liveComments, streams } from "@/db";
import { requireUser } from "@/lib/session";
import { canWatch } from "@/lib/stream";
import { LONGUEUR_MAX, peutModerer } from "@/lib/commentaires";

type Resultat = { ok: true } | { ok: false; error: string };

/**
 * Commenter un direct. Il faut pouvoir le regarder (un direct payant ne se
 * commente pas sans billet), et on souffle un peu entre deux messages : pas
 * plus d'un toutes les 3 secondes, et pas deux fois le même d'affilée.
 */
export async function commenterDirect(streamId: string, brut: string): Promise<Resultat> {
  const user = await requireUser();
  const texte = brut.replace(/\s+/g, " ").trim().slice(0, LONGUEUR_MAX);
  if (!texte) return { ok: false, error: "Écris quelque chose." };

  const stream = (await db.select().from(streams).where(eq(streams.id, streamId)).limit(1))[0];
  if (!stream) return { ok: false, error: "Ce direct n'existe plus." };
  if (stream.status !== "live") return { ok: false, error: "Le direct est terminé : les commentaires sont fermés." };
  if (!(await canWatch(user, stream)).ok) return { ok: false, error: "Prends ton accès au direct pour commenter." };

  const dernier = (
    await db
      .select({ texte: liveComments.texte, at: liveComments.createdAt })
      .from(liveComments)
      .where(and(eq(liveComments.streamId, streamId), eq(liveComments.userId, user.id)))
      .orderBy(desc(liveComments.createdAt))
      .limit(1)
  )[0];
  if (dernier && Date.now() - dernier.at.getTime() < 3000) return { ok: false, error: "Doucement : un message toutes les 3 secondes." };
  if (dernier && dernier.texte === texte && Date.now() - dernier.at.getTime() < 60_000) {
    return { ok: false, error: "Tu viens d'envoyer ce message." };
  }

  await db.insert(liveComments).values({ streamId, userId: user.id, texte });
  return { ok: true };
}

/** Masquer un message : le diffuseur, le gérant de la salle ou l'administration. */
export async function masquerCommentaire(commentId: string): Promise<Resultat> {
  const user = await requireUser();
  const ligne = (
    await db
      .select({ id: liveComments.id, createdBy: streams.createdBy, venueId: streams.venueId })
      .from(liveComments)
      .innerJoin(streams, eq(streams.id, liveComments.streamId))
      .where(eq(liveComments.id, commentId))
      .limit(1)
  )[0];
  if (!ligne) return { ok: false, error: "Message introuvable." };
  if (!peutModerer(user, ligne)) return { ok: false, error: "Tu ne peux pas masquer ce message." };
  await db.update(liveComments).set({ masque: true }).where(eq(liveComments.id, commentId));
  return { ok: true };
}
