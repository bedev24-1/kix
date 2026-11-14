import "server-only";
import crypto from "node:crypto";
import { and, eq, gte } from "drizzle-orm";
import { db, reservations, users, venues, venueTables } from "@/db";

/**
 * Salles partenaires : une salle qui a sa propre application de gestion (PoolNuts, par exemple)
 * reçoit ses réservations Master Break et nous renvoie ce qui se passe chez elle.
 *
 * Configuration par variable d'environnement, jamais en base ni dans le code :
 *   MB_PARTENAIRES='[{"salle":"poolnuts","cle":"<64 caractères au hasard>","webhook":"https://…/api/partenaires/master-break"}]'
 * La même clé sert dans les deux sens : la salle l'envoie en « Authorization: Bearer » quand elle
 * nous appelle, et nous signons avec elle (HMAC-SHA256) ce que nous lui envoyons.
 */
type Partenaire = { salle: string; cle: string; webhook?: string };

function partenaires(): Partenaire[] {
  try {
    const brut = JSON.parse(process.env.MB_PARTENAIRES || "[]");
    return Array.isArray(brut) ? brut.filter((p) => p && typeof p.salle === "string" && typeof p.cle === "string" && p.cle.length >= 32) : [];
  } catch {
    console.error("MB_PARTENAIRES illisible (JSON attendu).");
    return [];
  }
}

const egal = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** La salle qui appelle, reconnue à sa clé. Null : refus. */
export async function salleAppelante(request: Request) {
  const jeton = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!jeton) return null;
  const p = partenaires().find((x) => egal(x.cle, jeton));
  if (!p) return null;
  const venue = (await db.select().from(venues).where(eq(venues.slug, p.salle)).limit(1))[0];
  return venue ? { venue, partenaire: p } : null;
}

/** Une réservation telle que la salle partenaire la reçoit. */
export async function reservationPourPartenaire(id: string) {
  const r = (
    await db
      .select({ reservation: reservations, table: venueTables, client: users.name, telephone: users.phone })
      .from(reservations)
      .innerJoin(users, eq(reservations.userId, users.id))
      .leftJoin(venueTables, eq(reservations.tableId, venueTables.id))
      .where(eq(reservations.id, id))
      .limit(1)
  )[0];
  return r ? formater(r) : null;
}

function formater(r: { reservation: typeof reservations.$inferSelect; table: typeof venueTables.$inferSelect | null; client: string; telephone: string | null }) {
  const numero = r.table ? Number((r.table.label.match(/\d+/) || [])[0]) || null : null;
  return {
    id: r.reservation.id,
    table: r.table ? { id: r.table.id, nom: r.table.label, numero } : null,
    client: r.client,
    telephone: r.telephone || "",
    debut: r.reservation.startsAt.toISOString(),
    minutes: r.reservation.minutes,
    joueurs: r.reservation.players,
    note: r.reservation.note,
    // pending | confirmed | seated | done | cancelled | no_show | failed
    statut: r.reservation.status,
    acompte: r.reservation.deposit,
    paiement: r.reservation.deposit > 0 ? "acompte" : "caisse",
    creee_le: r.reservation.createdAt.toISOString(),
  };
}

/** Toutes les réservations d'une salle à partir d'une date (rattrapage côté partenaire). */
export async function reservationsDeLaSalle(venueId: string, depuis: Date) {
  const lignes = await db
    .select({ reservation: reservations, table: venueTables, client: users.name, telephone: users.phone })
    .from(reservations)
    .innerJoin(users, eq(reservations.userId, users.id))
    .leftJoin(venueTables, eq(reservations.tableId, venueTables.id))
    .where(and(eq(reservations.venueId, venueId), gte(reservations.startsAt, depuis)))
    .orderBy(reservations.startsAt)
    .limit(500);
  return lignes.map(formater);
}

/**
 * Prévient la salle partenaire qu'une réservation a été créée ou a changé. Ne bloque jamais le
 * joueur : un envoi raté est rattrapé par la lecture périodique que fait la salle.
 */
export async function publierReservation(id: string) {
  try {
    const r = (await db.select({ venueId: reservations.venueId }).from(reservations).where(eq(reservations.id, id)).limit(1))[0];
    if (!r) return;
    const venue = (await db.select({ slug: venues.slug }).from(venues).where(eq(venues.id, r.venueId)).limit(1))[0];
    const p = partenaires().find((x) => x.salle === venue?.slug && x.webhook);
    if (!p?.webhook) return;
    const donnees = await reservationPourPartenaire(id);
    if (!donnees) return;
    const corps = JSON.stringify({ type: "reservation", reservation: donnees });
    const horodatage = String(Math.floor(Date.now() / 1000));
    const signature = crypto.createHmac("sha256", p.cle).update(`${horodatage}.${corps}`).digest("hex");
    await fetch(p.webhook, {
      method: "POST",
      headers: { "content-type": "application/json", "x-mb-horodatage": horodatage, "x-mb-signature": `sha256=${signature}` },
      body: corps,
      signal: AbortSignal.timeout(6000),
    });
  } catch (e) {
    console.error("Publication de la réservation au partenaire :", (e as Error).message);
  }
}
