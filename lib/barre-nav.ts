import { useSyncExternalStore } from "react";

/**
 * L'état de la barre du bas, partagé entre la barre elle-même et les écrans
 * qui la mettent en scène (l'écran immersif du Shop) :
 *
 *  · `normale`   — la barre telle qu'on la connaît ;
 *  · `rassemblee` — elle s'est resserrée en un seul point, au bout à droite ;
 *  · `montee`    — ce point est monté se poser à côté du premier bouton.
 *
 * Toucher le point la rend : chacun écoute alors `normale`.
 */
export type EtatBarre = "normale" | "rassemblee" | "montee";

let etat: EtatBarre = "normale";
const ecouteurs = new Set<() => void>();

export function poserBarre(suivant: EtatBarre) {
  if (suivant === etat) return;
  etat = suivant;
  ecouteurs.forEach((f) => f());
}

export function useBarre(): EtatBarre {
  return useSyncExternalStore(
    (f) => {
      ecouteurs.add(f);
      return () => ecouteurs.delete(f);
    },
    () => etat,
    () => "normale",
  );
}

/** Un cookie de quelques secondes : le Shop sait qu'on arrive de l'accueil et joue la pièce. */
export function noterDepart(depuis: string) {
  if (depuis !== "/app") return;
  try {
    document.cookie = "mb_depuis=accueil; path=/; max-age=8; samesite=lax";
  } catch {
    /* sans cookie, pas d'animation : rien de grave */
  }
}
