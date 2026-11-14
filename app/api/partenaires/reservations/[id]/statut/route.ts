import { and, eq } from "drizzle-orm";
import { db, reservations, venueTables } from "@/db";
import { notify } from "@/lib/domain";
import { reservationPourPartenaire, salleAppelante } from "@/lib/partenaires";

export const dynamic = "force-dynamic";

const SUIVANTS: Record<string, string[]> = {
  // statut demandé → statuts de départ acceptés
  seated: ["pending", "confirmed"],
  done: ["confirmed", "seated"],
  no_show: ["pending", "confirmed"],
  cancelled: ["pending", "confirmed"],
};

/**
 * La salle partenaire renvoie ce qui s'est passé chez elle : client installé, partie terminée,
 * absent (pas venu 20 minutes après l'heure), ou réservation annulée au comptoir.
 *   POST /api/partenaires/reservations/<id>/statut   { "statut": "seated" | "done" | "no_show" | "cancelled" }
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const salle = await salleAppelante(request);
  if (!salle) return Response.json({ erreur: "Clé de salle invalide." }, { status: 401 });
  const { id } = await params;
  const corps = (await request.json().catch(() => ({}))) as { statut?: string };
  const statut = String(corps.statut || "");
  if (!SUIVANTS[statut]) return Response.json({ erreur: "Statut inconnu." }, { status: 400 });

  const booking = (await db.select().from(reservations).where(and(eq(reservations.id, id), eq(reservations.venueId, salle.venue.id))).limit(1))[0];
  if (!booking) return Response.json({ erreur: "Réservation introuvable." }, { status: 404 });
  if (booking.status === statut) return Response.json({ ok: true, reservation: await reservationPourPartenaire(id) });
  if (!SUIVANTS[statut].includes(booking.status)) return Response.json({ erreur: `Passage impossible de « ${booking.status} » à « ${statut} ».` }, { status: 409 });

  await db
    .update(reservations)
    .set(statut === "seated" ? { status: statut, seatedAt: new Date() } : { status: statut, closedAt: new Date() })
    .where(eq(reservations.id, id));
  if (booking.tableId) {
    await db.update(venueTables).set({ status: statut === "seated" ? "occupied" : "free" }).where(eq(venueTables.id, booking.tableId));
  }
  const MESSAGES: Record<string, [string, string]> = {
    seated: ["Bonne partie", `Ta table est installée chez ${salle.venue.name}.`],
    done: ["Merci pour la partie", `À bientôt chez ${salle.venue.name} !`],
    no_show: ["Réservation libérée", `Tu n'es pas arrivé dans les 20 minutes : la table a été rendue chez ${salle.venue.name}.`],
    cancelled: ["Réservation annulée", `${salle.venue.name} a annulé ta réservation.`],
  };
  await notify(booking.userId, MESSAGES[statut][0], MESSAGES[statut][1], "reservation", "/app/reservations");
  return Response.json({ ok: true, reservation: await reservationPourPartenaire(id) });
}
