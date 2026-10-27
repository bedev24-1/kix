/**
 * La géographie des salles : distances et présence sur place.
 *
 * Pur, sans base ni navigateur : la page, la carte et les actions serveur
 * font le même calcul, et donnent donc la même réponse.
 */

/** À moins de cette distance de la salle, on peut dire « je suis là ». */
export const RAYON_PRESENCE_M = 300;
/** Une présence s'éteint seule au bout de ce temps. */
export const DUREE_PRESENCE_H = 3;
/** Pas plus de joueurs invités d'un coup parmi les présents : on invite, on ne diffuse pas. */
export const INVITES_MAX = 8;

export type Point = { lat: number; lng: number };

/** Une position plausible (et pas le 0,0 d'un téléphone qui n'a rien trouvé). */
export function positionValide(lat: unknown, lng: unknown): lat is number {
  const a = Number(lat), b = Number(lng);
  return (
    Number.isFinite(a) && Number.isFinite(b) &&
    a >= -90 && a <= 90 && b >= -180 && b <= 180 &&
    !(Math.abs(a) < 1e-6 && Math.abs(b) < 1e-6)
  );
}

/** Distance à vol d'oiseau, en mètres (formule de haversine). */
export function distanceM(a: Point, b: Point): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** « 350 m », « 2,4 km », « 18 km ». */
export function distanceLisible(m: number): string {
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  const km = m / 1000;
  return `${km < 10 ? km.toFixed(1).replace(".", ",") : Math.round(km)} km`;
}

/**
 * Peut-on se déclarer présent ? Si la salle a une position, il faut être dans
 * le rayon ; sans position connue, on fait confiance (le gérant n'a pas encore
 * placé sa salle, ce n'est pas au joueur d'en pâtir).
 */
export function verdictPresence(
  salle: { latitude: number | null; longitude: number | null },
  moi: Point | null,
): { ok: true; distance: number | null } | { ok: false; raison: string } {
  if (salle.latitude == null || salle.longitude == null) return { ok: true, distance: null };
  if (!moi) return { ok: false, raison: "Active ta position pour confirmer que tu es à la salle." };
  const d = distanceM(moi, { lat: salle.latitude, lng: salle.longitude });
  if (d > RAYON_PRESENCE_M) {
    return { ok: false, raison: `Tu es à ${distanceLisible(d)} de la salle : rapproche-toi pour te signaler présent.` };
  }
  return { ok: true, distance: d };
}
