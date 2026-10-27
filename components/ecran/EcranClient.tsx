"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BarreEcran } from "@/components/ecran/BarreEcran";

type Etat =
  | { statut: "demarrage" }
  | { statut: "inconnu" }
  | { statut: "attente"; code: string; lien: string; qr: { path: string; total: number } }
  | { statut: "veille"; nom: string }
  | { statut: "diffuse"; nom: string; titre: string; direct: boolean; whep: string; hls: string; matchId: string | null };

const CLE = "mb.ecran.jeton";

/**
 * L'écran de salle.
 *
 * Trois vies successives : il s'annonce, il attend d'être adopté, il diffuse.
 * Le jeton vit dans le stockage local — un téléviseur rallumé le lendemain
 * reprend sa place sans qu'on y retouche.
 */
export function EcranClient() {
  const [etat, setEtat] = useState<Etat>({ statut: "demarrage" });
  const video = useRef<HTMLVideoElement>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const flux = useRef<string>("");

  /* ---------------------------------------------------------- identité */

  const jeton = useCallback(async (): Promise<string> => {
    let garde = "";
    try {
      garde = localStorage.getItem(CLE) ?? "";
    } catch {
      /* navigateur de téléviseur en navigation privée : on repart à neuf */
    }
    if (garde) return garde;

    const reponse = await fetch("/api/ecran/hello", { method: "POST" });
    const { token } = (await reponse.json()) as { token: string };
    try {
      localStorage.setItem(CLE, token);
    } catch {
      /* sans stockage, l'écran redemandera un code au prochain allumage */
    }
    return token;
  }, []);

  /* ------------------------------------------------------- ordres reçus */

  useEffect(() => {
    let source: EventSource | undefined;
    let vivant = true;

    (async () => {
      const token = await jeton();
      if (!vivant) return;

      source = new EventSource(`/api/ecran/flux?t=${encodeURIComponent(token)}`);
      source.addEventListener("state", (e) => {
        const lu = JSON.parse((e as MessageEvent).data) as Etat;
        setEtat(lu);

        // Un jeton devenu inconnu — écran retiré par le gérant — doit repartir
        // sur un code neuf, sans quoi le téléviseur reste muet pour toujours.
        if (lu.statut === "inconnu") {
          try {
            localStorage.removeItem(CLE);
          } catch {
            /* rien à nettoyer */
          }
          window.setTimeout(() => window.location.reload(), 3000);
        }
      });
    })();

    return () => {
      vivant = false;
      source?.close();
    };
  }, [jeton]);

  /* --------------------------------------------------------- la vidéo */

  useEffect(() => {
    if (etat.statut !== "diffuse" || !etat.direct) {
      peer.current?.close();
      peer.current = null;
      flux.current = "";
      return;
    }
    // Ne pas relancer la négociation quand seul le billet a été resigné.
    if (flux.current === etat.whep) return;
    flux.current = etat.whep;

    let vivant = true;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    peer.current?.close();
    peer.current = pc;

    pc.addTransceiver("video", { direction: "recvonly" });
    pc.addTransceiver("audio", { direction: "recvonly" });
    pc.ontrack = (e) => {
      const node = video.current;
      if (node && node.srcObject !== e.streams[0]) node.srcObject = e.streams[0];
    };

    (async () => {
      try {
        const offre = await pc.createOffer();
        await pc.setLocalDescription(offre);
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

        const reponse = await fetch(etat.whep, {
          method: "POST",
          headers: { "content-type": "application/sdp" },
          body: pc.localDescription?.sdp ?? "",
        });
        if (!reponse.ok || !vivant) return;
        await pc.setRemoteDescription({ type: "answer", sdp: await reponse.text() });
      } catch {
        // Le flux n'est pas encore là, ou le réseau a hoqueté : la prochaine
        // poussée SSE relancera la négociation.
        flux.current = "";
      }
    })();

    return () => {
      vivant = false;
      pc.close();
    };
  }, [etat]);

  /* ------------------------------------------------------------ affichage */

  return (
    <div className="grid h-dvh w-dvw place-items-center overflow-hidden bg-black">
      {etat.statut === "diffuse" && etat.direct ? (
        <>
          <video ref={video} autoPlay playsInline muted={false} className="h-full w-full object-contain" />
          {etat.matchId ? (
            // Un match est suivi : la Barre Master Break porte déjà le direct, le titre et le score.
            <BarreEcran key={etat.matchId} matchId={etat.matchId} />
          ) : (
            <>
              <span className="pointer-events-none absolute top-6 right-8 flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-[15px] font-semibold text-white backdrop-blur">
                <i className="h-2 w-2 rounded-full bg-[#3ddc84]" />
                EN DIRECT
              </span>
              <span className="pointer-events-none absolute bottom-7 left-8 rounded-full bg-black/60 px-5 py-2.5 text-[17px] text-white backdrop-blur">
                {etat.titre}
              </span>
            </>
          )}
        </>
      ) : null}

      {etat.statut === "attente" ? <Appairage etat={etat} /> : null}

      {etat.statut === "veille" || (etat.statut === "diffuse" && !etat.direct) ? (
        <Repos
          nom={etat.statut === "veille" ? etat.nom : etat.nom}
          detail={etat.statut === "diffuse" ? `${etat.titre} — la caméra n'a pas encore démarré.` : "Aucun direct choisi."}
        />
      ) : null}

      {etat.statut === "demarrage" || etat.statut === "inconnu" ? (
        <Repos
          nom="Master Break"
          detail={etat.statut === "inconnu" ? "Écran retiré. Nouveau code dans un instant…" : "Connexion…"}
        />
      ) : null}
    </div>
  );
}

function Repos({ nom, detail }: { nom: string; detail: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="text-[13px] tracking-[0.3em] text-[#d9b450] uppercase">{nom}</span>
      <span className="text-[22px] text-white/55">{detail}</span>
    </div>
  );
}

/**
 * L'écran demande son adoption.
 *
 * Le QR porte l'URL du dashboard avec le code : scanné par l'appareil photo du
 * téléphone, il ouvre directement la page d'adoption. Le code reste écrit en
 * dessous, en grand — un téléviseur est parfois trop haut pour être photographié.
 */
function Appairage({ etat }: { etat: Extract<Etat, { statut: "attente" }> }) {
  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <span className="text-[14px] tracking-[0.3em] text-[#d9b450] uppercase">Master Break</span>

      <div className="rounded-3xl bg-white p-6">
        <svg
          viewBox={`0 0 ${etat.qr.total} ${etat.qr.total}`}
          className="h-64 w-64"
          shapeRendering="crispEdges"
          aria-label="Code d'appairage"
        >
          <path d={etat.qr.path} fill="#000" />
        </svg>
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="text-[20px] text-white/70">Scanne ce code depuis ton tableau de bord</span>
        <span className="font-mono text-[56px] leading-none font-bold tracking-[0.18em] text-white">
          {etat.code}
        </span>
        <span className="text-[15px] text-white/40">ou saisis ce code à la main</span>
      </div>
    </div>
  );
}
