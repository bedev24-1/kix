"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as CarteMapLibre, Marker } from "maplibre-gl";
import { replierAttribution, styleDuTheme, suivreTheme } from "./tuiles";
import { distanceLisible, distanceM, lienItineraire, type Point } from "@/lib/salles-geo";

export type SalleSurCarte = {
  id: string;
  slug: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  actifs: number;
};

/** Douala, quand aucune salle n'est encore placée. */
export const CENTRE_DEFAUT: Point = { lat: 4.0511, lng: 9.7679 };

const echapper = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Le repère d'une salle : une pastille, et le nombre de joueurs actifs s'il y en a. */
function pastille(s: SalleSurCarte) {
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("aria-label", s.name);
  el.style.cssText = "position:relative;width:30px;height:30px;padding:0;border:0;background:none;cursor:pointer";
  const badge = s.actifs > 0
    ? `<span style="position:absolute;top:-8px;right:-10px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:var(--mb-jade);color:#fff;font:600 11px/20px system-ui;text-align:center;box-shadow:0 0 0 2px var(--mb-bg)">${s.actifs}</span>`
    : "";
  el.innerHTML = `<span style="display:grid;place-items:center;width:30px;height:30px;border-radius:999px 999px 999px 4px;transform:rotate(-45deg);background:var(--mb-gold);box-shadow:0 4px 14px rgba(0,0,0,.45)"><span style="transform:rotate(45deg);font:700 13px system-ui;color:var(--mb-gold-ink)">8</span></span>${badge}`;
  return el;
}

function bulle(s: SalleSurCarte) {
  return `
    <div class="carte-bulle">
      <strong>${echapper(s.name)}</strong>
      <span class="carte-bulle-muet">${echapper(s.area)}</span>
      <span class="${s.actifs ? "carte-bulle-actifs" : "carte-bulle-muet"}">${s.actifs ? `${s.actifs} joueur${s.actifs > 1 ? "s" : ""} en ce moment` : "Personne de signalé"}</span>
      <div class="carte-bulle-liens">
        <a href="/app/salles/${encodeURIComponent(s.slug)}">Voir la salle</a>
        <a href="${lienItineraire(s)}" target="_blank" rel="noreferrer">Itinéraire</a>
      </div>
    </div>`;
}

/**
 * La carte des salles partenaires.
 *
 * Chaque salle placée par son gérant y figure, avec le nombre de joueurs qui
 * y jouent en ce moment. « Ma position » mesure la distance de chacune.
 */
export function CarteSalles({ salles, hauteur = 320 }: { salles: SalleSurCarte[]; hauteur?: number }) {
  const boite = useRef<HTMLDivElement>(null);
  const carte = useRef<CarteMapLibre | null>(null);
  const [prete, setPrete] = useState(false);
  const [moi, setMoi] = useState<Point | null>(null);
  const [erreur, setErreur] = useState<string>();

  useEffect(() => {
    let annule = false;
    let arreterTheme = () => {};
    (async () => {
      const ml = await import("maplibre-gl");
      if (annule || !boite.current || carte.current) return;
      const m = new ml.Map({
        container: boite.current,
        style: styleDuTheme(),
        center: [CENTRE_DEFAUT.lng, CENTRE_DEFAUT.lat],
        zoom: 11.5,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
      m.touchZoomRotate.disableRotation();
      m.addControl(new ml.NavigationControl({ showCompass: false }), "bottom-right");
      arreterTheme = suivreTheme(m);
      replierAttribution(m);
      for (const s of salles) {
        new ml.Marker({ element: pastille(s), anchor: "bottom" })
          .setLngLat([s.lng, s.lat])
          .setPopup(new ml.Popup({ offset: 26, closeButton: true, maxWidth: "240px" }).setHTML(bulle(s)))
          .addTo(m);
      }
      if (salles.length > 1) {
        const b = new ml.LngLatBounds();
        for (const s of salles) b.extend([s.lng, s.lat]);
        m.fitBounds(b, { padding: 48, maxZoom: 15, duration: 0 });
      } else if (salles.length === 1) m.jumpTo({ center: [salles[0].lng, salles[0].lat], zoom: 15 });
      carte.current = m;
      setPrete(true);
    })();
    return () => {
      annule = true;
      arreterTheme();
      carte.current?.remove();
      carte.current = null;
      setPrete(false);
    };
  }, [salles]);

  // Ma position : un point bleu, et la vue qui l'inclut.
  useEffect(() => {
    if (!moi || !prete || !carte.current) return;
    let point: Marker | null = null;
    (async () => {
      const ml = await import("maplibre-gl");
      if (!carte.current) return;
      const el = document.createElement("span");
      el.style.cssText = "display:block;width:16px;height:16px;border-radius:999px;background:#2f7cf6;border:3px solid #fff;box-shadow:0 0 0 6px rgba(47,124,246,.25)";
      point = new ml.Marker({ element: el }).setLngLat([moi.lng, moi.lat]).addTo(carte.current);
      carte.current.easeTo({ center: [moi.lng, moi.lat], zoom: Math.max(carte.current.getZoom(), 13) });
    })();
    return () => {
      point?.remove();
    };
  }, [moi, prete]);

  const localiser = () => {
    setErreur(undefined);
    if (!navigator.geolocation) return setErreur("Ce téléphone ne donne pas sa position.");
    navigator.geolocation.getCurrentPosition(
      (p) => setMoi({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setErreur("Position refusée ou indisponible."),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const proches = moi
    ? [...salles].map((s) => ({ s, d: distanceM(moi, s) })).sort((a, b) => a.d - b.d).slice(0, 3)
    : [];

  return (
    <div className="flex flex-col gap-2">
      <div className="relative isolate overflow-hidden rounded-panel border border-line" style={{ height: hauteur }}>
        <div ref={boite} className="h-full w-full" />
        <button
          type="button"
          onClick={localiser}
          className="press absolute left-3 top-3 z-[500] rounded-full bg-bg/90 px-3 py-1.5 text-[12px] font-semibold shadow"
        >
          Ma position
        </button>
        {salles.length === 0 ? (
          <div className="absolute inset-x-3 bottom-3 z-[500] rounded-card bg-bg/90 px-3 py-2 text-[12px] text-muted">
            Aucune salle n&apos;a encore été placée sur la carte.
          </div>
        ) : null}
      </div>
      {erreur ? <p className="text-[12px] text-warn">{erreur}</p> : null}
      {proches.length ? (
        <p className="text-[12px] text-muted">
          Au plus près :{" "}
          {proches.map(({ s, d }, i) => (
            <span key={s.id}>
              {i ? " · " : ""}
              <a href={`/app/salles/${s.slug}`} className="text-ink underline-offset-2 hover:underline">{s.name}</a> {distanceLisible(d)}
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
