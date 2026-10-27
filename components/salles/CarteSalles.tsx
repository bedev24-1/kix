"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as CarteMapLibre, Marker, Popup } from "maplibre-gl";
import { replierAttribution, styleDuTheme, suivreTheme } from "./tuiles";
import { demanderPosition, useMaPosition } from "./position";
import { calculerItineraire, dureeLisible, type Itineraire, type Mode } from "./itineraire";
import { distanceLisible, distanceM, type Point } from "@/lib/salles-geo";
import { cn } from "@/lib/cn";

export type SalleSurCarte = {
  id: string;
  slug: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  actifs: number;
};

/** Douala, quand ni ma position ni aucune salle ne sont connues. */
export const CENTRE_DEFAUT: Point = { lat: 4.0511, lng: 9.7679 };

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

/** Mon point bleu. */
function pointBleu() {
  const el = document.createElement("span");
  el.setAttribute("aria-label", "Ma position");
  el.style.cssText = "display:block;width:18px;height:18px;border-radius:999px;background:#2f7cf6;border:3px solid #fff;box-shadow:0 0 0 7px rgba(47,124,246,.22),0 2px 8px rgba(0,0,0,.4)";
  return el;
}

/** Le contenu de la bulle d'une salle (DOM, pour brancher le bouton d'itinéraire). */
function bulle(s: SalleSurCarte, onItineraire: () => void) {
  const el = document.createElement("div");
  el.className = "carte-bulle";
  const ligne = (texte: string, classe: string) => {
    const span = document.createElement("span");
    span.className = classe;
    span.textContent = texte;
    el.append(span);
    return span;
  };
  const titre = document.createElement("strong");
  titre.textContent = s.name;
  el.append(titre);
  const lieu = ligne(s.area, "carte-bulle-muet");
  ligne(
    s.actifs ? `${s.actifs} joueur${s.actifs > 1 ? "s" : ""} en ce moment` : "Personne de signalé",
    s.actifs ? "carte-bulle-actifs" : "carte-bulle-muet",
  );
  const liens = document.createElement("div");
  liens.className = "carte-bulle-liens";
  const voir = document.createElement("a");
  voir.href = `/app/salles/${encodeURIComponent(s.slug)}`;
  voir.textContent = "Voir la salle";
  const aller = document.createElement("button");
  aller.type = "button";
  aller.textContent = "Itinéraire";
  aller.onclick = onItineraire;
  liens.append(voir, aller);
  el.append(liens);
  return { el, lieu };
}

/** Pose (ou met à jour) le tracé de l'itinéraire. À refaire après chaque changement de style. */
function dessinerRoute(m: CarteMapLibre, itin: Itineraire | null, essai = 0) {
  // isStyleLoaded() reste faux tant que des tuiles chargent : on repasse quand la carte est au repos.
  if (!m.isStyleLoaded()) {
    if (essai < 5) m.once("idle", () => dessinerRoute(m, itin, essai + 1));
    return;
  }
  const data = {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates: itin?.coords ?? [] },
  };
  const src = m.getSource("itineraire") as GeoJSONSource | undefined;
  if (src) {
    src.setData(data);
    return;
  }
  m.addSource("itineraire", { type: "geojson", data });
  const layout = { "line-cap": "round", "line-join": "round" } as const;
  m.addLayer({ id: "itineraire-bord", type: "line", source: "itineraire", layout, paint: { "line-color": "#04110c", "line-width": 9, "line-opacity": 0.5 } });
  m.addLayer({ id: "itineraire", type: "line", source: "itineraire", layout, paint: { "line-color": "#e0b43a", "line-width": 5 } });
}

/**
 * La carte des salles partenaires.
 *
 * Ma position y est d'office (point bleu), avec les salles les plus proches
 * suggérées en bas. Toucher une salle ouvre sa bulle ; « Itinéraire » trace le
 * chemin depuis ma position, en voiture ou à pied, sans quitter l'app.
 * `destination` : la salle vers laquelle tracer dès que ma position est connue.
 */
export function CarteSalles({
  salles,
  hauteur = 340,
  destination,
}: {
  salles: SalleSurCarte[];
  hauteur?: number;
  destination?: string;
}) {
  const boite = useRef<HTMLDivElement>(null);
  const carte = useRef<CarteMapLibre | null>(null);
  const bulles = useRef(new Map<string, Popup>());
  const moiMarqueur = useRef<Marker | null>(null);
  const itinRef = useRef<Itineraire | null>(null);
  const cadre = useRef(false);
  const autoTrace = useRef(false);
  const requete = useRef<AbortController | null>(null);

  const { point: moi, statut } = useMaPosition();
  const moiRef = useRef<Point | null>(null);
  useEffect(() => {
    moiRef.current = moi;
  }, [moi]);

  const [prete, setPrete] = useState(false);
  const [cible, setCible] = useState<SalleSurCarte | null>(null);
  const [itin, setItin] = useState<Itineraire | null>(null);
  const [mode, setMode] = useState<Mode>("voiture");
  const [calcul, setCalcul] = useState(false);
  const [erreur, setErreur] = useState<string>();

  const tracer = useCallback(async (s: SalleSurCarte, m: Mode) => {
    setCible(s);
    setMode(m);
    setErreur(undefined);
    bulles.current.get(s.id)?.remove();
    const depart = moiRef.current;
    if (!depart) {
      demanderPosition();
      setErreur("Active ta position pour tracer l'itinéraire jusqu'à la salle.");
      return;
    }
    requete.current?.abort();
    const ctrl = new AbortController();
    requete.current = ctrl;
    setCalcul(true);
    try {
      const r = await calculerItineraire(depart, s, m, ctrl.signal);
      itinRef.current = r;
      setItin(r);
      const c = carte.current;
      if (c) {
        dessinerRoute(c, r);
        const ml = await import("maplibre-gl");
        const b = new ml.LngLatBounds();
        for (const p of r.coords) b.extend(p);
        c.fitBounds(b, { padding: { top: 150, bottom: 40, left: 40, right: 70 }, maxZoom: 16 });
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setErreur((e as Error).message);
    } finally {
      if (requete.current === ctrl) setCalcul(false);
    }
  }, []);
  const tracerRef = useRef(tracer);

  const effacer = () => {
    requete.current?.abort();
    itinRef.current = null;
    setItin(null);
    setCible(null);
    setErreur(undefined);
    setCalcul(false);
    if (carte.current) dessinerRoute(carte.current, null);
  };

  // La carte et les salles.
  useEffect(() => {
    let annule = false;
    let arreterTheme = () => {};
    const popups = bulles.current;
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
      // Un changement de thème remplace le style : on y repose le tracé.
      m.on("style.load", () => dessinerRoute(m, itinRef.current));
      for (const s of salles) {
        const { el, lieu } = bulle(s, () => tracerRef.current(s, "voiture"));
        const popup = new ml.Popup({ offset: 26, maxWidth: "250px" }).setDOMContent(el);
        popup.on("open", () => {
          const p = moiRef.current;
          lieu.textContent = p ? `${s.area} · à ${distanceLisible(distanceM(p, s))} de toi` : s.area;
        });
        popups.set(s.id, popup);
        new ml.Marker({ element: pastille(s), anchor: "bottom" }).setLngLat([s.lng, s.lat]).setPopup(popup).addTo(m);
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
      requete.current?.abort();
      popups.clear();
      moiMarqueur.current = null;
      cadre.current = false;
      carte.current?.remove();
      carte.current = null;
      setPrete(false);
    };
  }, [salles]);

  // Ma position : le point bleu, et la première fois, une vue qui me montre avec les salles proches.
  useEffect(() => {
    const m = carte.current;
    if (!prete || !m || !moi) return;
    (async () => {
      const ml = await import("maplibre-gl");
      if (moiMarqueur.current) moiMarqueur.current.setLngLat([moi.lng, moi.lat]);
      else moiMarqueur.current = new ml.Marker({ element: pointBleu() }).setLngLat([moi.lng, moi.lat]).addTo(m);
      if (cadre.current || itinRef.current) return;
      cadre.current = true;
      const proches = destination
        ? salles.filter((s) => s.id === destination)
        : [...salles].sort((a, b) => distanceM(moi, a) - distanceM(moi, b)).slice(0, 3);
      if (!proches.length) {
        m.easeTo({ center: [moi.lng, moi.lat], zoom: 14 });
        return;
      }
      const b = new ml.LngLatBounds([moi.lng, moi.lat], [moi.lng, moi.lat]);
      for (const s of proches) b.extend([s.lng, s.lat]);
      m.fitBounds(b, { padding: { top: 70, bottom: 70, left: 50, right: 50 }, maxZoom: 15 });
    })();
  }, [moi, prete, salles, destination]);

  // La page d'une salle : l'itinéraire se trace tout seul dès que ma position est connue.
  useEffect(() => {
    if (!destination || !prete || !moi || autoTrace.current) return;
    const s = salles.find((x) => x.id === destination);
    if (!s) return;
    autoTrace.current = true;
    void tracerRef.current(s, "voiture");
  }, [destination, prete, moi, salles]);

  const recentrer = () => {
    if (!moi) {
      demanderPosition();
      return;
    }
    carte.current?.easeTo({ center: [moi.lng, moi.lat], zoom: Math.max(carte.current.getZoom(), 14) });
  };

  const montrer = (s: SalleSurCarte) => {
    const m = carte.current;
    if (!m) return;
    m.easeTo({ center: [s.lng, s.lat], zoom: Math.max(m.getZoom(), 14) });
    const popup = bulles.current.get(s.id);
    if (popup && !popup.isOpen()) popup.setLngLat([s.lng, s.lat]).addTo(m);
  };

  const suggestions = moi && !cible && salles.length > 1 && !destination
    ? [...salles].map((s) => ({ s, d: distanceM(moi, s) })).sort((a, b) => a.d - b.d).slice(0, 3)
    : [];

  return (
    <div className="flex flex-col gap-2">
      <div className="relative isolate overflow-hidden rounded-panel border border-line" style={{ height: hauteur }}>
        <div ref={boite} className="h-full w-full" />

        {cible ? (
          <div className="glass-strong absolute inset-x-3 top-3 z-[500] flex flex-col gap-2 rounded-card px-3.5 py-3 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[12px] text-muted">Depuis ta position vers {cible.name}</span>
                <span className="text-[17px] font-semibold leading-tight">
                  {calcul ? "Calcul de l'itinéraire…" : itin ? `${dureeLisible(itin.dureeS)} · ${distanceLisible(itin.distanceM)}` : "En attente de ta position"}
                </span>
              </span>
              <button type="button" onClick={effacer} aria-label="Fermer l'itinéraire" className="press -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted">
                ✕
              </button>
            </div>
            <div className="flex gap-1.5">
              {(["voiture", "pied"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => tracer(cible, m)}
                  className={cn(
                    "press rounded-full px-3 py-1.5 text-[12px] font-semibold",
                    mode === m ? "bg-gold text-gold-ink" : "border border-line text-muted",
                  )}
                >
                  {m === "voiture" ? "Voiture / moto" : "À pied"}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={recentrer}
            className="press glass-strong absolute left-3 top-3 z-[500] flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold shadow"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[#2f7cf6] ring-2 ring-white" />
            {statut === "recherche" && !moi ? "Recherche…" : "Ma position"}
          </button>
        )}

        {suggestions.length ? (
          <div className="absolute inset-x-0 bottom-3 z-[500] flex gap-2 overflow-x-auto px-3 pr-16">
            {suggestions.map(({ s, d }) => (
              <button
                key={s.id}
                type="button"
                onClick={() => montrer(s)}
                className="press glass-strong flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] shadow"
              >
                <span className="font-semibold">{s.name}</span>
                <span className="text-muted">{distanceLisible(d)}</span>
              </button>
            ))}
          </div>
        ) : null}

        {salles.length === 0 ? (
          <div className="absolute inset-x-3 bottom-3 z-[500] rounded-card bg-bg/90 px-3 py-2 text-[12px] text-muted">
            Aucune salle n&apos;a encore été placée sur la carte.
          </div>
        ) : null}
      </div>
      {erreur ? <p className="text-[12px] text-warn">{erreur}</p> : null}
      {statut === "refusee" ? (
        <p className="text-[12px] text-muted">
          Position refusée : autorise la localisation pour te voir sur la carte, connaître les distances et tracer l&apos;itinéraire.
        </p>
      ) : null}
    </div>
  );
}
