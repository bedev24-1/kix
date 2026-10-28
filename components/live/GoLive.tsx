"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useSnackbar } from "@/components/ui/Snackbar";
import { LiveDot } from "@/components/live/LiveDot";
import { cn } from "@/lib/cn";

type Phase = "idle" | "asking" | "ready" | "connecting" | "live" | "error";

/**
 * Diffusion depuis le navigateur du téléphone — le niveau « téléphone » : on
 * pose l'appareil sur un trépied, on appuie, c'est en ligne. Aucun logiciel à
 * installer.
 *
 * Le transport est WHIP (WebRTC-HTTP Ingestion Protocol), que MediaMTX accepte
 * nativement : une offre SDP en POST, une réponse SDP, et le flux part. La clé
 * de diffusion voyage en jeton porteur, jamais dans l'URL.
 */
/**
 * Écarter VP8 de la tête de liste.
 *
 * Chrome propose VP8 en premier et MediaMTX l'accepte : le direct arrive donc
 * bien au serveur. Mais son muxeur HLS ne sait pas porter VP8 — il gère H264,
 * H265, VP9 et AV1, pas celui-là. La playlist était servie sans piste vidéo,
 * et les spectateurs restaient devant une vignette immobile pendant que le
 * gérant croyait diffuser.
 *
 * On classe donc les codecs que le HLS sait porter devant, H264 en tête parce
 * qu'il est le plus largement décodé, et VP8 en dernier plutôt qu'exclu : un
 * navigateur qui n'aurait que lui doit pouvoir diffuser quand même, quitte à
 * n'être regardable qu'en WebRTC.
 */
const RANG_HLS = [/h264/i, /h265|hevc/i, /vp9/i, /av1/i];

function prefererCodecHls(pc: RTCPeerConnection) {
  try {
    const dispo = RTCRtpSender.getCapabilities("video")?.codecs ?? [];
    if (dispo.length === 0) return;

    const rang = (mime: string) => {
      const i = RANG_HLS.findIndex((r) => r.test(mime));
      if (i >= 0) return i;
      return /vp8/i.test(mime) ? RANG_HLS.length + 1 : RANG_HLS.length;
    };
    const classe = [...dispo].sort((a, b) => rang(a.mimeType) - rang(b.mimeType));

    for (const t of pc.getTransceivers()) {
      if (t.sender.track?.kind === "video") t.setCodecPreferences(classe);
    }
  } catch {
    /* navigateur qui ne sait pas réordonner : on diffuse avec ce qu'il propose */
  }
}

export function GoLive({ whip, streamKey, title }: { whip: string; streamKey: string; title: string }) {
  const { notify } = useSnackbar();
  const preview = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const resource = useRef<string | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string>();
  const [facing, setFacing] = useState<"environment" | "user">("environment");

  const stop = useCallback(() => {
    peer.current?.close();
    peer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (preview.current) preview.current.srcObject = null;
    // WHIP : un DELETE sur la ressource ferme proprement côté serveur.
    if (resource.current) {
      void fetch(resource.current, { method: "DELETE" }).catch(() => {});
      resource.current = null;
    }
    setPhase("idle");
  }, []);

  useEffect(() => stop, [stop]);

  async function openCamera(mode: "environment" | "user" = facing) {
    setPhase("asking");
    setError(undefined);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = media;
      if (preview.current) preview.current.srcObject = media;
      setFacing(mode);
      setPhase("ready");
    } catch {
      setPhase("error");
      setError("Caméra refusée. Autorise l'accès dans les réglages du navigateur.");
    }
  }

  async function publish() {
    if (!stream.current) return;
    setPhase("connecting");
    setError(undefined);

    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      peer.current = pc;
      stream.current.getTracks().forEach((track) => pc.addTrack(track, stream.current!));
      prefererCodecHls(pc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // On attend la collecte ICE : MediaMTX veut une offre complète.
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") return resolve();
        const check = () => {
          if (pc.iceGatheringState === "complete") {
            pc.removeEventListener("icegatheringstatechange", check);
            resolve();
          }
        };
        pc.addEventListener("icegatheringstatechange", check);
        window.setTimeout(resolve, 2500);
      });

      const response = await fetch(whip, {
        method: "POST",
        headers: { "content-type": "application/sdp", authorization: `Bearer ${streamKey}` },
        body: pc.localDescription?.sdp ?? "",
      });

      if (!response.ok) {
        stop();
        setPhase("error");
        setError(
          response.status === 401
            ? "Clé de diffusion refusée par le serveur."
            : `Le serveur média a répondu ${response.status}.`,
        );
        return;
      }

      resource.current = response.headers.get("location");
      await pc.setRemoteDescription({ type: "answer", sdp: await response.text() });

      // Une réponse du serveur ne prouve pas que la vidéo passe : il faut que
      // la liaison WebRTC s'établisse vraiment. Avant, on affichait « EN DIRECT »
      // dès la réponse — le téléphone montrait son aperçu local pendant que
      // personne ne recevait rien (port UDP fermé, réseau qui bloque).
      const relie = await new Promise<boolean>((resolve) => {
        if (pc.connectionState === "connected") return resolve(true);
        const fini = window.setTimeout(() => resolve(false), 15000);
        pc.addEventListener("connectionstatechange", function suivre() {
          if (pc.connectionState === "connected") {
            window.clearTimeout(fini);
            pc.removeEventListener("connectionstatechange", suivre);
            resolve(true);
          } else if (pc.connectionState === "failed") {
            window.clearTimeout(fini);
            pc.removeEventListener("connectionstatechange", suivre);
            resolve(false);
          }
        });
      });
      if (!relie) {
        stop();
        setPhase("error");
        setError(
          "La vidéo n'arrive pas jusqu'au serveur : le réseau bloque la liaison. Essaie en wifi, ou préviens l'équipe Master Break (port 8189 du serveur vidéo).",
        );
        return;
      }

      pc.addEventListener("connectionstatechange", () => {
        if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
          setPhase("error");
          setError("Connexion perdue. Relance la diffusion.");
        }
      });

      setPhase("live");
      notify("Tu es en direct", { detail: title, tone: "jade" });
    } catch (e) {
      stop();
      setPhase("error");
      setError(`Diffusion impossible : ${(e as Error).message}`);
    }
  }

  return (
    <Card shape="panel" className="flex flex-col gap-4 p-4">
      <div className="relative aspect-video overflow-hidden rounded-card bg-black">
        <video ref={preview} autoPlay muted playsInline className="h-full w-full object-cover" />

        {phase === "idle" || phase === "asking" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg/80 px-6 text-center">
            {phase === "asking" ? <Spinner size={22} className="text-gold-text" /> : <CameraIcon />}
            <p className="text-[13px] text-dim">
              {phase === "asking" ? "Autorise la caméra…" : "Pose le téléphone face à la table."}
            </p>
          </div>
        ) : null}

        {phase === "live" ? <LiveDot className="absolute top-3 left-3 bg-black/65 backdrop-blur-md" /> : null}
      </div>

      {error ? (
        <p role="alert" className="shake rounded-none border border-warn/45 bg-warn/10 px-3.5 py-2.5 text-[12.5px] text-warn">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2.5">
        {phase === "idle" || phase === "error" ? (
          <button
            onClick={() => openCamera()}
            className="press go flex h-13 grow items-center justify-center gap-2 rounded-full bg-gold text-[14px] font-semibold text-gold-ink"
          >
            <CameraIcon /> Ouvrir la caméra
          </button>
        ) : null}

        {phase === "ready" ? (
          <>
            <button
              onClick={publish}
              className="press go flex h-13 grow items-center justify-center gap-2 rounded-full bg-gold text-[14px] font-semibold text-gold-ink"
            >
              Passer en direct
            </button>
            <button
              onClick={() => openCamera(facing === "environment" ? "user" : "environment")}
              className="press h-13 rounded-full border border-line px-4 text-[13px] text-dim hover:text-ink"
            >
              Retourner
            </button>
          </>
        ) : null}

        {phase === "connecting" ? (
          <span className="flex h-13 grow items-center justify-center gap-2 rounded-full border border-line text-[13px] text-dim">
            <Spinner size={16} /> Connexion au serveur…
          </span>
        ) : null}

        {phase === "live" ? (
          <button
            onClick={() => {
              stop();
              notify("Diffusion arrêtée", { tone: "warn" });
            }}
            className={cn(
              "press flex h-13 grow items-center justify-center gap-2 rounded-full",
              "border border-warn/50 bg-warn/12 text-[14px] font-semibold text-warn",
            )}
          >
            Arrêter la diffusion
          </button>
        ) : null}
      </div>

      <p className="text-[11.5px] leading-5 text-muted">
        Reste sur cette page pendant la diffusion : le flux s&apos;arrête si tu la fermes. Branche le téléphone,
        l&apos;encodage vide une batterie en une heure.
      </p>
    </Card>
  );
}

const CameraIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.7l1-2h7.6l1 2h1.7A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-9z" />
    <circle cx="12" cy="13" r="3.4" />
  </svg>
);
