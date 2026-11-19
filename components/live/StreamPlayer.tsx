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
  // Le son. Les navigateurs n'autorisent la lecture automatique que muette :
  // on part muet, on tente le son si le spectateur l'avait déjà activé, et
  // sinon une pastille bien visible invite à toucher pour l'entendre.
  const [muted, setMuted] = useState(true);
  const [sansSon, setSansSon] = useState(false);

  const lancer = useCallback(async (node: HTMLVideoElement) => {
    let voulu = false;
    try {
      voulu = localStorage.getItem("mb.son") === "1";
    } catch {}
    node.muted = !voulu;
    try {
      await node.play();
    } catch {
      // Son refusé sans geste : on repart muet, l'image d'abord.
      node.muted = true;
      await node.play().catch(() => {});
    }
    setMuted(node.muted);
  }, []);

  const basculerSon = useCallback(() => {
    const node = video.current;
    if (!node) return;
    // Dans le geste lui-même : iPhone n'accorde le son qu'à ce moment-là.
    node.muted = !node.muted;
    if (!node.muted) void node.play().catch(() => {});
    setMuted(node.muted);
    try {
      localStorage.setItem("mb.son", node.muted ? "0" : "1");
    } catch {}
  }, []);

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

    // D'abord WebRTC (WHEP) : moins d'une seconde de retard, et il lit tous
    // les codecs qu'un téléphone envoie — VP8 compris, que le HLS ne sait pas
    // porter (playlist sans image : la vignette restait affichée).
    const whep = await lireEnWhep(node, ticket.whep);
    if (whep) {
      // Le WebRTC ne porte que l'Opus. Une source en AAC — OBS, une caméra
      // RTMP — arrive donc sans son par ce chemin, alors que le HLS, lui, le
      // porte. Image sans son en WebRTC et son annoncé en HLS : on prend le
      // HLS, quelques secondes de retard valent mieux qu'un direct muet.
      if (whep.son || !(await hlsPorteLeSon(ticket.hls))) {
        setSansSon(!whep.son);
        setPhase("playing");
        void lancer(node);
        return whep.fermer;
      }
      whep.fermer();
    }
    setSansSon(false);

    // Secours : le HLS. Safari le lit nativement ; ailleurs, hls.js fait le travail.
    if (node.canPlayType("application/vnd.apple.mpegurl")) {
      node.src = ticket.hls;
      setPhase("playing");
      void lancer(node);
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
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setPhase("playing");
      void lancer(node);
    });
    // Une playlist sans piste vidéo (codec que le HLS ne porte pas) : on le dit
    // au lieu de laisser la vignette immobile.
    const sansImage = window.setTimeout(() => {
      if (node.videoWidth === 0) {
        setPhase("waiting");
        setMessage("Le son arrive, pas l'image. Relance la diffusion depuis le téléphone, ou essaie un autre navigateur.");
      }
    }, 12000);
    node.addEventListener("loadeddata", () => window.clearTimeout(sansImage), { once: true });
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

    return () => {
      window.clearTimeout(sansImage);
      hls.destroy();
    };
  }, [streamId, lancer]);

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

  // Plein écran. Safari sur iPhone refuse le plein écran d'un bloc (il ne
  // l'accorde qu'à la vidéo seule, ce qui ferait perdre la barre de score) :
  // on y passe alors en « plein écran maison », un calque fixe par-dessus
  // toute l'application. Ailleurs, on prend le vrai, et on tourne l'écran
  // dans le sens de l'image quand le système le permet (Android).
  const [pseudo, setPseudo] = useState(false);
  const [vrai, setVrai] = useState(false);
  const tv = pseudo || vrai;

  const toggleTv = useCallback(async () => {
    const node = shell.current as (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> | void }) | null;
    if (!node) return;
    const doc = document as Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };
    if (document.fullscreenElement || doc.webkitFullscreenElement) {
      try {
        screen.orientation?.unlock?.();
      } catch {}
      await (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
      return;
    }
    if (pseudo) {
      setPseudo(false);
      return;
    }
    const demander = node.requestFullscreen?.bind(node) ?? node.webkitRequestFullscreen?.bind(node);
    if (demander) {
      try {
        await demander();
        const v = video.current;
        const paysage = !v || !v.videoWidth || v.videoWidth >= v.videoHeight;
        try {
          await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.(
            paysage ? "landscape" : "portrait",
          );
        } catch {}
        return;
      } catch {
        /* refusé : plein écran maison */
      }
    }
    setPseudo(true);
  }, [pseudo]);

  useEffect(() => {
    const doc = document as Document & { webkitFullscreenElement?: Element | null };
    const sync = () => setVrai(Boolean(document.fullscreenElement || doc.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  // Le sens de l'écran et celui de l'image : en plein écran maison, téléphone
  // tenu droit devant une image en paysage, on couche l'image pour qu'elle
  // occupe tout l'écran — comme le font les applications vidéo. Dès que le
  // téléphone est tourné, l'image se redresse d'elle-même.
  const [sens, setSens] = useState({ ecranPortrait: false, imagePaysage: true });
  useEffect(() => {
    const v = video.current;
    const lire = () =>
      setSens({
        ecranPortrait: window.innerHeight > window.innerWidth,
        imagePaysage: !v || !v.videoWidth || v.videoWidth >= v.videoHeight,
      });
    lire();
    window.addEventListener("resize", lire);
    window.addEventListener("orientationchange", lire);
    v?.addEventListener("loadedmetadata", lire);
    v?.addEventListener("resize", lire);
    return () => {
      window.removeEventListener("resize", lire);
      window.removeEventListener("orientationchange", lire);
      v?.removeEventListener("loadedmetadata", lire);
      v?.removeEventListener("resize", lire);
    };
  }, []);
  const couche = pseudo && sens.ecranPortrait && sens.imagePaysage;

  // Plein écran maison : la page ne défile plus dessous, Échap en sort.
  useEffect(() => {
    if (!pseudo) return;
    const html = document.documentElement;
    html.classList.add("mb-plein-ecran");
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setPseudo(false);
    window.addEventListener("keydown", echap);
    return () => {
      html.classList.remove("mb-plein-ecran");
      window.removeEventListener("keydown", echap);
    };
  }, [pseudo]);

  // Sur un téléphone en paysage, la barre de navigation du bas cache la vidéo :
  // on la range tant qu'un lecteur est à l'écran (voir globals.css).
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("mb-lecteur");
    return () => html.classList.remove("mb-lecteur");
  }, []);

  // Les marges de l'encoche et de la barre d'accueil, en plein écran.
  const marges = tv
    ? {
        paddingTop: "max(0.875rem, env(safe-area-inset-top))",
        paddingRight: "max(0.875rem, env(safe-area-inset-right))",
        paddingLeft: "max(0.875rem, env(safe-area-inset-left))",
      }
    : undefined;

  return (
    <div
      ref={shell}
      className={cn(
        "overflow-hidden bg-black",
        couche
          ? "fixed top-1/2 left-1/2 z-[100] h-[100dvw] w-[100dvh] rounded-none"
          : pseudo
            ? "fixed inset-0 z-[100] h-dvh w-dvw rounded-none"
            : vrai
              ? "relative h-dvh w-dvw rounded-none"
              : // Téléphone en paysage : le lecteur tient dans la hauteur de l'écran.
                "lecteur-paysage relative mx-auto aspect-video w-full max-w-full rounded-panel",
      )}
      style={couche ? { transform: "translate(-50%, -50%) rotate(90deg)" } : undefined}
    >
      <video
        ref={video}
        poster={poster}
        muted
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
          style={marges}
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

      {/* Pastille du son : le petit bouton seul passait inaperçu, et on
          croyait le direct sans son. */}
      {phase === "playing" && muted && !sansSon ? (
        <button
          onClick={basculerSon}
          className="press absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-black/70 px-4 py-2.5 text-[13px] font-semibold text-white backdrop-blur-md transition hover:bg-black/80"
        >
          <MutedIcon /> Toucher pour le son
        </button>
      ) : null}

      <div
        style={marges}
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
          <Control onClick={basculerSon} label={muted ? "Activer le son" : "Couper le son"}>
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

/**
 * Lecture WebRTC (WHEP), au retard d'une seconde. Rend la fonction qui ferme
 * la connexion dès que la première image est arrivée, ou null si elle n'est pas
 * venue à temps (réseau qui bloque l'UDP, direct pas encore lancé) : le HLS
 * prend alors le relais.
 */
async function lireEnWhep(
  node: HTMLVideoElement,
  url: string,
  delai = 7000,
): Promise<{ fermer: () => void; son: boolean } | null> {
  if (typeof RTCPeerConnection === "undefined") return null;
  const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
  pc.addTransceiver("video", { direction: "recvonly" });
  pc.addTransceiver("audio", { direction: "recvonly" });
  pc.ontrack = (e) => {
    if (e.streams[0] && node.srcObject !== e.streams[0]) node.srcObject = e.streams[0];
  };
  try {
    await pc.setLocalDescription(await pc.createOffer());
    await new Promise<void>((resolve) => {
      if (pc.iceGatheringState === "complete") return resolve();
      const check = () => {
        if (pc.iceGatheringState !== "complete") return;
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      };
      pc.addEventListener("icegatheringstatechange", check);
      window.setTimeout(resolve, 2000);
    });
    const reponse = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/sdp" },
      body: pc.localDescription?.sdp ?? "",
    });
    if (!reponse.ok) throw new Error(String(reponse.status));
    await pc.setRemoteDescription({ type: "answer", sdp: await reponse.text() });

    // On attend une vraie image, pas seulement une négociation réussie.
    const image = await new Promise<boolean>((resolve) => {
      const fini = window.setTimeout(() => resolve(false), delai);
      node.addEventListener(
        "loadeddata",
        () => {
          window.clearTimeout(fini);
          resolve(node.videoWidth > 0);
        },
        { once: true },
      );
    });
    if (!image) throw new Error("pas d'image");
    // Le serveur refuse la piste audio quand la source n'a pas de son qu'il
    // sache passer en WebRTC : aucune piste n'arrive alors.
    const son = ((node.srcObject as MediaStream | null)?.getAudioTracks().length ?? 0) > 0;
    return {
      son,
      fermer: () => {
        pc.close();
        node.srcObject = null;
      },
    };
  } catch {
    pc.close();
    node.srcObject = null;
    return null;
  }
}

/**
 * La playlist HLS annonce-t-elle du son ? Les codecs du flux y sont écrits
 * (mp4a pour l'AAC, opus), ou une piste audio à part (EXT-X-MEDIA).
 */
async function hlsPorteLeSon(url: string): Promise<boolean> {
  try {
    const reponse = await fetch(url, { cache: "no-store" });
    if (!reponse.ok) return false;
    return /mp4a|opus|ac-3|ec-3|TYPE=AUDIO/i.test(await reponse.text());
  } catch {
    return false;
  }
}
