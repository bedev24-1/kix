"use client";

import { useRef, useState } from "react";
import { Bande, type Vignette } from "@/components/mb/accueil/BlocEvenements";
import { brancherNotifications, type CanalPush } from "@/components/mb/Notifications";
import { useSnackbar } from "@/components/ui/Snackbar";
import { BellIcon, CheckIcon } from "@/components/icons";
import { basculerRappel } from "@/lib/actions-rappels";
import { cn } from "@/lib/cn";

type Phase = "repos" | "remplit" | "pose";

/**
 * L'accueil quand aucune caméra ne tourne : deux bandes jointives.
 *
 * En haut, « Me prévenir au prochain direct ». Au toucher, le bouton remplit
 * toute la bande — des ondes partent du doigt — puis se range en languette
 * avec une coche, et rend la place à l'enseigne « En direct » en veille. Le
 * rappel est enregistré pour de bon : la prochaine caméra allumée, dans
 * n'importe quelle salle, envoie une notification (lib/rappels.ts), et le
 * bouton branche les notifications du téléphone si elles ne le sont pas.
 *
 * En bas, les dernières rediffusions défilent, comme la bande des événements.
 */
export function AucunDirect({
  rappel,
  rediffusions,
  canal,
}: {
  rappel: boolean;
  rediffusions: Vignette[];
  canal: CanalPush;
}) {
  const { notify } = useSnackbar();
  const [phase, setPhase] = useState<Phase>(rappel ? "pose" : "repos");
  const [onde, setOnde] = useState<{ x: number; n: number } | null>(null);
  const bouton = useRef<HTMLButtonElement>(null);

  async function poser(x: number) {
    setOnde((o) => ({ x, n: (o?.n ?? 0) + 1 }));
    setPhase("remplit");
    window.setTimeout(() => setPhase("pose"), 450);
    try {
      await basculerRappel(true);
    } catch {
      setPhase("repos");
      notify("Rappel impossible", { detail: "Le serveur n'a pas répondu, réessaie.", tone: "warn" });
      return;
    }
    // Le rappel est posé : il arrivera au moins dans les notifications de
    // l'app. Pour qu'il sonne sur le téléphone, il faut le push.
    const etat = await brancherNotifications(canal).catch(() => "impossible" as const);
    if (etat === "active") return;
    notify("On te prévient dans l'app", {
      detail:
        etat === "ios"
          ? "Pour une alerte sur l'iPhone, ajoute Master Break à l'écran d'accueil."
          : etat === "refusee"
            ? "Les notifications sont bloquées dans le navigateur : autorise-les pour être alerté."
            : "Active les notifications dans Notifications pour être alerté sur le téléphone.",
    });
  }

  async function retirer() {
    setPhase("repos");
    try {
      await basculerRappel(false);
    } catch {
      setPhase("pose");
    }
  }

  const pose = phase === "pose";
  return (
    <section aria-label="Les directs" className="-mx-[9px] overflow-hidden rounded-[22px] border border-line bg-[#0b241a] text-white md:mx-0">
      <div className="relative h-10 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- fond décoratif, fixe */}
        <img src="/img/hall-dark.jpg" alt="" className="absolute inset-0 h-full w-full object-cover grayscale-[.6] brightness-[.55]" />
        <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,12,9,.9),rgba(4,12,9,.55)_60%,rgba(4,12,9,.2))]" />

        {/* Avant le clic : le voyant en veille, dans la petite place laissée à gauche. */}
        <span className={cn("absolute inset-y-0 left-0 grid w-[10%] place-items-center transition-opacity", pose && "opacity-0")}>
          <Voyant />
        </span>

        {/* Après : l'enseigne éteinte, et ce qui va se passer. */}
        <span
          className={cn(
            "absolute inset-y-0 right-10 left-4 flex items-center gap-2.5 transition-opacity duration-300",
            pose ? "opacity-100 delay-300" : "opacity-0",
          )}
          aria-hidden={!pose}
        >
          <span className="flex h-[22px] shrink-0 items-center gap-1.5 rounded-full border border-white/22 bg-[#05100b]/50 pr-2 pl-[7px] text-[8px] font-extrabold tracking-[0.18em] text-white/42">
            <Voyant />
            EN DIRECT
          </span>
          <span className="truncate text-[11.5px] font-bold">
            Tables au repos <span className="font-normal text-white/65">· on te prévient</span>
          </span>
        </span>

        <button
          ref={bouton}
          type="button"
          aria-pressed={pose}
          aria-label={pose ? "Ne plus être prévenu du prochain direct" : "Me prévenir au prochain direct"}
          onClick={(e) => {
            if (phase === "remplit") return;
            if (pose) return void retirer();
            const r = bouton.current?.getBoundingClientRect();
            void poser(r ? e.clientX - r.left : 0);
          }}
          className="absolute inset-y-0 right-0 flex items-center justify-center gap-[7px] overflow-hidden bg-[#f3eee2] text-[11.5px] font-extrabold text-[#0b1a12]"
          style={{
            width: phase === "repos" ? "90%" : phase === "remplit" ? "100%" : "30px",
            transition:
              phase === "pose" ? "width .5s cubic-bezier(.65,0,.35,1)" : "width .35s cubic-bezier(.4,0,.2,1)",
          }}
        >
          {onde
            ? [0.35, 0.22, 0.12].map((a, k) => (
                <span
                  key={`${onde.n}-${k}`}
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 -mt-5 -ml-5 h-10 w-10 rounded-full bg-gold opacity-0 motion-reduce:hidden"
                  style={{
                    left: onde.x,
                    animation: `mb-onde .7s cubic-bezier(.2,.7,.3,1) ${k * 90}ms forwards`,
                    ["--a" as string]: a,
                  }}
                />
              ))
            : null}
          <span className="relative">{pose ? <CheckIcon size={14} strokeWidth={2.6} /> : <BellIcon size={14} strokeWidth={2.2} />}</span>
          {phase === "repos" ? <span className="relative whitespace-nowrap">Me prévenir au prochain direct</span> : null}
        </button>
      </div>

      {rediffusions.length ? (
        <>
          <span className="block h-px bg-white/16" />
          <Bande autres={rediffusions} lecture />
        </>
      ) : null}
    </section>
  );
}

function Voyant() {
  return (
    <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#ff5a50]/70 shadow-[0_0_0_1.5px_rgba(255,90,80,.6)] [animation:mb-veille_3.2s_ease-in-out_infinite] motion-reduce:animate-none" />
  );
}
