"use client";

import type { EtatBarre } from "@/lib/barre-types";
import { cn } from "@/lib/cn";
import { AnimationsBarre } from "./Animations";
import { Bille } from "./Bille";

/**
 * La Barre Master Break en petit, sur la vidéo d'un téléphone : les deux
 * noms, le score, la course, qui a la main, la noire, le chrono — et les
 * mêmes animations que la grande (bille empochée, faute, manche).
 */
export function MiniBarre({ etat, reste }: { etat: EtatBarre; reste: number | null }) {
  const h = etat.huit;
  const live = etat.status === "live";
  const main = (c: "A" | "B") => live && (h ? h.main === c : etat.turnId === (c === "A" ? etat.a.id : etat.b.id));
  const prenom = (n: string) => n.split(" ")[0];
  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-2">
      {etat.annonce ? (
        <div key={etat.annonce} className="mx-auto mb-1.5 w-fit animate-[mbm-entree_.4s_ease-out] rounded-full border border-[#e0b43a] bg-gradient-to-r from-[#3a2a05] to-[#8a6a12] px-2.5 py-0.5 text-[9.5px] font-extrabold tracking-[0.12em] text-[#f6d77a] uppercase">
          ● {etat.annonce}
        </div>
      ) : null}
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch rounded-xl border border-[#e0b43a]/50 bg-[#071a13]/92 text-[#f4efe2] shadow-lg">
        <style>{`@keyframes mbm-entree{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
        <AnimationsBarre etat={etat} echelle="mobile" />
        {(["A", "B"] as const).map((c, i) => {
          const j = c === "A" ? etat.a : etat.b;
          const noire = h?.surLaNoire[c];
          const cote = (
            <div
              key={c}
              className={cn(
                "flex min-w-0 items-center gap-1.5 px-2 py-1.5 text-[12.5px] font-bold",
                c === "B" && "flex-row-reverse text-right",
                main(c) && (c === "A" ? "shadow-[inset_3px_0_0_#e0b43a] rounded-l-xl" : "shadow-[inset_-3px_0_0_#e0b43a] rounded-r-xl"),
              )}
            >
              {noire ? <Bille n={8} taille={11} titre="Sur la noire" /> : null}
              <span className="truncate">{prenom(j.nom)}</span>
              {h?.groupes[c] ? (
                <span className="shrink-0 text-[9px] font-semibold text-[#9fb0a6]">{h.restantes[c]}</span>
              ) : null}
            </div>
          );
          if (i === 0) {
            return [
              cote,
              <div key="centre" className="flex items-center gap-1.5 bg-gradient-to-b from-[#3a2a05] to-[#6d520c] px-2.5 text-[18px] font-extrabold tabular-nums">
                <span key={`a${etat.scoreA}`} className="mba-pop">{etat.scoreA}</span>
                <span className="flex flex-col items-center leading-none">
                  <small className="text-[7.5px] font-normal tracking-[0.1em] text-[#f4e3b0]">{etat.target <= 1 ? "SÈCHE" : `À ${etat.target}`}</small>
                  {reste !== null && live ? (
                    <small className={cn("mt-0.5 text-[9px] font-bold", reste <= 10 ? "text-[#ff8a8d]" : "text-white")}>{Math.ceil(reste)}s</small>
                  ) : null}
                </span>
                <span key={`b${etat.scoreB}`} className="mba-pop">{etat.scoreB}</span>
              </div>,
            ];
          }
          return cote;
        })}
      </div>
    </div>
  );
}
