"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Scoreboard, type Side } from "@/components/live/Scoreboard";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useSnackbar } from "@/components/ui/Snackbar";
import { CheckIcon, MinusIcon, PlusIcon, TargetIcon } from "@/components/icons";
import { finishMatch, logMatchEvent, scoreRack, startMatch } from "@/lib/actions";
import { useLive } from "@/lib/useLive";
import { modeDuJeu, regleDuJeu } from "@/lib/regles";
import { cn } from "@/lib/cn";
import type { LiveState } from "@/components/live/MatchLive";
import { Console8 } from "@/components/live/Console8";
import { preparer8 } from "@/lib/actions-huit";
import type { Cote, Etat8, ReglesCasse } from "@/lib/huit";

/** Les gestes annexes, ceux qui nourrissent les statistiques sans changer le score. */
const marks: { kind: string; label: string; tone: string }[] = [
  { kind: "break", label: "Casse gagnante", tone: "text-live" },
  { kind: "pot", label: "Empochage", tone: "text-jade-text" },
  { kind: "safety", label: "Sécurité", tone: "text-jade-text" },
  { kind: "foul", label: "Faute", tone: "text-warn" },
];

/**
 * La feuille de match, telle que l'arbitre la tient au bord de la table.
 *
 * Deux grosses colonnes, une par joueur, et des cibles larges : on marque d'un
 * pouce, debout, sans lire. Le retrait d'une manche est là pour la faute de
 * frappe, et chaque geste est horodaté au nom de celui qui l'a saisi.
 */
export function ScoreConsole({
  initial,
  a,
  b,
  label,
  venue,
  table,
  can,
  huit,
}: {
  /** Le mode 8-ball coup par coup (billard américain). Nul : feuille simple « qui gagne la partie ». */
  huit?: { etat: Etat8; annulable: boolean } | null;
  initial: LiveState;
  a: Side;
  b: Side;
  label: string;
  venue: string;
  table: string | null;
  can: boolean;
}) {
  const { data, connected } = useLive<LiveState>(`/api/live/${initial.id}`, initial);
  const { notify } = useSnackbar();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [casseur, setCasseur] = useState<Cote>("A");
  const [regle, setRegle] = useState<ReglesCasse>("alternee");
  const [corriger, setCorriger] = useState(false);

  const run = (label: string, fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      notify(label);
      router.refresh();
    });

  const done = data.status === "done";
  const live = data.status === "live";
  // Une partie sèche se marque d'un seul geste : celui qui met la noire a
  // gagné le match, il n'y a pas de manche à compter derrière.
  const seche = modeDuJeu(data.target) === "seche";

  return (
    <div className="flex flex-col gap-4">
      <Card shape="panel" className="flex flex-col gap-5 p-5">
        <Scoreboard
          a={a}
          b={b}
          scoreA={data.scoreA}
          scoreB={data.scoreB}
          target={data.target}
          turnId={data.turnId}
          status={data.status}
          winnerId={data.winnerId}
          connected={connected}
          label={`${label} · ${venue}${table ? ` · ${table}` : ""}`}
        />
        <p className="text-center text-[11.5px] text-muted">{regleDuJeu(data.target)}</p>
      </Card>

      {/* Le résultat passe avant tout : une fois le match fini, plus personne
          n'a le droit de marquer, et afficher « tu ne peux pas marquer » à
          l'arbitre qui vient de siffler la fin n'aurait aucun sens. */}
      {done || data.status === "cancelled" ? (
        <Card tone="gold" shape="panel" className="flex flex-col items-center gap-2 px-5 py-8 text-center">
          <span className="pop grid h-14 w-14 place-items-center rounded-full bg-gold text-gold-ink">
            <CheckIcon size={26} />
          </span>
          <h2 className="text-[19px]">{done ? "Match terminé" : "Match annulé"}</h2>
          <p className="text-[13px] text-dim">
            {data.scoreA} – {data.scoreB} ·{" "}
            {data.winnerId === a.id ? a.name : data.winnerId === b.id ? b.name : "égalité"}
          </p>
        </Card>
      ) : !can ? (
        <Card tone="dashed" shape="panel" className="px-5 py-6 text-center text-[13px] text-muted">
          Tu peux suivre ce match, mais pas le marquer.
        </Card>
      ) : data.status === "scheduled" ? (
        <div className="flex flex-col gap-3">
        {huit ? (
          <Card shape="panel" className="flex flex-col gap-3 p-4">
            <span className="label-caps text-[10.5px] text-muted">Qui casse en premier ?</span>
            <div className="grid grid-cols-2 gap-2">
              {([["A", a], ["B", b]] as const).map(([c, side]) => (
                <button key={c} type="button" onClick={() => setCasseur(c)}
                  className={cn("press h-11 truncate rounded-full border px-3 text-[13px]", casseur === c ? "border-gold bg-gold/15 font-semibold" : "border-line text-dim")}>
                  {side.name}
                </button>
              ))}
            </div>
            <span className="label-caps text-[10.5px] text-muted">Les manches suivantes</span>
            <div className="grid grid-cols-2 gap-2">
              {([["alternee", "Casse alternée"], ["gagnant", "Le gagnant casse"]] as const).map(([r, label]) => (
                <button key={r} type="button" onClick={() => setRegle(r)}
                  className={cn("press h-11 rounded-full border px-3 text-[13px]", regle === r ? "border-gold bg-gold/15 font-semibold" : "border-line text-dim")}>
                  {label}
                </button>
              ))}
            </div>
          </Card>
        ) : null}
        <button
          onClick={() =>
            run("Match lancé", async () => {
              if (huit) await preparer8(initial.id, casseur, regle);
              await startMatch(initial.id);
            })
          }
          disabled={pending}
          className="press go flex h-16 items-center justify-center gap-2.5 rounded-panel bg-gold text-[16px] font-semibold text-gold-ink transition hover:brightness-105 disabled:opacity-50"
        >
          {pending ? <Spinner size={18} /> : <TargetIcon size={20} />}
          Lancer le match
        </button>
        </div>
      ) : live && huit ? (
        <>
          <Console8 matchId={initial.id} a={a} b={b} etat={huit.etat} annulable={huit.annulable} />
          {corriger ? (
            <Card shape="panel" className="flex flex-col gap-2 p-4">
              <span className="label-caps text-[10.5px] text-muted">Corriger le score des manches</span>
              <div className="grid grid-cols-2 gap-3">
                {[a, b].map((side) => (
                  <div key={side.id} className="flex flex-col gap-1.5">
                    <span className="truncate text-center text-[12px]">{side.name}</span>
                    <div className="flex gap-1.5">
                      <button disabled={pending} onClick={() => run("Manche ajoutée", () => scoreRack(initial.id, side.id, 1))}
                        className="press h-10 grow rounded-full border border-line disabled:opacity-45"><PlusIcon size={14} className="mx-auto" /></button>
                      <button disabled={pending} onClick={() => run("Manche retirée", () => scoreRack(initial.id, side.id, -1))}
                        className="press h-10 grow rounded-full border border-line disabled:opacity-45"><MinusIcon size={14} className="mx-auto" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setCorriger(false)} className="text-[12px] text-muted">Fermer</button>
            </Card>
          ) : (
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={() => setCorriger(true)} className="press text-[12px] text-muted underline-offset-4 hover:text-ink hover:underline">
                Corriger le score
              </button>
              <button onClick={() => setConfirmEnd(true)} className="press text-[12px] text-muted underline-offset-4 hover:text-ink hover:underline">
                Terminer le match
              </button>
            </div>
          )}
          {confirmEnd ? (
            <div className="flex flex-wrap items-center gap-2.5 rounded-panel border border-warn/40 bg-warn/10 px-4 py-3.5">
              <span className="grow text-[12.5px] text-warn">Terminer maintenant ? Le score en cours fait foi.</span>
              <button onClick={() => setConfirmEnd(false)} className="press h-10 rounded-full border border-line px-4 text-[12px] text-dim hover:text-ink">Continuer</button>
              <button onClick={() => run("Match terminé", () => finishMatch(initial.id))} disabled={pending}
                className="press flex h-10 items-center gap-1.5 rounded-full bg-warn px-4 text-[12px] font-semibold text-bg disabled:opacity-50">
                {pending ? <Spinner size={13} /> : <CheckIcon size={14} />} Terminer
              </button>
            </div>
          ) : null}
        </>
      ) : live ? (
        <>
          <div className="flex flex-col gap-2">
            <span className="label-caps text-center text-[10.5px] text-muted">
              {seche ? "Qui a mis la noire ?" : "Qui a gagné la partie ?"}
            </span>
            <div className="grid grid-cols-2 gap-3">
              <Column side={a} tone="gold" pending={pending} matchId={initial.id} run={run} seche={seche} />
              <Column side={b} tone="jade" pending={pending} matchId={initial.id} run={run} seche={seche} />
            </div>
          </div>

          <Card shape="panel" className="flex flex-col gap-3 p-4">
            <span className="label-caps text-[10.5px] text-muted">Autres faits de jeu</span>
            <div className="grid grid-cols-2 gap-2">
              {marks.map((m) => (
                <div key={m.kind} className="flex flex-col gap-1.5">
                  <span className={cn("text-[11.5px]", m.tone)}>{m.label}</span>
                  <div className="flex gap-1.5">
                    {[a, b].map((side) => (
                      <button
                        key={side.id}
                        onClick={() => run(m.label, () => logMatchEvent(initial.id, side.id, m.kind))}
                        disabled={pending}
                        className="press h-10 grow truncate rounded-full border border-line px-2 text-[11.5px] text-dim transition hover:bg-surface-2 hover:text-ink disabled:opacity-45"
                      >
                        {side.name.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {confirmEnd ? (
            <div className="flex flex-wrap items-center gap-2.5 rounded-panel border border-warn/40 bg-warn/10 px-4 py-3.5">
              <span className="grow text-[12.5px] text-warn">
                Terminer maintenant ? Le score en cours fait foi.
              </span>
              <button
                onClick={() => setConfirmEnd(false)}
                className="press h-10 rounded-full border border-line px-4 text-[12px] text-dim hover:text-ink"
              >
                Continuer
              </button>
              <button
                onClick={() => run("Match terminé", () => finishMatch(initial.id))}
                disabled={pending}
                className="press flex h-10 items-center gap-1.5 rounded-full bg-warn px-4 text-[12px] font-semibold text-bg disabled:opacity-50"
              >
                {pending ? <Spinner size={13} /> : <CheckIcon size={14} />}
                Terminer
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmEnd(true)}
              className="press self-center text-[12px] text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              {seche ? "Terminer le match sans la noire" : "Terminer le match avant la fin de la course"}
            </button>
          )}
        </>
      ) : null}
    </div>
  );
}

function Column({
  side,
  tone,
  pending,
  matchId,
  run,
  seche,
}: {
  side: Side;
  tone: "gold" | "jade";
  pending: boolean;
  matchId: string;
  run: (label: string, fn: () => Promise<unknown>) => void;
  seche: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() =>
          run(seche ? `La noire · ${side.name}` : `Partie · ${side.name}`, () => scoreRack(matchId, side.id, 1))
        }
        disabled={pending}
        aria-label={seche ? `La noire pour ${side.name}` : `Partie pour ${side.name}`}
        className={cn(
          "press flex h-28 flex-col items-center justify-center gap-1.5 rounded-panel font-semibold transition disabled:opacity-50",
          tone === "gold"
            ? "bg-gold text-gold-ink hover:brightness-105"
            : "glass-jade text-jade-text hover:brightness-110",
        )}
      >
        <PlusIcon size={26} />
        <span className="max-w-full truncate px-3 text-[13px]">{side.name}</span>
        <span className="text-[10.5px] font-normal opacity-70">{seche ? "met la noire" : "gagne la partie"}</span>
      </button>

      {/* En partie sèche il n'y a rien à retirer : le match s'arrête au même
          geste. Le bouton ne servirait qu'à rouvrir une rencontre finie. */}
      {seche ? null : (
        <button
          onClick={() => run("Partie retirée", () => scoreRack(matchId, side.id, -1))}
          disabled={pending}
          aria-label={`Retirer une partie à ${side.name}`}
          className="press flex h-11 items-center justify-center gap-1.5 rounded-full border border-line text-[12px] text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-45"
        >
          <MinusIcon size={14} /> Retirer
        </button>
      )}
    </div>
  );
}
