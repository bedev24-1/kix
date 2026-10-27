"use client";

import type { EtatBarre } from "@/lib/barre-types";
import { BillesDuGroupe } from "./Bille";
import { AnimationsBarre } from "./Animations";

/**
 * La Barre Master Break en 16:9 — l'incrustation des directs (OBS, écrans).
 * Dessinée sur une toile de 1920 × 1080 ; le parent la met à l'échelle.
 * Tout vient de la feuille d'arbitre : score, main, groupes, billes, chrono,
 * annonces.
 */
export type OptionsBarre = { coin: boolean; sponsor: boolean; chrono: boolean; annonce: boolean; direct: boolean };

export function BarreObs({ etat, reste, options }: { etat: EtatBarre; reste: number | null; options: OptionsBarre }) {
  const h = etat.huit;
  const mainA = etat.status === "live" && (h ? h.main === "A" : etat.turnId === etat.a.id);
  const mainB = etat.status === "live" && (h ? h.main === "B" : etat.turnId === etat.b.id);
  const ratio = etat.chrono && reste !== null ? Math.min(1, reste / etat.chrono.duree) : 0;
  const urgent = reste !== null && reste <= 10;
  const titre = [etat.contexte.titre ?? etat.contexte.label, etat.contexte.tour].filter(Boolean).join(" · ");
  const lieu = [etat.contexte.salle, etat.contexte.table ? `Table ${etat.contexte.table}` : ""].filter(Boolean).join(" · ");
  const sousTitre = h
    ? h.phase === "casse"
      ? `Manche ${h.manche} · casse ${(h.casseur === "A" ? etat.a : etat.b).nom.split(" ")[0]}`
      : `Manche ${h.manche}`
    : etat.status === "done"
      ? "Terminé"
      : "";

  return (
    <div className="mbo">
      <style>{CSS}</style>

      {options.coin ? (
        <div className="mbo-coin">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/emblem.png" alt="" />
          <div>
            <div className="mbo-coin-t">{titre || "Master Break"}</div>
            <div className="mbo-coin-n">{lieu}</div>
          </div>
        </div>
      ) : null}

      {options.direct && etat.direct ? (
        <div className="mbo-direct">
          <i />
          DIRECT
        </div>
      ) : null}

      {options.annonce && etat.annonce ? (
        <div key={etat.annonce} className="mbo-annonce">
          ● {etat.annonce}
        </div>
      ) : null}

      {options.sponsor && etat.sponsor ? (
        <div className="mbo-sponsor">
          Présenté par <b>{etat.sponsor}</b>
        </div>
      ) : null}

      {options.chrono && etat.chrono && etat.status === "live" ? (
        <div className="mbo-chrono">
          <div className={`mbo-anneau${urgent ? " urgent" : ""}`} style={{ ["--p" as string]: `${ratio * 100}%` }}>
            <div>{reste === null ? etat.chrono.duree : Math.ceil(reste)}</div>
          </div>
          <div className="mbo-ext">
            <span className={etat.chrono.ext.A ? "prise" : ""}>EXT · {etat.a.nom.split(" ")[0]}</span>
            <span className={etat.chrono.ext.B ? "prise" : ""}>EXT · {etat.b.nom.split(" ")[0]}</span>
          </div>
        </div>
      ) : null}

      <div className="mbo-barre">
        <AnimationsBarre etat={etat} echelle="obs" />
        <Cote etat={etat} cote="A" main={mainA} />
        <div className="mbo-centre">
          <div className="mbo-course">{etat.target <= 1 ? "Partie" : "Course à"}</div>
          <div className="mbo-race">{etat.target <= 1 ? "sèche" : etat.target}</div>
          <div className="mbo-tour">{sousTitre}</div>
        </div>
        <Cote etat={etat} cote="B" main={mainB} />
      </div>
    </div>
  );
}

function Cote({ etat, cote, main }: { etat: EtatBarre; cote: "A" | "B"; main: boolean }) {
  const j = cote === "A" ? etat.a : etat.b;
  const score = cote === "A" ? etat.scoreA : etat.scoreB;
  const h = etat.huit;
  const groupe = h?.groupes[cote] ?? null;
  const gagne = etat.status === "done" && etat.winnerId === j.id;
  return (
    <div className={`mbo-j ${cote === "A" ? "g" : "d"}${main || gagne ? " main" : ""}`}>
      {j.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="mbo-photo" src={j.avatar} alt="" />
      ) : (
        <div className="mbo-photo mbo-init">{j.nom.slice(0, 1).toUpperCase()}</div>
      )}
      <div className="mbo-infos">
        <div className="mbo-nom">{j.nom}</div>
        <div className="mbo-sous">
          {groupe ? <span className={`mbo-groupe ${groupe === "pleines" ? "p" : "r"}`}>{groupe === "pleines" ? "Pleines" : "Rayées"}</span> : null}
          {h ? (
            <BillesDuGroupe groupe={groupe} empochees={h.empochees} surLaNoire={h.surLaNoire[cote]} taille={22} ecart={6} inverse={cote === "B"} />
          ) : null}
          {h && !groupe ? <span className="mbo-ouverte">{h.phase === "casse" ? "" : "Table ouverte"}</span> : null}
        </div>
      </div>
      <div className="mbo-score">
        {/* Le chiffre rebondit quand il change. */}
        <span key={score} className="mba-pop">{score}</span>
      </div>
    </div>
  );
}

const CSS = `
.mbo { position: absolute; inset: 0; font-family: var(--font-geist), Geist, system-ui, sans-serif; color: #f4efe2; }
.mbo-coin { position: absolute; top: 44px; left: 56px; display: flex; align-items: center; gap: 18px; padding: 12px 22px 12px 14px; border-radius: 18px; background: rgba(7,26,19,.82); border: 1px solid rgba(224,180,58,.35); }
.mbo-coin img { width: 58px; height: 58px; object-fit: contain; }
.mbo-coin-t { font-size: 15px; letter-spacing: 3px; color: #e0b43a; text-transform: uppercase; }
.mbo-coin-n { font-size: 26px; font-weight: 800; }
.mbo-direct { position: absolute; top: 52px; right: 56px; display: flex; align-items: center; gap: 10px; padding: 10px 18px; border-radius: 999px; background: #e5484d; font-weight: 800; font-size: 20px; letter-spacing: 2px; }
.mbo-direct i { width: 12px; height: 12px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 4px rgba(255,255,255,.3); animation: mbo-pouls 1.6s infinite; }
.mbo-annonce { position: absolute; left: 50%; top: 52px; transform: translateX(-50%); padding: 10px 26px; border-radius: 999px; font-weight: 800; font-size: 22px; letter-spacing: 3px; text-transform: uppercase; background: linear-gradient(90deg, #3a2a05, #8a6a12); border: 1px solid #e0b43a; color: #f6d77a; box-shadow: 0 10px 30px rgba(0,0,0,.5); white-space: nowrap; animation: mbo-entree .45s ease-out; }
.mbo-sponsor { position: absolute; right: 56px; bottom: 214px; display: flex; align-items: center; gap: 12px; padding: 10px 18px; border-radius: 14px; background: rgba(7,26,19,.82); font-size: 14px; color: #9fb0a6; }
.mbo-sponsor b { color: #f4efe2; font-size: 18px; letter-spacing: 1px; }
.mbo-chrono { position: absolute; left: 50%; bottom: 196px; transform: translateX(-50%); display: flex; align-items: center; gap: 14px; }
.mbo-anneau { width: 92px; height: 92px; border-radius: 50%; display: grid; place-items: center; padding: 7px; background: conic-gradient(#e0b43a 0 var(--p), rgba(255,255,255,.12) var(--p) 100%); }
.mbo-anneau.urgent { background: conic-gradient(#e5484d 0 var(--p), rgba(255,255,255,.12) var(--p) 100%); }
.mbo-anneau div { width: 100%; height: 100%; border-radius: 50%; background: rgba(7,26,19,.95); display: grid; place-items: center; font-size: 40px; font-weight: 800; font-variant-numeric: tabular-nums; }
.mbo-anneau.urgent div { color: #ff8a8d; }
.mbo-ext { display: flex; flex-direction: column; gap: 6px; }
.mbo-ext span { padding: 5px 12px; border-radius: 8px; font-size: 14px; font-weight: 700; letter-spacing: 1px; background: rgba(7,26,19,.9); border: 1px solid #24402f; text-transform: uppercase; }
.mbo-ext span.prise { color: #6f8378; text-decoration: line-through; }
.mbo-barre { position: absolute; left: 50%; bottom: 56px; transform: translateX(-50%); width: 1500px; display: grid; grid-template-columns: 1fr 230px 1fr; border-radius: 26px; box-shadow: 0 24px 60px rgba(0,0,0,.6); border: 1px solid rgba(224,180,58,.45); }
.mbo-barre > .mbo-j.g { border-radius: 25px 0 0 25px; } .mbo-barre > .mbo-j.d { border-radius: 0 25px 25px 0; }
.mbo-j { display: flex; align-items: center; gap: 20px; padding: 18px 26px; background: rgba(7,26,19,.94); position: relative; min-width: 0; }
.mbo-j.d { flex-direction: row-reverse; text-align: right; }
.mbo-j.main::before { content: ""; position: absolute; top: 0; bottom: 0; width: 6px; background: #e0b43a; }
.mbo-j.g.main::before { left: 0; } .mbo-j.d.main::before { right: 0; }
.mbo-photo { width: 84px; height: 84px; border-radius: 50%; object-fit: cover; border: 3px solid #24402f; flex: none; }
.mbo-init { display: grid; place-items: center; background: #10261d; font-size: 34px; font-weight: 800; }
.mbo-j.main .mbo-photo { border-color: #e0b43a; box-shadow: 0 0 0 6px rgba(224,180,58,.18); }
.mbo-infos { display: flex; flex-direction: column; gap: 8px; min-width: 0; flex: 1; }
.mbo-j.d .mbo-infos { align-items: flex-end; }
.mbo-nom { font-size: 34px; font-weight: 800; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.mbo-sous { display: flex; align-items: center; gap: 10px; font-size: 16px; color: #9fb0a6; min-height: 24px; }
.mbo-j.d .mbo-sous { flex-direction: row-reverse; }
.mbo-groupe { padding: 4px 10px; border-radius: 999px; font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
.mbo-groupe.p { background: rgba(242,194,48,.16); color: #f6d77a; }
.mbo-groupe.r { background: rgba(244,239,226,.12); color: #f4efe2; }
.mbo-ouverte { font-size: 14px; letter-spacing: 1px; text-transform: uppercase; }
.mbo-score { font-size: 76px; font-weight: 800; width: 100px; text-align: center; line-height: 1; font-variant-numeric: tabular-nums; flex: none; }
.mbo-j.main .mbo-score { color: #e0b43a; }
.mbo-centre { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; background: linear-gradient(180deg, #3a2a05, #6d520c); }
.mbo-course { font-size: 15px; letter-spacing: 3px; color: #f6d77a; text-transform: uppercase; }
.mbo-race { font-size: 40px; font-weight: 800; color: #fff; }
.mbo-tour { font-size: 14px; color: #f4e3b0; }
@keyframes mbo-entree { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
@keyframes mbo-pouls { 50% { opacity: .35; } }
`;
