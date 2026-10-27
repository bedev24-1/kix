"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export type LigneArbitre = {
  id: string;
  nom: string;
  /** Le duel qu'il tient en ce moment. */
  enCours: { libelle: string; table: string } | null;
  termines: { libelle: string; score: string }[];
};

const TRIS = {
  charge: "Disponibilité",
  arbitres: "Duels arbitrés",
  nom: "Nom",
} as const;
type Tri = keyof typeof TRIS;

/**
 * La feuille des arbitres : qui tient quel duel, ce que chacun a arbitré,
 * et les duels qui attendent qu'un arbitre se libère. Classable.
 */
export function FeuilleArbitres({ lignes, enAttente }: { lignes: LigneArbitre[]; enAttente: string[] }) {
  const [tri, setTri] = useState<Tri>("charge");
  const [ouvert, setOuvert] = useState<string | null>(null);

  const classes = [...lignes].sort((a, b) => {
    if (tri === "nom") return a.nom.localeCompare(b.nom, "fr");
    if (tri === "arbitres") return b.termines.length - a.termines.length || a.nom.localeCompare(b.nom, "fr");
    // Disponibilité : les libres d'abord, puis ceux qui en ont le moins fait.
    return Number(Boolean(a.enCours)) - Number(Boolean(b.enCours)) || a.termines.length - b.termines.length || a.nom.localeCompare(b.nom, "fr");
  });
  const libres = lignes.filter((l) => !l.enCours).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] text-muted">
          {libres} libre{libres > 1 ? "s" : ""} sur {lignes.length}
          {enAttente.length ? ` · ${enAttente.length} duel${enAttente.length > 1 ? "s" : ""} en attente d'arbitre` : ""}
        </span>
        <div className="flex gap-1">
          {(Object.keys(TRIS) as Tri[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTri(t)}
              className={cn(
                "press rounded-full border px-2.5 py-1 text-[11.5px]",
                tri === t ? "border-gold bg-gold text-gold-ink font-semibold" : "border-line text-dim",
              )}
            >
              {TRIS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-panel border border-line">
        {classes.map((l, i) => (
          <div key={l.id} className={cn("flex flex-col", i > 0 && "border-t border-line")}>
            <button
              type="button"
              onClick={() => setOuvert(ouvert === l.id ? null : l.id)}
              className="press flex items-center gap-3 px-3.5 py-3 text-left"
            >
              <span className="w-5 shrink-0 text-[12px] text-faint tabular-nums">{i + 1}</span>
              <span className="flex min-w-0 grow flex-col gap-0.5">
                <span className="truncate text-[13.5px] font-semibold">{l.nom}</span>
                <span className={cn("truncate text-[11.5px]", l.enCours ? "text-gold-text" : "text-jade-text")}>
                  {l.enCours ? `En cours · ${l.enCours.libelle}${l.enCours.table ? ` · table ${l.enCours.table}` : ""}` : "Libre"}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <span className="text-[15px] font-bold tabular-nums">{l.termines.length}</span>
                <span className="text-[10px] text-muted">arbitré{l.termines.length > 1 ? "s" : ""}</span>
              </span>
            </button>
            {ouvert === l.id ? (
              <div className="flex flex-col gap-1 border-t border-line bg-surface px-3.5 py-2.5">
                {l.termines.length === 0 ? (
                  <span className="text-[12px] text-muted">Aucun duel arbitré pour l&apos;instant.</span>
                ) : (
                  l.termines.map((d, j) => (
                    <span key={j} className="flex items-center justify-between gap-3 text-[12px]">
                      <span className="min-w-0 truncate text-dim">{d.libelle}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{d.score}</span>
                    </span>
                  ))
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {enAttente.length ? (
        <div className="flex flex-col gap-1 rounded-panel border border-dashed border-line px-3.5 py-2.5 text-[12px] text-muted">
          <span className="font-semibold text-ink">En attente d&apos;un arbitre</span>
          {enAttente.map((e, i) => (
            <span key={i} className="truncate">{e}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
