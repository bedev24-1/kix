import "server-only";
import { eq } from "drizzle-orm";
import { db, notifications, rappelsDirect, venues, type Stream } from "@/db";
import { uid } from "@/lib/domain";

/** Ce compte a-t-il demandé à être prévenu du prochain direct ? */
export async function aUnRappel(userId: string): Promise<boolean> {
  const row = await db.select({ id: rappelsDirect.id }).from(rappelsDirect).where(eq(rappelsDirect.userId, userId)).limit(1);
  return Boolean(row[0]);
}

/**
 * Une caméra s'allume : prévenir tous ceux qui l'attendaient, puis effacer
 * leurs rappels. Une seule annonce par rappel, quelle que soit la salle.
 */
export async function prevenirLesRappels(stream: Pick<Stream, "id" | "title" | "venueId" | "createdBy">): Promise<number> {
  const [lignes, salle] = await Promise.all([
    db.delete(rappelsDirect).returning({ userId: rappelsDirect.userId }),
    db.select({ name: venues.name }).from(venues).where(eq(venues.id, stream.venueId)).limit(1),
  ]);
  const cibles = lignes.map((l) => l.userId).filter((id) => id !== stream.createdBy);
  if (cibles.length === 0) return 0;

  await db.insert(notifications).values(
    cibles.map((userId) => ({
      id: uid(),
      userId,
      title: `${salle[0]?.name ?? "Une salle"} est en direct`,
      body: stream.title,
      kind: "system",
      href: `/direct/${stream.id}`,
      read: false,
    })),
  );
  void import("@/lib/push")
    .then((m) => m.pousser(cibles))
    .catch(() => {});
  return cibles.length;
}
