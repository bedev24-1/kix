"use client";

import { useState } from "react";
import { Visage } from "@/components/tournoi/direct/Visage";
import type { DuelVue } from "@/lib/tournoi-direct";
import { nomDuTour } from "@/lib/bracket";
import { cn } from "@/lib/cn";

const UNITE = 84; // hauteur réservée à un duel du premier tour
const CARTE = 66;

/**
 * L'arbre du tableau final, avec ses traits : chaque duel est relié aux deux
 * qui le nourrissent. Les éliminés s'effacent par défaut — on suit ceux qui
 * restent — et un bouton les fait revenir.
 */
export function Arbre({ duels, tours }: { duels: DuelVue[]; tours: number }) {
  const [masquer, setMasquer] = useState(true);
  const premier = duels.filter((d) => d.round === 1).length;
  if (!premier) return null;
  const hauteur = premier * UNITE;

  return (
    <div className="flex flex-col gap-2.5">
      <label className="flex w-fit cursor-pointer items-center gap-2 text-[12px] text-dim">
        <input type="checkbox" checked={masquer} onChange={(e) => setMasquer(e.target.checked)} className="accent-[var(--mb-accent)]" />
        Masquer les éliminés
      </label>
      <div className="-mx-1 overflow-x-auto pb-2">
        <div className="flex px-1" style={{ height: hauteur + 28 }}>
          {Array.from({ length: tours }, (_, i) => i + 1).map((round) => {
            const siens = duels.filter((d) => d.round === round).sort((x, y) => x.slot - y.slot);
            const bloc = hauteur / Math.max(1, siens.length);
            return (
              <div key={round} className="flex w-[212px] shrink-0 flex-col">
                <span className="h-7 px-3 text-[10.5px] font-semibold tracking-[0.08em] text-muted uppercase">
                  {nomDuTour(round, tours)}
                </span>
                {siens.map((d) => (
                  <div key={d.id} className="relative" style={{ height: bloc }}>
                    {/* Trait d'arrivée, depuis le tour précédent. */}
                    {round > 1 ? <span className="absolute top-1/2 left-0 h-px w-3 bg-line" /> : null}
                    {/* Traits de départ vers le tour suivant. */}
                    {round < tours ? (
                      <>
                        <span className="absolute top-1/2 right-0 h-px w-3 bg-line" />
                        <span
                          className="absolute right-0 w-px bg-line"
                          style={d.slot % 2 === 0 ? { top: "50%", height: "50%" } : { top: 0, height: "50%" }}
                        />
                      </>
                    ) : null}
                    <Carte duel={d} masquer={masquer} finale={round === tours} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Carte({ duel, masquer, finale }: { duel: DuelVue; masquer: boolean; finale: boolean }) {
  const fini = duel.status === "termine" || duel.status === "exempt";
  return (
    <div
      className={cn(
        "absolute inset-x-3 top-1/2 flex -translate-y-1/2 flex-col justify-center rounded-card border bg-surface px-2 text-[12px]",
        finale ? "border-gold/50" : "border-line",
        duel.status === "encours" && "border-jade",
      )}
      style={{ height: CARTE }}
    >
      <Ligne d={duel} cote="a" masquer={masquer && fini} />
      <span className="my-0.5 h-px bg-line" />
      <Ligne d={duel} cote="b" masquer={masquer && fini} />
      {!fini && (duel.table || duel.arbitre) ? (
        <span className="absolute -bottom-4 left-0 max-w-full truncate text-[9.5px] text-muted">
          {duel.table ? `Table ${duel.table}` : ""}
          {duel.table && duel.arbitre ? " · " : ""}
          {duel.arbitre ? `Arb. ${duel.arbitre.nom}` : ""}
        </span>
      ) : null}
    </div>
  );
}

function Ligne({ d, cote, masquer }: { d: DuelVue; cote: "a" | "b"; masquer: boolean }) {
  const j = cote === "a" ? d.a : d.b;
  const score = cote === "a" ? d.scoreA : d.scoreB;
  const gagnant = d.gagnant === cote;
  const perdant = d.gagnant !== null && !gagnant;
  if (!j) {
    return <span className="flex h-6 items-center text-[11px] text-faint">{d.status === "exempt" ? "exempt" : "à désigner"}</span>;
  }
  if (perdant && masquer) return <span className="h-6" aria-label="Éliminé" />;
  return (
    <span className={cn("flex h-6 items-center gap-1.5", perdant && "opacity-35 line-through")}>
      <Visage nom={j.nom} avatar={j.avatar} taille={20} />
      <span className={cn("min-w-0 grow truncate", gagnant ? "font-bold text-ink" : "text-dim")}>{j.nom}</span>
      {d.status === "termine" || d.status === "encours" ? (
        <span className={cn("tabular-nums", gagnant ? "font-bold text-gold-text" : "text-muted")}>{score}</span>
      ) : null}
    </span>
  );
}
