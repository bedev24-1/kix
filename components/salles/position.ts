"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Point } from "@/lib/salles-geo";

/**
 * Ma position, partagée par toute la page : la carte, les distances des
 * salles et la liste « près de toi » lisent la même, et le GPS n'est suivi
 * qu'une fois.
 *
 * La dernière position connue est gardée sur le téléphone une demi-heure :
 * en revenant sur la page, les distances s'affichent tout de suite, puis se
 * précisent quand le GPS répond.
 */
export type MaPosition = {
  point: Point | null;
  statut: "inconnue" | "recherche" | "ok" | "refusee" | "indisponible";
};

const CLE = "mb.position";
const VALIDITE_MS = 30 * 60 * 1000;
const VIDE: MaPosition = { point: null, statut: "inconnue" };

let etat: MaPosition = VIDE;
let lu = false;
let suivi: number | null = null;
const abonnes = new Set<() => void>();

function changer(e: MaPosition) {
  etat = e;
  abonnes.forEach((f) => f());
}

function lireCache() {
  if (lu) return;
  lu = true;
  try {
    const brut = JSON.parse(localStorage.getItem(CLE) ?? "null") as { lat: number; lng: number; t: number } | null;
    if (brut && Date.now() - brut.t < VALIDITE_MS) etat = { point: { lat: brut.lat, lng: brut.lng }, statut: "ok" };
  } catch {
    /* rien en cache : on attend le GPS */
  }
}

function abonner(f: () => void) {
  abonnes.add(f);
  return () => abonnes.delete(f);
}

const lire = () => {
  lireCache();
  return etat;
};

/** Lance le suivi GPS (le navigateur demande l'autorisation la première fois). */
export function demanderPosition() {
  if (suivi !== null || typeof navigator === "undefined") return;
  if (!navigator.geolocation) return changer({ ...etat, statut: "indisponible" });
  if (!etat.point) changer({ ...etat, statut: "recherche" });
  suivi = navigator.geolocation.watchPosition(
    (p) => {
      const point = { lat: p.coords.latitude, lng: p.coords.longitude };
      // Un pas de quelques mètres ne vaut pas de tout recalculer.
      const avant = etat.point;
      if (avant && etat.statut === "ok" && Math.abs(avant.lat - point.lat) < 1e-4 && Math.abs(avant.lng - point.lng) < 1e-4) return;
      changer({ point, statut: "ok" });
      try {
        localStorage.setItem(CLE, JSON.stringify({ ...point, t: Date.now() }));
      } catch {
        /* stockage plein ou bloqué : tant pis pour le cache */
      }
    },
    (err) => {
      if (suivi !== null) navigator.geolocation.clearWatch(suivi);
      suivi = null;
      changer({ ...etat, statut: err.code === err.PERMISSION_DENIED ? "refusee" : etat.point ? "ok" : "indisponible" });
    },
    { enableHighAccuracy: true, maximumAge: 60_000, timeout: 20_000 },
  );
}

/**
 * Ma position. `demander` :
 *  - "toujours" : la page a besoin de la position (carte, salles), on la demande ;
 *  - "si_autorisee" : on ne s'en sert que si le joueur l'a déjà permise.
 */
export function useMaPosition(demander: "toujours" | "si_autorisee" = "toujours"): MaPosition {
  const e = useSyncExternalStore(abonner, lire, () => VIDE);
  useEffect(() => {
    if (demander === "toujours") {
      demanderPosition();
      return;
    }
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((p) => {
        if (p.state === "granted") demanderPosition();
      })
      .catch(() => {});
  }, [demander]);
  return e;
}
