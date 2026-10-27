"use client";

import type { EtatBarre } from "@/lib/barre-types";
import { cn } from "@/lib/cn";
import { BillesDuGroupe } from "./Bille";

/**
 * Sous la vidéo : le match en grand — score, course, groupes et billes
 * restantes, l'état du coup (sur la noire, bille en main), et les moments
 * clés. Tout vient de la feuille d'arbitre.
 */
export function CarteMatch({ etat }: { etat: EtatBarre }) {
  const h = etat.huit;
  const live = etat.status === "live";
  const main = (c: "A" | "B") => live && (h ? h.main === c : etat.turnId === (c === "A" ? etat.a.id : etat.b.id));
  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-panel border border-line bg-surface p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          {(["A", "B"] as const).map((c, i) => {
            const j = c === "A" ? etat.a : etat.b;
            const groupe = h?.groupes[c];
            const joueur = (
              <div key={c} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
                {j.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={j.avatar} alt="" className={cn("h-13 w-13 rounded-full object-cover", main(c) ? "ring-2 ring-gold ring-offset-2 ring-offset-surface" : "ring-1 ring-line")} />
                ) : (
                  <span className={cn("grid h-13 w-13 place-items-center rounded-full bg-surface-2 text-[18px] font-bold", main(c) && "ring-2 ring-gold")}>{j.nom.slice(0, 1)}</span>
                )}
                <span className="max-w-full truncate text-[14px] font-bold">{j.nom}</span>
                <span className="text-[10px] tracking-[0.08em] text-muted uppercase">
                  {groupe ? (groupe === "pleines" ? "Pleines" : "Rayées") : h && h.phase === "jeu" ? "Table ouverte" : ""}
                  {main(c) ? " · à la table" : ""}
                </span>
              </div>
            );
            if (i === 0)
              return [
                joueur,
                <div key="s" className="flex items-baseline gap-2.5 text-[42px] font-extrabold tabular-nums">
                  <span key={`a${etat.scoreA}`} className={cn("mba-pop", main("A") && "text-gold-text")}>{etat.scoreA}</span>
                  <span className="text-[22px] text-faint">–</span>
                  <span key={`b${etat.scoreB}`} className={cn("mba-pop", main("B") && "text-gold-text")}>{etat.scoreB}</span>
                </div>,
              ];
            return joueur;
          })}
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {etat.annonce ? (
            <span className="rounded-full border border-gold/40 bg-gold/15 px-2.5 py-1 text-[11px] font-semibold text-gold-text">● {etat.annonce}</span>
          ) : null}
          <span className="rounded-full border border-jade/35 bg-jade/12 px-2.5 py-1 text-[11px] font-semibold text-jade-text">
            {etat.target <= 1 ? "Partie sèche" : `Course à ${etat.target}`}
            {h ? ` · manche ${h.manche}` : ""}
          </span>
        </div>
        {h && (h.groupes.A || h.groupes.B) ? (
          <div className="mt-3 flex items-center justify-between gap-2">
            <BillesDuGroupe groupe={h.groupes.A} empochees={h.empochees} surLaNoire={h.surLaNoire.A} taille={15} ecart={3} />
            <BillesDuGroupe groupe={h.groupes.B} empochees={h.empochees} surLaNoire={h.surLaNoire.B} taille={15} ecart={3} inverse />
          </div>
        ) : null}
      </section>

      {etat.moments.length ? (
        <section className="rounded-panel border border-line bg-surface p-4">
          <h3 className="mb-2 text-[11px] tracking-[0.16em] text-gold-text uppercase">Moments clés</h3>
          <ol className="flex flex-col">
            {etat.moments.slice(0, 6).map((m) => (
              <li key={m.id} className="flex items-start gap-2.5 border-t border-line py-1.5 text-[12.5px] first:border-t-0">
                <span className="w-10 shrink-0 text-[11px] text-muted tabular-nums">
                  {new Date(m.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="min-w-0">
                  {m.cote ? <b className="text-gold-text">{(m.cote === "A" ? etat.a : etat.b).nom.split(" ")[0]} · </b> : null}
                  {m.texte}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
