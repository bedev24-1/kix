"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { EtatBarre } from "@/lib/barre-types";
import { useLive } from "@/lib/useLive";
import { BarreObs, type OptionsBarre } from "./BarreObs";
import { resteChrono, useHorloge } from "./useHorloge";

/**
 * La toile 1920 × 1080 de l'incrustation, mise à l'échelle de la fenêtre
 * (OBS l'ouvre souvent en 1280 × 720) et branchée sur le flux du match.
 */
const rien = () => () => {};

export function Incrustation({
  initial,
  options,
  fond,
  directId,
}: {
  initial: EtatBarre;
  options: OptionsBarre;
  fond: boolean;
  /** Le direct de ce match, pour guider qui ouvre cette adresse hors d'OBS. */
  directId: string | null;
}) {
  // OBS expose `window.obsstudio` à ses sources navigateur : ailleurs, on explique ce qu'est cette page.
  const dansObs = useSyncExternalStore(rien, () => "obsstudio" in window, () => true);
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
      {!dansObs && !fond ? <AideHorsObs matchId={initial.id} directId={directId} /> : null}
    </>
  );
}

/** Ouverte dans un navigateur : ce n'est pas le direct, c'est la barre transparente pour OBS. */
function AideHorsObs({ matchId, directId }: { matchId: string; directId: string | null }) {
  const lien = "rounded-full px-4 py-2 text-[13px] font-semibold";
  return (
    <div className="fixed inset-x-3 top-3 z-10 mx-auto flex max-w-xl flex-col gap-3 rounded-2xl border border-[#e0b43a]/50 bg-[#071a13] p-4 text-[#f4efe2] shadow-xl">
      <div>
        <p className="text-[14px] font-bold">Ceci est la barre de score pour OBS</p>
        <p className="mt-1 text-[12.5px] text-[#9fb0a6]">
          Le fond est transparent exprès : dans OBS (« Source navigateur », 1920 × 1080), la vidéo passe dessous.
          {directId ? " Pour regarder le match, ouvre le direct." : " Aucun direct n'est encore lié à ce match : ouvre-le depuis la feuille d'arbitre, bloc Diffusion."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {directId ? (
          <a href={`/direct/${directId}`} className={`${lien} bg-[#e0b43a] text-[#1a1405]`}>
            Regarder le direct
          </a>
        ) : (
          <a href={`/arbitre/${matchId}`} className={`${lien} bg-[#e0b43a] text-[#1a1405]`}>
            Ouvrir la feuille d&apos;arbitre
          </a>
        )}
        <a href="?fond=table" className={`${lien} border border-[#e0b43a]/50 text-[#f6d77a]`}>
          Aperçu sur une table
        </a>
      </div>
    </div>
  );
}
