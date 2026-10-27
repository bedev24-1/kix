import type { Point } from "@/lib/salles-geo";

/**
 * L'itinéraire jusqu'à la salle, tracé dans l'app.
 *
 * Calcul par le service OSRM public de la FOSSGIS (routing.openstreetmap.de),
 * sur les routes d'OpenStreetMap : gratuit, sans clé, en voiture ou à pied.
 */
export type Mode = "voiture" | "pied";
export type Itineraire = { coords: [number, number][]; distanceM: number; dureeS: number; mode: Mode };

const PROFIL: Record<Mode, string> = { voiture: "routed-car", pied: "routed-foot" };

export async function calculerItineraire(depart: Point, arrivee: Point, mode: Mode, signal?: AbortSignal): Promise<Itineraire> {
  const pts = `${depart.lng.toFixed(6)},${depart.lat.toFixed(6)};${arrivee.lng.toFixed(6)},${arrivee.lat.toFixed(6)}`;
  const r = await fetch(
    `https://routing.openstreetmap.de/${PROFIL[mode]}/route/v1/driving/${pts}?overview=full&geometries=geojson`,
    { signal },
  );
  if (!r.ok) throw new Error("Itinéraire indisponible pour le moment.");
  const d = (await r.json()) as { code: string; routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[] };
  const route = d.routes?.[0];
  if (d.code !== "Ok" || !route) throw new Error("Aucun chemin trouvé jusqu'à cette salle.");
  return { coords: route.geometry.coordinates, distanceM: route.distance, dureeS: route.duration, mode };
}

/** « 4 min », « 1 h 05 ». */
export function dureeLisible(s: number): string {
  const min = Math.max(1, Math.round(s / 60));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}
