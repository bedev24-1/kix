"use client";

import { useState } from "react";
import { GRAIN, nuage, type Palette } from "@/components/vitrine/styles";

/**
 * La vidéo ne se charge qu'au clic : un lecteur YouTube pèse plus lourd que
 * toute la page, et la plupart des visiteurs viennent pour la date et le prix.
 */
export function Video({
  integree,
  fichier,
  affiche,
  couleurs,
}: {
  integree: string | null;
  fichier: string;
  affiche: string;
  couleurs: Palette;
}) {
  const [lance, setLance] = useState(false);

  return (
    <section className="relative aspect-video w-full overflow-hidden" style={{ background: nuage(couleurs) }}>
      {lance ? (
        integree ? (
          <iframe
            src={`${integree}?autoplay=1`}
            title="Vidéo"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <video src={fichier} controls autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
        )
      ) : (
        <button onClick={() => setLance(true)} className="group absolute inset-0" aria-label="Lire la vidéo">
          {/* L'affiche, noyée dans le néon : on devine sans voir. */}
          <span
            className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-screen blur-2xl"
            style={{ backgroundImage: `url(${affiche})` }}
          />
          <span className="absolute inset-0 opacity-25 mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
          <span className="absolute top-1/2 left-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/85 transition group-hover:scale-110 sm:h-20 sm:w-20">
            <span className="ml-1.5 h-0 w-0 border-y-[12px] border-l-[20px] border-y-transparent border-l-black/70" />
          </span>
        </button>
      )}
    </section>
  );
}
