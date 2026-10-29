import { useSyncExternalStore } from "react";

/* Favoris : une commodité propre à ce téléphone, gardée dans le navigateur. */
const CLE_FAVORIS = "mb.favoris";
const lireFavoris = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(CLE_FAVORIS) ?? "[]") as string[];
  } catch {
    return [];
  }
};
const ecouteurs = new Set<() => void>();

export function useFavori(slug: string): [boolean, () => void] {
  const favori = useSyncExternalStore(
    (cb) => {
      ecouteurs.add(cb);
      return () => ecouteurs.delete(cb);
    },
    () => lireFavoris().includes(slug),
    () => false,
  );
  const basculer = () => {
    const liste = lireFavoris();
    const suivante = liste.includes(slug) ? liste.filter((s) => s !== slug) : [...liste, slug];
    try {
      localStorage.setItem(CLE_FAVORIS, JSON.stringify(suivante));
    } catch {
      /* stockage indisponible : le cœur ne se souviendra pas */
    }
    ecouteurs.forEach((cb) => cb());
  };
  return [favori, basculer];
}
