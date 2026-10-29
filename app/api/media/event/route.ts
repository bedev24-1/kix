import { timingSafeEqual } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db, streams } from "@/db";
import { getStreamByPath, media } from "@/lib/stream";

export const dynamic = "force-dynamic";

/**
 * Notifications de MediaMTX : `runOnReady` quand une source arrive,
 * `runOnNotReady` quand elle s'arrête. Le fichier de config les envoie ici avec
 * un `curl`, en portant le secret partagé.
 *
 * Sans cela, un direct resterait « en cours » après que la caméra a été
 * débranchée.
 */
export async function POST(request: Request) {
  const secret = media().hookSecret;
  const given = request.headers.get("x-mb-media") ?? "";
  const expected = secret ?? "";
  if (
    !expected ||
    given.length !== expected.length ||
    !timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  ) {
    return Response.json({ error: "secret invalide" }, { status: 401 });
  }

  const url = new URL(request.url);
  const path = (url.searchParams.get("path") ?? "").replace(/^\/+/, "");
  const event = url.searchParams.get("event");

  const stream = await getStreamByPath(path);
  if (!stream) return Response.json({ ok: true, unknown: true });

  if (event === "ready") {
    await db
      .update(streams)
      .set({ status: "live", startedAt: stream.startedAt ?? new Date(), endedAt: null, updatedAt: new Date() })
      .where(eq(streams.id, stream.id));
    // Une seule annonce par allumage : le hook `ready` repasse à chaque
    // reconnexion de la source, et un abonné ne veut pas dix notifications.
    if (stream.status !== "live") {
      const { prevenirLesAbonnes } = await import("@/lib/suivis");
      await prevenirLesAbonnes(stream).catch(() => 0);
      // Et tous ceux qui ont touché « Me prévenir » sur l'accueil.
      const { prevenirLesRappels } = await import("@/lib/rappels");
      await prevenirLesRappels(stream).catch(() => 0);
    }
  } else if (event === "notready") {
    await db
      .update(streams)
      .set({ status: "ended", endedAt: new Date(), viewers: 0, updatedAt: new Date() })
      .where(eq(streams.id, stream.id));
  } else if (event === "read") {
    await db
      .update(streams)
      .set({
        viewers: sql`${streams.viewers} + 1`,
        peakViewers: sql`greatest(${streams.peakViewers}, ${streams.viewers} + 1)`,
        updatedAt: new Date(),
      })
      .where(eq(streams.id, stream.id));
  } else if (event === "unread") {
    await db
      .update(streams)
      .set({ viewers: sql`greatest(0, ${streams.viewers} - 1)`, updatedAt: new Date() })
      .where(eq(streams.id, stream.id));
  }

  return Response.json({ ok: true, status: event });
}
