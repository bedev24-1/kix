"use client";

import { useSyncExternalStore } from "react";

/**
 * Une horloge qui avance tous les cinquièmes de seconde, pour le chrono de coup.
 * `actif` à faux : elle ne bat pas (rien ne tourne, rien à redessiner).
 */
const PAS = 200;
let abonnes = 0;
let minuterie: number | undefined;
const ecouteurs = new Set<() => void>();

function abonner(f: () => void) {
  ecouteurs.add(f);
  if (abonnes++ === 0) minuterie = window.setInterval(() => ecouteurs.forEach((g) => g()), PAS);
  return () => {
    ecouteurs.delete(f);
    if (--abonnes === 0) window.clearInterval(minuterie);
  };
}
const lire = () => Math.floor(Date.now() / PAS) * PAS;
const rien = () => () => {};

export function useHorloge(actif: boolean): number {
  return useSyncExternalStore(actif ? abonner : rien, lire, () => 0);
}

/**
 * Les secondes restantes au chrono. Le serveur donne la fin du coup sur son
 * horloge, et l'instant où il a construit l'état (`maintenant`) ; le navigateur
 * sait quand il l'a reçu (`recu`). On compte donc le temps écoulé depuis la
 * réception, sans dépendre de l'heure du téléphone.
 */
export function resteChrono(
  c: { fin: number | null; reste: number | null } | null,
  horloge: number,
  maintenant: number,
  recu: number | null,
): number | null {
  if (!c) return null;
  if (c.fin === null) return c.reste;
  const ecoule = recu !== null && horloge ? Math.max(0, horloge - recu) : 0;
  return Math.max(0, (c.fin - maintenant - ecoule) / 1000);
}
