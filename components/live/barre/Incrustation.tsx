"use client";

import { useEffect, useState } from "react";
import type { EtatBarre } from "@/lib/barre-types";
import { useLive } from "@/lib/useLive";
import { BarreObs, type OptionsBarre } from "./BarreObs";
import { resteChrono, useHorloge } from "./useHorloge";

/**
 * La toile 1920 × 1080 de l'incrustation, mise à l'échelle de la fenêtre
 * (OBS l'ouvre souvent en 1280 × 720) et branchée sur le flux du match.
 */
export function Incrustation({ initial, options, fond }: { initial: EtatBarre; options: OptionsBarre; fond: boolean }) {
  const { data, recu } = useLive<{ barre: EtatBarre | null }>(`/api/live/${initial.id}`, { barre: initial });
  const etat = data.barre ?? initial;
  const horloge = useHorloge(Boolean(etat.chrono?.fin));
  const reste = resteChrono(etat.chrono, horloge, etat.maintenant, recu);
  const [echelle, setEchelle] = useState(1);

  useEffect(() => {
    const ajuster = () => setEchelle(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    ajuster();
    window.addEventListener("resize", ajuster);
    return () => window.removeEventListener("resize", ajuster);
  }, []);

  return (
    <>
      {/* OBS compose la vidéo dessous : rien ne doit être opaque hors de la barre. */}
      <style>{`html, body { background: transparent !important; overflow: hidden; }`}</style>
      <div
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          width: 1920,
          height: 1080,
          transform: `translate(-50%, -50%) scale(${echelle})`,
          transformOrigin: "center",
          background: fond ? "url(/img/table-blue.jpg) center 62% / cover" : "transparent",
        }}
      >
        <BarreObs etat={etat} reste={reste} options={options} />
      </div>
    </>
  );
}
