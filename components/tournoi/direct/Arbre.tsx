"use client";

import { useState } from "react";
import { Visage } from "@/components/tournoi/direct/Visage";
import type { DuelVue } from "@/lib/tournoi-direct";
import { cn } from "@/lib/cn";

const UNITE = 84; // hauteur réservée à un duel de la colonne la plus fournie
const CARTE = 66;

export type Colonne = { titre: string; duels: DuelVue[] };
export type Section = { titre?: string; colonnes: Colonne[] };

/**
 * Les arbres de la phase finale, dessinés comme sur Challonge : chaque duel
 * porte son numéro, est relié à ceux qui le nourrissent, et annonce qui il
 * attend (« Perdant de 16 »). Les exemptions ne sont pas dessinées. Les
 * éliminés s'effacent par défaut — on suit ceux qui restent.
 */
export function Arbre({ sections }: { sections: Section[] }) {
  const [masquer, setMasquer] = useState(true);
  if (!sections.some((s) => s.colonnes.some((c) => c.duels.length))) return null;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex w-fit cursor-pointer items-center gap-2 text-[12px] text-dim">
        <input type="checkbox" checked={masquer} onChange={(e) => setMasquer(e.target.checked)} className="accent-[var(--mb-accent)]" />
        Masquer les éliminés
      </label>
      {sections.map((s, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          {s.titre ? <h4 className="text-[12.5px] font-semibold text-dim">{s.titre}</h4> : null}
          <Plan colonnes={s.colonnes.filter((c) => c.duels.length)} masquer={masquer} />
        </div>
      ))}
    </div>
  );
}

function Plan({ colonnes, masquer }: { colonnes: Colonne[]; masquer: boolean }) {
  const plusGrande = Math.max(1, ...colonnes.map((c) => c.duels.length));
  const hauteur = plusGrande * UNITE;

  return (
    <div className="-mx-1 overflow-x-auto pb-2">
      <div className="flex pr-1 pl-5" style={{ height: hauteur + 28 }}>
        {colonnes.map((col, j) => {
          const siens = [...col.duels].sort((x, y) => x.slot - y.slot);
          const bloc = hauteur / siens.length;
          const suivante = colonnes[j + 1]?.duels.length ?? 0;
          // Deux duels qui en nourrissent un seul : l'accolade. Autant de duels
          // d'une colonne à l'autre : un trait droit.
          const accolade = suivante > 0 && suivante * 2 === siens.length;
          const droit = suivante > 0 && suivante === siens.length;
          return (
            <div key={j} className="flex w-[212px] shrink-0 flex-col">
              <span className="h-7 truncate px-3 text-[10.5px] font-semibold tracking-[0.08em] text-muted uppercase">{col.titre}</span>
              {siens.map((d) => {
                const exempt = d.status === "exempt";
                return (
                  <div key={d.id} className="relative" style={{ height: bloc }}>
                    {j > 0 && !exempt ? <span className="absolute top-1/2 left-0 h-px w-3 bg-line" /> : null}
                    {!exempt && (accolade || droit) ? <span className="absolute top-1/2 right-0 h-px w-3 bg-line" /> : null}
                    {!exempt && accolade ? (
                      <span
                        className="absolute right-0 w-px bg-line"
                        style={d.slot % 2 === 0 ? { top: "50%", height: "50%" } : { top: 0, height: "50%" }}
                      />
                    ) : null}
                    {exempt ? null : <Carte duel={d} masquer={masquer} finale={d.stage === "finale"} />}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Carte({ duel, masquer, finale }: { duel: DuelVue; masquer: boolean; finale: boolean }) {
  const fini = duel.status === "termine";
  return (
    <div
      className={cn(
        "absolute inset-x-3 top-1/2 flex -translate-y-1/2 flex-col justify-center rounded-card border bg-surface px-2 text-[12px]",
        finale ? "border-gold/50" : "border-line",
        duel.status === "encours" && "border-jade",
      )}
      style={{ height: CARTE }}
    >
      {duel.numero ? (
        <span className="absolute top-1/2 -left-3 -translate-x-full -translate-y-1/2 text-[9.5px] text-faint tabular-nums">
          {duel.numero}
        </span>
      ) : null}
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
    const attendu = cote === "a" ? d.attenteA : d.attenteB;
    return <span className="flex h-6 items-center truncate text-[11px] text-faint italic">{attendu ?? "à désigner"}</span>;
  }
  // Battu : on ne suit plus que le vainqueur. En double élimination, le
  // battu du tableau principal réapparaît dans celui des perdants.
  if (perdant && masquer) return <span className="h-6" aria-label="Battu" />;
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
