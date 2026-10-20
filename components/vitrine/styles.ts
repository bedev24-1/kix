/**
 * Les matières de la vitrine : noir profond, néons, grain photographique.
 *
 * Chaque événement tire sa propre palette de son adresse : deux soirées
 * n'ont donc pas la même page, sans que personne ait à choisir une couleur.
 */
export type Palette = { a: string; b: string; c: string; fond: string };

const PALETTES: Palette[] = [
  { a: "#ff2e88", b: "#7b2ff7", c: "#ffd60a", fond: "#2a0a6b" }, // rose, violet, jaune
  { a: "#00e5ff", b: "#3d5afe", c: "#ff3d71", fond: "#06194d" }, // cyan, bleu, corail
  { a: "#ff6b00", b: "#ff1744", c: "#ffe600", fond: "#4a0612" }, // feu
  { a: "#00ffa3", b: "#00b3ff", c: "#d4ff00", fond: "#03302a" }, // néon vert
  { a: "#c400ff", b: "#ff00a8", c: "#00e0ff", fond: "#2b0040" }, // magenta
  { a: "#ffb300", b: "#ff3d00", c: "#ff80ab", fond: "#3a1400" }, // or
];

export function palette(cle: string): Palette {
  let h = 0;
  for (const c of cle) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTES[h % PALETTES.length];
}

/** Un grain fin, en SVG inline : aucun fichier à charger. */
export const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")";

/** Le nuage de néon des grandes cartes. */
export const nuage = (p: Palette) => `radial-gradient(40% 55% at 30% 45%, ${p.c}cc 0%, transparent 60%),
  radial-gradient(45% 60% at 55% 50%, ${p.a} 0%, transparent 65%),
  radial-gradient(50% 70% at 75% 40%, ${p.b} 0%, transparent 70%),
  radial-gradient(60% 80% at 20% 80%, ${p.fond} 0%, transparent 70%), #07030f`;
