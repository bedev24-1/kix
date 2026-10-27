"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useSnackbar } from "@/components/ui/Snackbar";
import { coup8, annuler8 } from "@/lib/actions-huit";
import { FAUTES, NOIRE, NOMS_GROUPES, restantes, surLaNoire, type Coup, type Cote, type Etat8, type Faute } from "@/lib/huit";
import { cn } from "@/lib/cn";
import type { Side } from "@/components/live/Scoreboard";

/** Les couleurs réglementaires des billes (1-7 pleines, 9-15 rayées de la même couleur). */
const COULEURS: Record<number, string> = {
  1: "#F2C200", 2: "#1F4FBF", 3: "#D62828", 4: "#6A2C91", 5: "#F2711C", 6: "#1B7A3D", 7: "#7A1F1F", 8: "#111111",
};
const couleur = (n: number) => COULEURS[n > 8 ? n - 8 : n];

function Bille({ n, choisie, tombee, onClick }: { n: number; choisie: boolean; tombee: boolean; onClick?: () => void }) {
  const rayee = n > 8;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={tombee || !onClick}
      aria-label={`Bille ${n}${tombee ? " (empochée)" : ""}`}
      aria-pressed={choisie}
      className={cn(
        "press relative grid aspect-square w-full place-items-center overflow-hidden rounded-full transition",
        tombee ? "opacity-20 grayscale" : "shadow-[inset_-4px_-6px_10px_rgba(0,0,0,.35)]",
        choisie && "ring-4 ring-gold ring-offset-2 ring-offset-bg scale-105",
      )}
      style={{
        background: rayee
          ? `linear-gradient(180deg, #f4f1ea 0 24%, ${couleur(n)} 24% 76%, #f4f1ea 76% 100%)`
          : couleur(n),
      }}
    >
      <span className="grid h-[52%] w-[52%] place-items-center rounded-full bg-[#f4f1ea] text-[clamp(10px,3.2vw,15px)] font-bold text-[#111]">
        {n}
      </span>
    </button>
  );
}

/**
 * La feuille de 8-ball : l'arbitre suit la manche comme il la voit.
 *
 * On touche les billes qui viennent de tomber, puis on dit ce qui s'est
 * passé : empoché (la main reste), raté ou sécurité (elle passe), faute
 * (bille en main pour l'adversaire), ou la noire. Le reste — groupes,
 * billes restantes, manche gagnée, casse suivante — se déduit tout seul.
 */
export function Console8({
  matchId,
  a,
  b,
  etat,
  annulable,
}: {
  matchId: string;
  a: Side;
  b: Side;
  etat: Etat8;
  annulable: boolean;
}) {
  const router = useRouter();
  const { notify } = useSnackbar();
  const [pending, start] = useTransition();
  const [choix, setChoix] = useState<number[]>([]);
  const [panneau, setPanneau] = useState<null | "faute" | "noire" | "noire_casse">(null);
  const [erreur, setErreur] = useState<string>();

  const nom = (c: Cote) => (c === "A" ? a.name : b.name);
  const tireur = nom(etat.main);
  const casse = etat.phase === "casse";
  const pret = surLaNoire(etat, etat.main);

  const basculer = (n: number) => setChoix((c) => (c.includes(n) ? c.filter((x) => x !== n) : [...c, n]));

  const jouer = (coup: Coup, message: string) =>
    start(async () => {
      setErreur(undefined);
      const r = await coup8(matchId, coup);
      if (!r.ok) return setErreur(r.error);
      setChoix([]);
      setPanneau(null);
      notify(r.manche ? `Manche pour ${nom(r.manche)}` : message, { tone: r.manche ? "jade" : undefined });
      router.refresh();
    });

  const annuler = () =>
    start(async () => {
      setErreur(undefined);
      const r = await annuler8(matchId);
      if (!r.ok) return setErreur(r.error);
      notify("Dernier coup annulé");
      router.refresh();
    });

  const billes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  const sel = choix.filter((n) => n !== NOIRE).sort((x, y) => x - y);

  return (
    <div className="flex flex-col gap-3.5">
      {/* Qui joue, et où en est chacun. */}
      <Card shape="panel" className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2 text-[11.5px] text-muted">
          <span>Manche {etat.manche} · casse : {nom(etat.casseur)}</span>
          <span>{etat.regle === "gagnant" ? "Le gagnant casse" : "Casse alternée"}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[17px] font-bold">À {tireur} de jouer</span>
          {etat.billeEnMain ? (
            <span className="rounded-full bg-warn/15 px-2.5 py-1 text-[11px] font-semibold text-warn">Bille en main</span>
          ) : null}
          {pret ? <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-bg">Sur la noire</span> : null}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["A", "B"] as Cote[]).map((c) => (
            <div key={c} className={cn("rounded-card border px-3 py-2", etat.main === c ? "border-gold/60 bg-gold/10" : "border-line")}>
              <span className="block truncate text-[12.5px] font-semibold">{nom(c)}</span>
              <span className="text-[11.5px] text-muted">
                {etat.groupes[c] ? `${NOMS_GROUPES[etat.groupes[c]!]} · reste ${restantes(etat, c)}` : "table ouverte"}
              </span>
            </div>
          ))}
        </div>
        {etat.dernier ? <p className="text-[11.5px] text-dim">Dernier coup : {etat.dernier}</p> : null}
      </Card>

      {/* Les billes : on touche celles qui viennent de tomber. */}
      <Card shape="panel" className="flex flex-col gap-2.5 p-4">
        <span className="label-caps text-[10.5px] text-muted">
          {casse ? "Billes empochées à la casse" : "Billes empochées sur ce coup"}
        </span>
        <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
          {billes.map((n) => (
            <Bille
              key={n}
              n={n}
              choisie={choix.includes(n)}
              tombee={etat.empochees.includes(n)}
              onClick={n === NOIRE ? () => setPanneau(casse ? "noire_casse" : "noire") : () => basculer(n)}
            />
          ))}
        </div>
        <p className="text-[11px] text-muted">Touche la noire (8) quand elle tombe.</p>
      </Card>

      {erreur ? <p className="rounded-card bg-warn/10 px-3 py-2 text-[12.5px] text-warn">{erreur}</p> : null}

      {/* Ce qui s'est passé. */}
      {panneau === "faute" ? (
        <Card shape="panel" className="flex flex-col gap-2 p-4">
          <span className="text-[13px] font-semibold">Faute de {tireur}{sel.length ? ` (billes ${sel.join(", ")} tombées)` : ""}</span>
          {(Object.keys(FAUTES) as Faute[]).map((f) => (
            <button key={f} disabled={pending} onClick={() => jouer({ type: "faute", faute: f, billes: sel }, "Faute : bille en main")}
              className="press h-11 rounded-full border border-warn/40 text-[12.5px] text-warn disabled:opacity-50">
              {FAUTES[f]}
            </button>
          ))}
          <button onClick={() => setPanneau(null)} className="text-[12px] text-muted">Retour</button>
        </Card>
      ) : panneau === "noire" ? (
        <Card shape="panel" className="flex flex-col gap-2 p-4">
          <span className="text-[13px] font-semibold">La noire est tombée ({tireur})</span>
          <button disabled={pending} onClick={() => jouer({ type: "noire", legale: true }, "Noire")}
            className="press h-12 rounded-full bg-gold text-[13px] font-semibold text-gold-ink disabled:opacity-50">
            Proprement, dans la poche annoncée
          </button>
          {!pret ? (
            <p className="text-[11.5px] text-warn">
              Attention : {tireur} n&apos;a pas fini {etat.groupes[etat.main] ? `ses ${NOMS_GROUPES[etat.groupes[etat.main]!]}` : "son groupe"} — la noire lui fait perdre la manche.
            </p>
          ) : null}
          {[
            ["blanche", "Avec la blanche dans une poche"],
            ["poche", "Dans une autre poche que celle annoncée"],
            ["sortie", "Sortie de la table"],
          ].map(([k, label]) => (
            <button key={k} disabled={pending} onClick={() => jouer({ type: "noire", legale: false, motif: label.toLowerCase() }, "Noire perdante")}
              className="press h-11 rounded-full border border-warn/40 text-[12.5px] text-warn disabled:opacity-50">
              {label} — perd la manche
            </button>
          ))}
          <button onClick={() => setPanneau(null)} className="text-[12px] text-muted">Retour</button>
        </Card>
      ) : panneau === "noire_casse" ? (
        <Card shape="panel" className="flex flex-col gap-2 p-4">
          <span className="text-[13px] font-semibold">Noire à la casse — règle de la salle</span>
          <button disabled={pending} onClick={() => jouer({ type: "noire_casse", gagne: true }, "Noire à la casse")}
            className="press h-12 rounded-full bg-gold text-[13px] font-semibold text-gold-ink disabled:opacity-50">
            {nom(etat.casseur)} gagne la manche
          </button>
          <button disabled={pending} onClick={() => jouer({ type: "noire_casse", gagne: false }, "Noire replacée")}
            className="press h-11 rounded-full border border-line text-[12.5px] disabled:opacity-50">
            On la replace, la partie continue
          </button>
          <button onClick={() => setPanneau(null)} className="text-[12px] text-muted">Retour</button>
        </Card>
      ) : casse ? (
        <div className="grid grid-cols-2 gap-2">
          <button disabled={pending} onClick={() => jouer({ type: "casse", empochees: sel }, "Casse")}
            className="press col-span-2 flex h-14 items-center justify-center gap-2 rounded-panel bg-gold text-[15px] font-semibold text-gold-ink disabled:opacity-50">
            {pending ? <Spinner size={16} /> : null}
            {sel.length ? `Casse de ${nom(etat.casseur)} · ${sel.length} bille${sel.length > 1 ? "s" : ""}` : `Casse de ${nom(etat.casseur)} · rien n'est tombé`}
          </button>
          <button disabled={pending} onClick={() => jouer({ type: "casse", empochees: sel, faute: true }, "Faute à la casse")}
            className="press col-span-2 h-11 rounded-full border border-warn/40 text-[12.5px] text-warn disabled:opacity-50">
            Faute à la casse (blanche empochée ou sortie)
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button disabled={pending || !sel.length} onClick={() => jouer({ type: "empoche", billes: sel }, `Empoché · ${tireur} continue`)}
            className="press col-span-2 flex h-14 items-center justify-center gap-2 rounded-panel bg-gold text-[15px] font-semibold text-gold-ink disabled:opacity-45">
            {pending ? <Spinner size={16} /> : null}
            {sel.length ? `Empoché : ${sel.join(", ")} · ${tireur} continue` : "Touche les billes empochées"}
          </button>
          <button disabled={pending} onClick={() => jouer({ type: "rate" }, "Raté : la main passe")}
            className="press h-12 rounded-full border border-line text-[13px] font-semibold disabled:opacity-50">
            Raté
          </button>
          <button disabled={pending} onClick={() => jouer({ type: "securite" }, "Sécurité")}
            className="press h-12 rounded-full border border-line text-[13px] font-semibold disabled:opacity-50">
            Sécurité
          </button>
          <button disabled={pending} onClick={() => setPanneau("faute")}
            className="press col-span-2 h-12 rounded-full border border-warn/40 text-[13px] font-semibold text-warn disabled:opacity-50">
            Faute…
          </button>
        </div>
      )}

      {annulable && !panneau ? (
        <button onClick={annuler} disabled={pending} className="press self-center text-[12px] text-muted underline-offset-4 hover:text-ink hover:underline">
          Annuler le dernier coup
        </button>
      ) : null}
    </div>
  );
}
