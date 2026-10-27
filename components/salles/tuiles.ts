import type { Map as CarteMapLibre } from "maplibre-gl";

/**
 * Le fond de carte, accordé au thème de l'app.
 *
 * OpenFreeMap : cartes vectorielles OpenStreetMap, gratuites, sans clé
 * d'API ni compte, usage commercial permis. « Dark » en thème sombre,
 * « Positron » en clair. La carte suit le bouton de thème sans se recharger :
 * seul le style change, les repères restent en place.
 */
const STYLES = {
  dark: "https://tiles.openfreemap.org/styles/dark",
  light: "https://tiles.openfreemap.org/styles/positron",
} as const;

export const themeActuel = () => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
export const styleDuTheme = () => STYLES[themeActuel()];

/** Garde la carte au thème ; renvoie de quoi arrêter de suivre. */
export function suivreTheme(carte: CarteMapLibre): () => void {
  let actuel = styleDuTheme();
  const obs = new MutationObserver(() => {
    const voulu = styleDuTheme();
    if (voulu === actuel) return;
    actuel = voulu;
    carte.setStyle(voulu);
  });
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

/** L'attribution compacte s'ouvre d'elle-même au chargement : on la replie en « i ». */
export function replierAttribution(carte: CarteMapLibre) {
  carte.once("load", () => {
    carte.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
  });
}
