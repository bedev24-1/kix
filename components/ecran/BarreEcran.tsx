"use client";

import { useEffect, useState } from "react";
import type { EtatBarre } from "@/lib/barre-types";
import { useLive } from "@/lib/useLive";
import { BarreObs } from "@/components/live/barre/BarreObs";
import { resteChrono, useHorloge } from "@/components/live/barre/useHorloge";

const TOUT = { coin: true, sponsor: true, chrono: true, annonce: true, direct: true };

/**
 * La Barre Master Break sur le téléviseur de la salle, par-dessus la vidéo :
 * la même que dans OBS et dans l'app, alimentée par la feuille de l'arbitre.
 * Rien si OBS l'incruste déjà dans l'image.
 */
export function BarreEcran({ matchId }: { matchId: string }) {
  const { data, recu } = useLive<{ barre?: EtatBarre | null }>(`/api/live/${matchId}`, { barre: null });
  const etat = data.barre ?? null;
  const horloge = useHorloge(Boolean(etat?.chrono?.fin));
  const [echelle, setEchelle] = useState(1);

  useEffect(() => {
    const ajuster = () => setEchelle(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    ajuster();
    window.addEventListener("resize", ajuster);
    return () => window.removeEventListener("resize", ajuster);
  }, []);

  if (!etat || etat.barreVideo) return null;
  const reste = resteChrono(etat.chrono, horloge, etat.maintenant, recu);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 1920,
          height: 1080,
          transform: `translate(-50%, -50%) scale(${echelle})`,
        }}
      >
        <BarreObs etat={etat} reste={reste} options={TOUT} />
      </div>
    </div>
  );
}
