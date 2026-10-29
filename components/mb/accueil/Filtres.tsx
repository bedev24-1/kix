"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

const CHOIX = ["Tout", "Billard", "Vapes", "Soirées"];

/**
 * Les filtres de l'accueil, en un seul bloc de la largeur des événements :
 * quatre parts égales, de fins traits entre elles, et une pastille ivoire
 * qui glisse sous le choix actif.
 */
export function Filtres() {
  const [actif, setActif] = useState(0);
  return (
    <div role="tablist" aria-label="Filtrer l'accueil" className="relative grid h-[34px] grid-cols-4 rounded-[18px] border border-ink/12 bg-ink/6 p-[3px]">
      <span
        aria-hidden
        className="absolute inset-y-[3px] left-[3px] w-[calc((100%-6px)/4)] rounded-[14px] bg-[#f3eee2] transition-transform duration-300 ease-[cubic-bezier(.2,.7,.3,1)]"
        style={{ transform: `translateX(${actif * 100}%)` }}
      />
      {CHOIX.map((c, i) => (
        <button
          key={c}
          type="button"
          role="tab"
          aria-selected={i === actif}
          onClick={() => setActif(i)}
          className={cn(
            "relative z-10 text-[12px] transition-colors",
            i === actif ? "font-bold text-[#0b1a12]" : "font-semibold text-ink/70",
            // Un trait fin entre deux choix, sauf à côté de la pastille.
            i > 0 &&
              i !== actif &&
              i - 1 !== actif &&
              "before:absolute before:inset-y-2 before:left-0 before:w-px before:bg-ink/12",
          )}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
