import { and, eq, sql } from "drizzle-orm";
import { db, venues, venueTables } from "@/db";
import { uid } from "@/lib/domain";
import { salleAppelante } from "@/lib/partenaires";

export const dynamic = "force-dynamic";

/**
 * La salle partenaire envoie l'état de ses tables, par numéro : « Billard 3 » est la table n° 3.
 * Une table qui n'existe pas encore chez Master Break est créée (5 000 F de l'heure).
 *   PUT /api/partenaires/tables   { "tables": [{ "numero": 3, "etat": "free" | "occupied" | "closed", "places": 4 }] }
 */
export async function PUT(request: Request) {
  const salle = await salleAppelante(request);
  if (!salle) return Response.json({ erreur: "Clé de salle invalide." }, { status: 401 });
  const corps = (await request.json().catch(() => ({}))) as { tables?: { numero?: number; etat?: string; places?: number }[] };
  const liste = Array.isArray(corps.tables) ? corps.tables.slice(0, 100) : [];
  const existantes = await db.select().from(venueTables).where(eq(venueTables.venueId, salle.venue.id));
  const numeroDe = (label: string) => Number((label.match(/\d+/) || [])[0]) || null;
  let maj = 0;
  for (const t of liste) {
    const numero = Number(t.numero);
    if (!Number.isInteger(numero) || numero < 1 || numero > 999) continue;
    const etat = ["free", "occupied", "closed"].includes(String(t.etat)) ? String(t.etat) : "free";
    const ici = existantes.find((x) => numeroDe(x.label) === numero);
    if (ici) {
      // Une table retenue en ligne reste « retenue » tant que la salle ne la déclare pas occupée.
      const status = etat === "free" && ici.status === "reserved" ? "reserved" : etat;
      await db.update(venueTables).set({ status, ...(t.places ? { seats: Number(t.places) } : {}), active: true }).where(eq(venueTables.id, ici.id));
    } else {
      await db.insert(venueTables).values({ id: uid(), venueId: salle.venue.id, label: `Billard ${numero}`, kind: "pool", hourlyRate: 5000, deposit: 0, status: etat, seats: Number(t.places) || 4, sort: numero, active: true });
    }
    maj++;
  }
  const libres = await db.select({ n: sql<number>`count(*)` }).from(venueTables).where(and(eq(venueTables.venueId, salle.venue.id), eq(venueTables.status, "free"), eq(venueTables.active, true)));
  await db.update(venues).set({ freeTables: Number(libres[0]?.n ?? 0) }).where(eq(venues.id, salle.venue.id));
  return Response.json({ ok: true, tables: maj });
}
