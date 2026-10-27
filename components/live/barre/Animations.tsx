"use client";

import { useState } from "react";
import type { EtatBarre } from "@/lib/barre-types";
import { Bille } from "./Bille";

/**
 * Les animations de la Barre : chaque geste de l'arbitre se voit.
 *
 *  - bille empochée : un éclat doré balaie le côté du joueur, la bille monte ;
 *  - faute : le côté du fautif rougit ;
 *  - casse : éclat au centre ;
 *  - manche gagnée : balayage doré sur toute la barre, et grand bandeau.
 *
 * Elles se rejouent quand un nouveau « moment » arrive : la clé de chaque
 * élément est l'identifiant du moment, React le recrée, l'animation CSS repart.
 * Rien ne s'anime à l'ouverture de la page — seulement ce qui arrive ensuite.
 */
export type Echelle = "obs" | "mobile";

function genre(kind: string, texte: string): "pot" | "faute" | "casse" | "manche" | "autre" {
  if (kind === "rack") return "manche";
  if (kind === "foul") return "faute";
  if (kind === "break") return "casse";
  if (kind === "pot") return "pot";
  if (/remport|gagn/i.test(texte)) return "manche";
  return "autre";
}

const billesDuTexte = (texte: string) =>
  (texte.match(/\b(1[0-5]|[1-9])\b/g) ?? []).map(Number).filter((n) => n >= 1 && n <= 15).slice(0, 4);

export function useMomentNeuf(etat: EtatBarre) {
  // Le moment affiché à l'ouverture ne s'anime pas.
  const [premier] = useState(() => etat.moments[0]?.id ?? null);
  const m = etat.moments[0];
  return m && m.id !== premier ? m : null;
}

export function AnimationsBarre({ etat, echelle }: { etat: EtatBarre; echelle: Echelle }) {
  const m = useMomentNeuf(etat);
  if (!m) return null;
  const g = genre(m.kind, m.texte);
  const nom = m.cote === "A" ? etat.a.nom : m.cote === "B" ? etat.b.nom : "";
  const cote = m.cote === "B" ? "d" : "g";
  const billes = g === "pot" ? billesDuTexte(m.texte) : [];
  const grand = echelle === "obs";

  return (
    <>
      <style>{CSS}</style>
      {/* Le balayage : un côté, ou toute la barre pour une manche. */}
      {g === "manche" ? (
        <div key={`b-${m.id}`} className="mba-balaie mba-tout" />
      ) : g === "casse" ? (
        <div key={`b-${m.id}`} className="mba-balaie mba-centre" />
      ) : g === "pot" || g === "faute" ? (
        <div key={`b-${m.id}`} className={`mba-balaie mba-${cote}${g === "faute" ? " mba-rouge" : ""}`} />
      ) : null}

      {/* La bulle qui monte au-dessus du joueur. */}
      {g !== "manche" ? (
        <div key={`t-${m.id}`} className={`mba-bulle mba-bulle-${m.cote ? cote : "c"}${g === "faute" ? " mba-rouge" : ""}`} style={{ fontSize: grand ? 22 : 11 }}>
          {billes.length ? (
            <span style={{ display: "inline-flex", gap: grand ? 6 : 3, marginRight: grand ? 10 : 5 }}>
              {billes.map((n) => (
                <Bille key={n} n={n} taille={grand ? 28 : 14} />
              ))}
            </span>
          ) : null}
          {g === "pot" ? `${nom} empoche` : g === "faute" ? `Faute · ${nom}` : g === "casse" ? `Casse · ${nom}` : m.texte}
        </div>
      ) : (
        <div key={`m-${m.id}`} className="mba-manche" style={{ fontSize: grand ? 44 : 18, padding: grand ? "18px 44px" : "8px 18px" }}>
          <span style={{ fontSize: grand ? 16 : 9, letterSpacing: grand ? 5 : 2, color: "#f6d77a" }}>MANCHE</span>
          {nom}
        </div>
      )}
    </>
  );
}

const CSS = `
.mba-balaie { position: absolute; top: 0; bottom: 0; pointer-events: none; overflow: hidden; border-radius: inherit; z-index: 2; }
.mba-balaie::after { content: ""; position: absolute; top: 0; bottom: 0; width: 45%; left: -50%;
  background: linear-gradient(90deg, transparent, rgba(246,215,122,.55), transparent); animation: mba-passe 1.1s ease-out forwards; }
.mba-balaie.mba-rouge::after { background: linear-gradient(90deg, transparent, rgba(229,72,77,.6), transparent); }
.mba-balaie.mba-rouge { animation: mba-rougit 1.4s ease-out forwards; }
.mba-g { left: 0; width: calc(50% - 6%); }
.mba-d { right: 0; width: calc(50% - 6%); }
.mba-d::after { animation-name: mba-passe-inverse; }
.mba-centre { left: 38%; width: 24%; }
.mba-tout { left: 0; right: 0; animation: mba-lueur 2.2s ease-out forwards; }
.mba-tout::after { width: 30%; animation-duration: 1.6s; }
.mba-bulle { position: absolute; bottom: calc(100% + 14px); display: flex; align-items: center; white-space: nowrap; font-weight: 800; letter-spacing: .04em;
  padding: .45em 1em; border-radius: 999px; background: rgba(7,26,19,.95); border: 1px solid #e0b43a; color: #f6d77a; box-shadow: 0 10px 30px rgba(0,0,0,.45);
  animation: mba-monte 2.6s ease-out forwards; pointer-events: none; z-index: 3; }
.mba-bulle.mba-rouge { border-color: #e5484d; color: #ffb3b5; }
.mba-bulle-g { left: 12%; } .mba-bulle-d { right: 12%; } .mba-bulle-c { left: 50%; translate: -50% 0; }
.mba-manche { position: absolute; left: 50%; bottom: calc(100% + 18px); translate: -50% 0; display: flex; flex-direction: column; align-items: center; gap: .1em;
  font-weight: 800; color: #fff; white-space: nowrap; border-radius: 22px; background: linear-gradient(180deg, #3a2a05, #8a6a12); border: 1px solid #e0b43a;
  box-shadow: 0 0 60px rgba(224,180,58,.45); animation: mba-trophee 3.2s cubic-bezier(.2,.9,.3,1.2) forwards; pointer-events: none; z-index: 3; }
@keyframes mba-passe { to { left: 110%; } }
@keyframes mba-passe-inverse { from { left: 110%; } to { left: -50%; } }
@keyframes mba-rougit { 0% { background: rgba(229,72,77,.0); } 20% { background: rgba(229,72,77,.28); } 100% { background: rgba(229,72,77,0); } }
@keyframes mba-lueur { 0% { box-shadow: inset 0 0 0 0 rgba(224,180,58,0); } 25% { box-shadow: inset 0 0 0 3px rgba(224,180,58,.9), 0 0 60px rgba(224,180,58,.5); } 100% { box-shadow: inset 0 0 0 0 rgba(224,180,58,0); } }
@keyframes mba-monte { 0% { opacity: 0; transform: translateY(14px) scale(.9); } 12% { opacity: 1; transform: translateY(0) scale(1); } 75% { opacity: 1; } 100% { opacity: 0; transform: translateY(-18px); } }
@keyframes mba-trophee { 0% { opacity: 0; transform: scale(.6); } 14% { opacity: 1; transform: scale(1.06); } 22% { transform: scale(1); } 80% { opacity: 1; } 100% { opacity: 0; transform: translateY(-10px); } }
@keyframes mba-pop { 0% { transform: scale(1); } 35% { transform: scale(1.35); color: #f6d77a; } 100% { transform: scale(1); } }
.mba-pop { display: inline-block; animation: mba-pop .6s ease-out; }
@media (prefers-reduced-motion: reduce) { .mba-balaie::after, .mba-bulle, .mba-manche, .mba-pop { animation-duration: .01s !important; } }
`;
