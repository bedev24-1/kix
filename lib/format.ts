// Séparateur de milliers explicite (espace fine insécable) : le même rendu côté
// serveur et côté navigateur, contrairement à toLocaleString selon l'ICU dispo.
const NNBSP = " ";

export function group(value: number): string {
  const [int, dec] = Math.abs(value).toFixed(0).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
  const sign = value < 0 ? "−" : "";
  return dec ? `${sign}${grouped},${dec}` : `${sign}${grouped}`;
}

/** 1000 -> « 1 000 FCFA » */
export const fcfa = (value: number) => `${group(value)} FCFA`;

/** 1000 -> « 1 000 F » (formes courtes : cartes, listes) */
export const f = (value: number) => `${group(value)} F`;

/** 7 -> « 07 » : les soldes de jetons se lisent sur deux chiffres. */
export const pad2 = (value: number) => String(value).padStart(2, "0");


export function clockFrom(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
