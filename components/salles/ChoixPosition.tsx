"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Map as CarteMapLibre, Marker } from "maplibre-gl";
import { useSnackbar } from "@/components/ui/Snackbar";
import { definirPositionSalle } from "@/lib/actions-salles";
import { positionValide } from "@/lib/salles-geo";
import { CENTRE_DEFAUT } from "./CarteSalles";
import { replierAttribution, styleDuTheme, suivreTheme } from "./tuiles";

/**
 * Placer une salle sur la carte : depuis la salle même (« Ma position
 * actuelle »), d'un toucher sur la carte, ou en collant des coordonnées
 * (Google Maps › appui long › les copier).
 */
export function ChoixPosition({
  venueId,
  latitude,
  longitude,
}: {
  venueId: string;
  latitude: number | null;
  longitude: number | null;
}) {
  const router = useRouter();
  const { notify } = useSnackbar();
  const [pending, start] = useTransition();
  const [lat, setLat] = useState(latitude != null ? String(latitude) : "");
  const [lng, setLng] = useState(longitude != null ? String(longitude) : "");
  const [erreur, setErreur] = useState<string>();
  const boite = useRef<HTMLDivElement>(null);
  const carte = useRef<CarteMapLibre | null>(null);
  const repere = useRef<Marker | null>(null);

  const placer = (a: number, b: number, recentrer = false) => {
    setLat(a.toFixed(6));
    setLng(b.toFixed(6));
    (async () => {
      const ml = await import("maplibre-gl");
      if (!carte.current) return;
      if (repere.current) repere.current.setLngLat([b, a]);
      else {
        const el = document.createElement("span");
        el.style.cssText = "display:block;width:22px;height:22px;border-radius:999px;background:var(--mb-gold);border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.4)";
        repere.current = new ml.Marker({ element: el }).setLngLat([b, a]).addTo(carte.current);
      }
      if (recentrer) carte.current.easeTo({ center: [b, a], zoom: 17 });
    })();
  };

  useEffect(() => {
    let annule = false;
    let arreterTheme = () => {};
    (async () => {
      const ml = await import("maplibre-gl");
      if (annule || !boite.current || carte.current) return;
      const depart = latitude != null && longitude != null ? { lat: latitude, lng: longitude } : CENTRE_DEFAUT;
      const m = new ml.Map({
        container: boite.current,
        style: styleDuTheme(),
        center: [depart.lng, depart.lat],
        zoom: latitude != null ? 17 : 12,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
      m.touchZoomRotate.disableRotation();
      m.addControl(new ml.NavigationControl({ showCompass: false }), "bottom-right");
      m.on("click", (e) => placer(e.lngLat.lat, e.lngLat.lng));
      arreterTheme = suivreTheme(m);
      replierAttribution(m);
      carte.current = m;
      if (latitude != null && longitude != null) placer(latitude, longitude);
    })();
    return () => {
      annule = true;
      arreterTheme();
      carte.current?.remove();
      carte.current = null;
      repere.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ici = () => {
    setErreur(undefined);
    if (!navigator.geolocation) return setErreur("Ce téléphone ne donne pas sa position.");
    navigator.geolocation.getCurrentPosition(
      (p) => placer(p.coords.latitude, p.coords.longitude, true),
      () => setErreur("Position refusée ou indisponible : autorise la localisation."),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  // « 4.0511, 9.7679 » collé d'un coup dans le premier champ.
  const coller = (v: string) => {
    const m = v.match(/(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)/);
    if (m && positionValide(Number(m[1]), Number(m[2]))) placer(Number(m[1]), Number(m[2]), true);
    else setLat(v);
  };

  const enregistrer = () =>
    start(async () => {
      setErreur(undefined);
      const a = Number(lat), b = Number(lng);
      if (!positionValide(a, b)) return setErreur("Place la salle sur la carte ou saisis ses coordonnées.");
      const r = await definirPositionSalle(venueId, a, b);
      if (!r.ok) return setErreur(r.error);
      notify("Position de la salle enregistrée", { tone: "jade" });
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-2.5">
      <div ref={boite} className="isolate h-64 w-full overflow-hidden rounded-card border border-line" />
      <p className="text-[11.5px] text-muted">Touche la carte à l&apos;emplacement exact de l&apos;entrée, ou utilise ta position si tu es dans la salle.</p>
      <div className="grid grid-cols-2 gap-2">
        <input value={lat} onChange={(e) => coller(e.target.value)} placeholder="Latitude (ex. 4.0511)" inputMode="decimal"
          className="h-10 rounded-card border border-line bg-transparent px-3 text-[13px]" />
        <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude (ex. 9.7679)" inputMode="decimal"
          className="h-10 rounded-card border border-line bg-transparent px-3 text-[13px]" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={ici} className="press rounded-full border border-line px-4 py-2 text-[12.5px]">
          Ma position actuelle
        </button>
        <button type="button" onClick={enregistrer} disabled={pending}
          className="press rounded-full bg-gold px-4 py-2 text-[12.5px] font-semibold text-gold-ink disabled:opacity-50">
          {pending ? "Enregistrement…" : "Enregistrer la position"}
        </button>
      </div>
      {erreur ? <p className="text-[12px] text-warn">{erreur}</p> : null}
    </div>
  );
}
