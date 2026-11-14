import { reservationsDeLaSalle, salleAppelante } from "@/lib/partenaires";

export const dynamic = "force-dynamic";

/**
 * Les réservations Master Break d'une salle partenaire, à partir d'une date (par défaut : hier).
 * Sert de rattrapage : la salle reçoit déjà chaque réservation dès qu'elle change.
 *   GET /api/partenaires/reservations?depuis=2026-11-14T00:00:00Z
 *   Authorization: Bearer <clé de la salle>
 */
export async function GET(request: Request) {
  const salle = await salleAppelante(request);
  if (!salle) return Response.json({ erreur: "Clé de salle invalide." }, { status: 401 });
  const brut = new URL(request.url).searchParams.get("depuis");
  const depuis = brut ? new Date(brut) : new Date(Date.now() - 24 * 3600_000);
  if (Number.isNaN(depuis.getTime())) return Response.json({ erreur: "Date « depuis » invalide." }, { status: 400 });
  return Response.json({ salle: salle.venue.slug, reservations: await reservationsDeLaSalle(salle.venue.id, depuis) });
}
