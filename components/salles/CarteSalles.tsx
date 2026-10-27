"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Map as CarteLeaflet, Marker } from "leaflet";
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
// Tuiles CARTO « Voyager » : lisibles en thème clair comme en sombre, sans clé.
const TUILES = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

const echapper = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Le repère d'une salle : une pastille, et le nombre de joueurs actifs s'il y en a. */
function pastille(actifs: number) {
  const badge = actifs > 0
    ? `<span style="position:absolute;top:-8px;right:-10px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#1fa37a;color:#fff;font:600 11px/20px system-ui;text-align:center;box-shadow:0 0 0 2px #fff">${actifs}</span>`
    : "";
  return `<span style="position:relative;display:grid;place-items:center;width:30px;height:30px;border-radius:999px 999px 999px 4px;transform:rotate(-45deg);background:#d4a017;box-shadow:0 4px 12px rgba(0,0,0,.35)"><span style="transform:rotate(45deg);font:700 13px system-ui;color:#1a1408">8</span></span>${badge}`;
}

/**
 * La carte des salles partenaires.
 *
 * Chaque salle placée par son gérant y figure, avec le nombre de joueurs qui
 * y jouent en ce moment. « Ma position » mesure la distance de chacune.
 */
export function CarteSalles({ salles, hauteur = 320 }: { salles: SalleSurCarte[]; hauteur?: number }) {
  const boite = useRef<HTMLDivElement>(null);
  const carte = useRef<CarteLeaflet | null>(null);
  const [moi, setMoi] = useState<Point | null>(null);
  const [erreur, setErreur] = useState<string>();

  useEffect(() => {
    let annule = false;
    const marqueurs: Marker[] = [];
    (async () => {
      const L = (await import("leaflet")).default;
      if (annule || !boite.current || carte.current) return;
      const m = L.map(boite.current, { zoomControl: false, attributionControl: true }).setView(
        [CENTRE_DEFAUT.lat, CENTRE_DEFAUT.lng], 12,
      );
      L.control.zoom({ position: "bottomright" }).addTo(m);
      L.tileLayer(TUILES, { attribution: ATTRIBUTION, maxZoom: 19, subdomains: "abcd" }).addTo(m);
      for (const s of salles) {
        const icone = L.divIcon({ html: pastille(s.actifs), className: "", iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28] });
        const popup = `
          <div style="font:13px system-ui;min-width:170px">
            <strong style="font-size:14px">${echapper(s.name)}</strong><br>
            <span style="color:#666">${echapper(s.area)}</span><br>
            <span style="color:${s.actifs ? "#1fa37a" : "#888"}">${s.actifs ? `${s.actifs} joueur${s.actifs > 1 ? "s" : ""} en ce moment` : "Personne de signalé"}</span>
            <div style="display:flex;gap:8px;margin-top:8px">
              <a href="/app/salles/${encodeURIComponent(s.slug)}" style="font-weight:600">Voir la salle</a>
              <a href="${lienItineraire(s)}" target="_blank" rel="noreferrer">Itinéraire</a>
            </div>
          </div>`;
        marqueurs.push(L.marker([s.lat, s.lng], { icon: icone, title: s.name }).bindPopup(popup).addTo(m));
      }
      if (salles.length > 1) m.fitBounds(L.latLngBounds(salles.map((s) => [s.lat, s.lng])), { padding: [40, 40], maxZoom: 15 });
      else if (salles.length === 1) m.setView([salles[0].lat, salles[0].lng], 15);
      carte.current = m;
    })();
    return () => {
      annule = true;
      marqueurs.length = 0;
      carte.current?.remove();
      carte.current = null;
    };
  }, [salles]);

  // Ma position : un point bleu, et la vue qui l'inclut.
  useEffect(() => {
    if (!moi || !carte.current) return;
    let point: { remove: () => void } | null = null;
    (async () => {
      const L = (await import("leaflet")).default;
      if (!carte.current) return;
      point = L.circleMarker([moi.lat, moi.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#2f7cf6", fillOpacity: 1 }).addTo(carte.current);
      carte.current.setView([moi.lat, moi.lng], Math.max(carte.current.getZoom(), 13));
    })();
    return () => point?.remove();
  }, [moi]);

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
        <div ref={boite} className="absolute inset-0 z-0" />
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
