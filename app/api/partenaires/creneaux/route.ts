import { and, eq, gte, notInArray } from "drizzle-orm";
import { creneauxExternes, db, venueTables } from "@/db";
import { salleAppelante } from "@/lib/partenaires";

export const dynamic = "force-dynamic";

/**
 * Les créneaux déjà pris chez la salle partenaire (réservations au comptoir…), à venir.
 * La liste envoyée REMPLACE la précédente : un créneau absent de la liste est libéré.
 *   PUT /api/partenaires/creneaux   { "creneaux": [{ "reference": "abc", "table": 3, "debut": "…Z", "fin": "…Z" }] }
 */
export async function PUT(request: Request) {
  const salle = await salleAppelante(request);
  if (!salle) return Response.json({ erreur: "Clé de salle invalide." }, { status: 401 });
  const corps = (await request.json().catch(() => ({}))) as { creneaux?: { reference?: string; table?: number; debut?: string; fin?: string }[] };
  const liste = Array.isArray(corps.creneaux) ? corps.creneaux.slice(0, 500) : [];
  const tables = await db.select().from(venueTables).where(eq(venueTables.venueId, salle.venue.id));
  const parNumero = new Map(tables.map((t) => [Number((t.label.match(/\d+/) || [])[0]) || -1, t.id]));
  const gardes: string[] = [];
  for (const c of liste) {
    const reference = String(c.reference || "").slice(0, 80), tableId = parNumero.get(Number(c.table));
    const debut = new Date(String(c.debut)), fin = new Date(String(c.fin));
    if (!reference || !tableId || Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime()) || fin <= debut) continue;
    gardes.push(reference);
    await db
      .insert(creneauxExternes)
      .values({ venueId: salle.venue.id, tableId, reference, startsAt: debut, endsAt: fin })
      .onConflictDoUpdate({ target: [creneauxExternes.venueId, creneauxExternes.reference], set: { tableId, startsAt: debut, endsAt: fin } });
  }
  // Tout créneau à venir qui n'est plus dans la liste est libéré.
  await db
    .delete(creneauxExternes)
    .where(and(eq(creneauxExternes.venueId, salle.venue.id), gte(creneauxExternes.endsAt, new Date()), ...(gardes.length ? [notInArray(creneauxExternes.reference, gardes)] : [])));
  return Response.json({ ok: true, creneaux: gardes.length });
}
