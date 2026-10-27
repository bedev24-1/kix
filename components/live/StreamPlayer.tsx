"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LiveDot } from "@/components/live/LiveDot";
import { Spinner } from "@/components/ui/Spinner";
import { requestWatchTicket } from "@/lib/actions";
import { cn } from "@/lib/cn";
import type { EtatBarre } from "@/lib/barre-types";
import { BarreObs } from "@/components/live/barre/BarreObs";
import { MiniBarre } from "@/components/live/barre/MiniBarre";

export type Overlay = {
  a: string;
  b: string;
  scoreA: number;
  scoreB: number;
  target: number;
  turnId: string | null;
  aId: string;
  bId: string;
} | null;

type Phase = "loading" | "playing" | "waiting" | "error";

/**
 * Le lecteur du direct.
 *
 * HLS partout — c'est ce qui passe derrière les réseaux mobiles camerounais et
 * ce que Safari lit nativement ; `hls.js` prend le relais ailleurs. L'URL porte
 * un billet signé et court : la page en redemande un avant qu'il expire, ce qui
 * permet de couper un direct payant en cours de route.
 */
export function StreamPlayer({
  streamId,
  title,
  poster,
  overlay,
  live,
  barre,
}: {
  streamId: string;
  title: string;
  poster?: string;
  overlay: Overlay;
  live: boolean;
  /** La Barre Master Break, quand le direct suit un match arbitré. Elle remplace l'habillage simple. */
  barre?: { etat: EtatBarre; reste: number | null } | null;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  // La taille du lecteur : grande barre (comme dans OBS) dès qu'il y a la place, mini-barre sur téléphone.
  const [taille, setTaille] = useState({ l: 0, h: 0 });
  useEffect(() => {
    const node = shell.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver(([e]) => setTaille({ l: e.contentRect.width, h: e.contentRect.height }));
    obs.observe(node);
    return () => obs.disconnect();
  }, []);
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState<string>();
  const [tv, setTv] = useState(false);
  const [muted, setMuted] = useState(true);

  const attach = useCallback(async () => {
    const node = video.current;
    if (!node) return;

    const ticket = await requestWatchTicket(streamId);
    if (!ticket.ok) {
      setPhase("error");
      setMessage(
        ticket.reason === "ppv"
          ? "Ce direct demande un billet vidéo."
          : ticket.reason === "members"
            ? "Ce direct est réservé aux abonnés."
            : "Ce direct n'est plus disponible.",
      );
      return;
    }

    // Safari lit le HLS nativement ; ailleurs, hls.js fait le travail.
    if (node.canPlayType("application/vnd.apple.mpegurl")) {
      node.src = ticket.hls;
      setPhase("playing");
      return;
    }

    const { default: Hls } = await import("hls.js");
    if (!Hls.isSupported()) {
      setPhase("error");
      setMessage("Ce navigateur ne sait pas lire le direct.");
      return;
    }

    const hls = new Hls({ lowLatencyMode: true, backBufferLength: 30 });
    hls.loadSource(ticket.hls);
    hls.attachMedia(node);
    hls.on(Hls.Events.MANIFEST_PARSED, () => setPhase("playing"));
    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (!data.fatal) return;
      // Une source pas encore arrivée n'est pas une panne : on réessaiera.
      // Mais un 502 ou un refus de connexion, si : c'est le serveur vidéo qui
      // manque, pas la caméra. Annoncer « la caméra n'a pas commencé » dans ce
      // cas fait attendre une salle entière devant une panne d'infrastructure.
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        const code = data.response?.code ?? 0;
        const absent = code === 0 || code >= 500;
        setPhase("waiting");
        setMessage(
          absent
            ? "Le serveur vidéo est injoignable. Si ça dure, préviens la salle."
            : "La caméra n'a pas encore commencé à émettre.",
        );
        window.setTimeout(() => hls.startLoad(), 4000);
        return;
      }
      if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        hls.recoverMediaError();
        return;
      }
      setPhase("error");
      setMessage("Le direct s'est interrompu.");
    });

    return () => hls.destroy();
  }, [streamId]);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    let alive = true;

    // L'attachement est asynchrone (il demande d'abord un billet au serveur) :
    // on le sort du corps de l'effet pour qu'aucun état ne change pendant le
    // rendu, et on l'annule si le composant part entre-temps.
    const timer = window.setTimeout(() => {
      void attach().then((fn) => {
        if (!alive) {
          fn?.();
          return;
        }
        dispose = fn ?? undefined;
      });
    }, 0);

    // Le billet est court : on le renouvelle bien avant qu'il expire.
    const renew = window.setInterval(() => void attach(), 3 * 3600 * 1000);

    return () => {
      alive = false;
      window.clearTimeout(timer);
      window.clearInterval(renew);
      dispose?.();
    };
  }, [attach]);

  const toggleTv = useCallback(async () => {
    const node = shell.current;
    if (!node) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await node.requestFullscreen();
    } catch {
      setTv((v) => !v);
    }
  }, []);

  useEffect(() => {
    const sync = () => setTv(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  return (
    <div
      ref={shell}
      className={cn(
        "relative overflow-hidden rounded-panel bg-black",
        tv ? "h-dvh w-dvw rounded-none" : "aspect-video w-full",
      )}
    >
      <video
        ref={video}
        poster={poster}
        muted={muted}
        autoPlay
        playsInline
        controls={false}
        className="h-full w-full object-contain"
      />

      {phase !== "playing" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg/85 px-6 text-center">
          {phase === "error" ? null : <Spinner size={26} className="text-gold-text" />}
          <p className="text-[13.5px] text-dim">{message ?? "Connexion au direct…"}</p>
        </div>
      ) : null}

      {/* La Barre Master Break : grande quand il y a la place, mini sur téléphone.
          Rien si la vidéo la porte déjà (incrustée par OBS). */}
      {barre && !barre.etat.barreVideo ? (
        taille.l >= 640 ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 1920,
                height: 1080,
                transform: `translate(-50%, -50%) scale(${Math.min(taille.l / 1920, (taille.h || taille.l * 0.5625) / 1080)})`,
              }}
            >
              <BarreObs etat={barre.etat} reste={barre.reste} options={{ coin: true, sponsor: true, chrono: true, annonce: true, direct: true }} />
            </div>
          </div>
        ) : (
          <MiniBarre etat={barre.etat} reste={barre.reste} />
        )
      ) : null}

      {/* Habillage simple : le score vient de la feuille de match, en direct. */}
      {overlay && !barre ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3",
            tv ? "p-[2.5vw]" : "p-3.5",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-3 rounded-full bg-black/65 backdrop-blur-md",
              tv ? "gap-6 px-[1.8vw] py-[1vh]" : "px-3.5 py-2",
            )}
          >
            <Name
              name={overlay.a}
              tone="gold"
              active={overlay.turnId === overlay.aId}
              tv={tv}
            />
            <span className={cn("font-bold tabular-nums", tv ? "text-[clamp(28px,3.4vw,64px)]" : "text-[17px]")}>
              <span className="text-gold-text">{overlay.scoreA}</span>
              <span className="mx-1.5 text-white/40">–</span>
              <span className="text-jade-text">{overlay.scoreB}</span>
            </span>
            <Name
              name={overlay.b}
              tone="jade"
              active={overlay.turnId === overlay.bId}
              tv={tv}
            />
          </div>

          {live ? <LiveDot className={cn("bg-black/65 backdrop-blur-md", tv && "px-4 py-2 text-[13px]")} /> : null}
        </div>
      ) : null}

      <div
        className={cn(
          "absolute inset-x-0 flex items-center justify-between gap-3 p-3.5",
          // La barre occupe le bas : les commandes montent en haut à droite.
          barre && !barre.etat.barreVideo ? (taille.l >= 640 ? "top-[10%] justify-end" : "top-0 justify-end p-2.5") : "bottom-0",
        )}
      >
        {barre && !barre.etat.barreVideo ? null : (
          <span className="truncate rounded-full bg-black/60 px-3 py-1.5 text-[11.5px] text-white/80 backdrop-blur-md">
            {title}
          </span>
        )}
        <div className="flex gap-2">
          <Control onClick={() => setMuted((m) => !m)} label={muted ? "Activer le son" : "Couper le son"}>
            {muted ? <MutedIcon /> : <SoundIcon />}
          </Control>
          <Control onClick={toggleTv} label={tv ? "Quitter le plein écran" : "Plein écran"}>
            <ExpandIcon />
          </Control>
        </div>
      </div>
    </div>
  );
}

function Name({ name, tone, active, tv }: { name: string; tone: "gold" | "jade"; active: boolean; tv: boolean }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 truncate font-semibold text-white",
        tv ? "max-w-[18vw] text-[clamp(14px,1.6vw,28px)]" : "max-w-28 text-[12.5px]",
      )}
    >
      {active ? (
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", tone === "gold" ? "bg-gold" : "bg-jade")} />
      ) : null}
      {name}
    </span>
  );
}

function Control({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="press grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white/85 backdrop-blur-md transition hover:text-white"
    >
      {children}
    </button>
  );
}

const ExpandIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
);

const SoundIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 9v6h4l5 4V5L8 9H4zM16.5 8.5a5 5 0 0 1 0 7" strokeLinejoin="round" />
  </svg>
);

const MutedIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 9v6h4l5 4V5L8 9H4zM17 10l4 4M21 10l-4 4" strokeLinejoin="round" />
  </svg>
);
