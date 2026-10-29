import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, liveComments, users, type Stream, type User } from "@/db";

export const LONGUEUR_MAX = 280;

export type Commentaire = {
  id: string;
  texte: string;
  at: number;
  auteur: { id: string; nom: string; avatar: string | null };
  /** L'auteur tient la caméra, ou la salle : son message ressort. */
  equipe: boolean;
};

/** Les derniers commentaires visibles d'un direct, du plus ancien au plus récent. */
export async function derniersCommentaires(stream: Pick<Stream, "id" | "createdBy" | "venueId">, limite = 60): Promise<Commentaire[]> {
  const rows = await db
    .select({
      id: liveComments.id,
      texte: liveComments.texte,
      at: liveComments.createdAt,
      uid: users.id,
      nom: users.name,
      avatar: users.avatar,
      role: users.role,
      venueId: users.venueId,
    })
    .from(liveComments)
    .innerJoin(users, eq(users.id, liveComments.userId))
    .where(and(eq(liveComments.streamId, stream.id), eq(liveComments.masque, false)))
    .orderBy(desc(liveComments.createdAt))
    .limit(limite);

  return rows.reverse().map((r) => ({
    id: r.id,
    texte: r.texte,
    at: r.at.getTime(),
    auteur: { id: r.uid, nom: r.nom, avatar: r.avatar },
    equipe: r.uid === stream.createdBy || r.role === "admin" || (r.role === "manager" && r.venueId === stream.venueId),
  }));
}

/** Ce qui change quand un message arrive ou disparaît : c'est ce que le flux surveille. */
export async function signatureCommentaires(streamId: string): Promise<string> {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int`, m: sql<number>`count(*) filter (where ${liveComments.masque})::int`, last: sql<string>`max(${liveComments.createdAt})::text` })
    .from(liveComments)
    .where(eq(liveComments.streamId, streamId));
  return `${r?.n ?? 0}:${r?.m ?? 0}:${r?.last ?? ""}`;
}

/** Qui peut masquer un message : le diffuseur, le gérant de la salle, l'administration. */
export function peutModerer(user: Pick<User, "id" | "role" | "venueId">, stream: Pick<Stream, "createdBy" | "venueId">) {
  return user.role === "admin" || user.id === stream.createdBy || (user.role === "manager" && user.venueId === stream.venueId);
}
