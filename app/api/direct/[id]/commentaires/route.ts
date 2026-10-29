import { eq } from "drizzle-orm";
import { db, streams } from "@/db";
import { eventStream } from "@/lib/sse";
import { derniersCommentaires, signatureCommentaires } from "@/lib/commentaires";
import { getCurrentUser } from "@/lib/session";
import { canWatch } from "@/lib/stream";

export const dynamic = "force-dynamic";

/** Le fil des commentaires d'un direct, poussé dès qu'un message arrive. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("connexion requise", { status: 401 });
  const stream = (await db.select().from(streams).where(eq(streams.id, id)).limit(1))[0];
  if (!stream) return new Response("introuvable", { status: 404 });
  // Un direct payant : sa conversation est réservée à ceux qui le regardent.
  if (!(await canWatch(user, stream)).ok) return new Response("accès requis", { status: 403 });
  return eventStream({
    signature: () => signatureCommentaires(id),
    payload: () => derniersCommentaires(stream),
    signal: request.signal,
    interval: 1500,
  });
}
