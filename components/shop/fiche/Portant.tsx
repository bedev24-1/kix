"use client";

import { useEffect, useRef, useState } from "react";
import { Photo } from "@/components/ui/Photo";
import { ChevronLeftIcon, ChevronRightIcon, ExpandIcon, HeartIcon, XIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

/**
 * Les photos d'un article, « sur le portant ».
 *
 * Une tringle dorée est fixée dans le bas de la grande photo ; chaque photo
 * secondaire y pend comme un vêtement en boutique, par-dessus le bord, et celle
 * qu'on regarde descend sur son fil. La grande photo est le dessus d'une pile :
 * on la jette sur le côté du doigt, la suivante sort de dessous, et le
 * crochet glisse le long du rail. Un toucher l'ouvre en grand.
 */
export function Portant({
  photos,
  index,
  onIndex,
  nom,
  badge,
  favori,
  onFavori,
}: {
  photos: string[];
  index: number;
  onIndex: (i: number) => void;
  nom: string;
  badge?: { label: string; tone: string | null } | null;
  favori: boolean;
  onFavori: () => void;
}) {
  const n = photos.length;
  const [dx, setDx] = useState(0);
  const [envol, setEnvol] = useState<0 | 1 | -1>(0);
  const [zoom, setZoom] = useState(false);
  const [glisse, setGlisse] = useState(false);
  const depart = useRef<{ x: number; y: number; t: number } | null>(null);

  const aller = (sens: 1 | -1) => {
    if (n < 2) return;
    setEnvol(sens);
    // L'envol dure le temps de la transition, puis la pile se reforme.
    window.setTimeout(() => {
      onIndex((index + sens + n) % n);
      setEnvol(0);
      setDx(0);
    }, 260);
  };

  const fin = () => {
    const d = depart.current;
    depart.current = null;
    setGlisse(false);
    if (!d) return;
    if (Math.abs(dx) > 70) aller(dx < 0 ? 1 : -1);
    else {
      if (Math.abs(dx) < 6 && Date.now() - d.t < 300) setZoom(true);
      setDx(0);
    }
  };

  const suivantes = n > 1 ? [1, 2].filter((k) => k < n).map((k) => photos[(index + k) % n]) : [];

  return (
    <div className="flex flex-col">
      <div className={cn("relative -mx-3 mt-1 aspect-[4/5.3] select-none md:mx-0 lg:aspect-[4/4.4]", n > 1 && "mb-7")}>
        {suivantes
          .slice()
          .reverse()
          .map((url, k) => {
            const rang = suivantes.length - k; // 2 puis 1
            return (
              <div
                key={url + rang}
                className="absolute inset-0 overflow-hidden rounded-[26px] shadow-[0_16px_30px_rgba(0,0,0,.14)] transition-transform duration-300"
                style={{
                  transform: `translate(${rang * 7}px, ${rang * 5}px) rotate(${rang * 2}deg) scale(${1 - rang * 0.02})`,
                  opacity: rang === 1 ? 0.85 : 0.55,
                }}
              >
                <Photo src={url} alt="" fill sizes="(min-width: 1024px) 560px, 430px" className="object-cover" />
              </div>
            );
          })}

        <div
          role="button"
          tabIndex={0}
          aria-label="Voir la photo en grand"
          onKeyDown={(e) => {
            if (e.key === "Enter") setZoom(true);
            if (e.key === "ArrowRight") aller(1);
            if (e.key === "ArrowLeft") aller(-1);
          }}
          onPointerDown={(e) => {
            depart.current = { x: e.clientX, y: e.clientY, t: Date.now() };
            setGlisse(true);
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = depart.current;
            if (d) setDx(e.clientX - d.x);
          }}
          onPointerUp={fin}
          onPointerCancel={fin}
          className="absolute inset-0 cursor-grab touch-pan-y overflow-hidden rounded-[26px] bg-white shadow-[0_16px_30px_rgba(0,0,0,.15)] active:cursor-grabbing"
          style={{
            transform: envol
              ? `translateX(${envol * -125}%) rotate(${envol * -14}deg)`
              : `translateX(${dx}px) rotate(${dx / 25}deg)`,
            transition: glisse ? "none" : "transform 260ms cubic-bezier(.2,.7,.3,1), opacity 260ms",
            opacity: envol ? 0 : 1,
          }}
        >
          <Photo key={photos[index]} src={photos[index]} alt={nom} fill priority sizes="(min-width: 1024px) 560px, 430px" className="pointer-events-none object-cover" />
        </div>

        <button
          type="button"
          onClick={onFavori}
          aria-label={favori ? "Retirer des favoris" : "Ajouter aux favoris"}
          aria-pressed={favori}
          className={cn("press absolute top-3.5 left-3.5 grid h-9 w-9 place-items-center rounded-full bg-white shadow", favori ? "text-[#c9463d]" : "text-[#0e1512]")}
        >
          <HeartIcon size={17} plein={favori} />
        </button>
        {badge ? (
          <span className="pointer-events-none absolute top-3.5 right-3.5 rounded-full bg-[#0e1512] px-2.5 py-1.5 text-[11px] font-bold text-[#e0b43a]">
            {badge.label}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setZoom(true)}
          className={cn("press absolute left-3.5 flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 text-[11px] font-bold shadow", n > 1 ? "bottom-12" : "bottom-3.5")}
        >
          <ExpandIcon size={13} /> Zoom
        </button>
        {n > 1 ? (
          <span className="pointer-events-none absolute right-3.5 bottom-12 rounded-full bg-[#0e1512]/75 px-2.5 py-1 text-[11px] font-bold text-[#f4efe2]">
            {index + 1} / {n}
          </span>
        ) : null}

        {/* La tringle, fixée dans le bas de la photo : les photos secondaires
            y pendent et passent par-dessus le bord, comme sur un portant. */}
        {n > 1 ? (
          <div className="absolute inset-x-4 -bottom-[26px] z-10 h-[62px]">
            <span className="absolute -left-1 top-[3px] h-[11px] w-[6px] rounded-[2px] bg-gradient-to-b from-[#f3dc93] to-[#8a6a12] shadow" />
            <span className="absolute -right-1 top-[3px] h-[11px] w-[6px] rounded-[2px] bg-gradient-to-b from-[#f3dc93] to-[#8a6a12] shadow" />
            <span className="absolute inset-x-0 top-[6px] h-[5px] rounded-full bg-gradient-to-b from-[#f6e4a6] via-[#c99a3e] to-[#7a5c10] shadow-[0_2px_6px_rgba(0,0,0,.45)]" />
            <div className="relative h-full overflow-x-auto overflow-y-hidden px-1 [scrollbar-width:none]">
              <div className="relative h-full" style={{ width: n * 42 }}>
                {photos.map((url, i) => {
                  const on = i === index;
                  return (
                    <button
                      key={url + i}
                      type="button"
                      aria-label={`Photo ${i + 1} sur ${n}`}
                      aria-pressed={on}
                      onClick={() => onIndex(i)}
                      className="absolute top-[2px] flex flex-col items-center"
                      style={{ left: i * 42 }}
                    >
                      <span className={cn("h-[10px] w-3 rounded-t-full border-2 border-b-0", on ? "border-[#f3dc93]" : "border-[#e9e2d0]")} />
                      <span className={cn("w-0.5 transition-all duration-300", on ? "h-3 bg-[#f3dc93]" : "h-1.5 bg-[#e9e2d0]")} />
                      <span
                        className={cn(
                          "relative overflow-hidden rounded-[9px] border-2 shadow-[0_4px_10px_rgba(0,0,0,.35)] transition-all duration-300",
                          on ? "h-9 w-9 border-[#e0b43a]" : "h-7 w-7 border-white",
                        )}
                      >
                        <Photo src={url} alt="" fill sizes="36px" className="object-cover" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {zoom ? <Zoom photos={photos} index={index} onIndex={onIndex} nom={nom} onClose={() => setZoom(false)} /> : null}
    </div>
  );
}

function Zoom({
  photos,
  index,
  onIndex,
  nom,
  onClose,
}: {
  photos: string[];
  index: number;
  onIndex: (i: number) => void;
  nom: string;
  onClose: () => void;
}) {
  const n = photos.length;
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex((index + 1) % n);
      if (e.key === "ArrowLeft") onIndex((index - 1 + n) % n);
    };
    window.addEventListener("keydown", touche);
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", touche);
      document.body.style.overflow = avant;
    };
  }, [index, n, onClose, onIndex]);

  return (
    <div role="dialog" aria-modal="true" aria-label={nom} className="fixed inset-0 z-[80] flex flex-col bg-black/95">
      <div className="flex items-center justify-between p-4 text-white">
        <span className="text-[13px] text-white/70">
          {index + 1} / {n}
        </span>
        <button type="button" onClick={onClose} aria-label="Fermer" className="press grid h-10 w-10 place-items-center rounded-full bg-white/10">
          <XIcon size={18} />
        </button>
      </div>
      <div className="relative grow">
        <Photo src={photos[index]} alt={nom} fill sizes="100vw" className="object-contain" />
      </div>
      {n > 1 ? (
        <div className="flex items-center justify-center gap-6 p-5 text-white">
          <button type="button" aria-label="Photo précédente" onClick={() => onIndex((index - 1 + n) % n)} className="press grid h-11 w-11 place-items-center rounded-full bg-white/10">
            <ChevronLeftIcon size={18} />
          </button>
          <button type="button" aria-label="Photo suivante" onClick={() => onIndex((index + 1) % n)} className="press grid h-11 w-11 place-items-center rounded-full bg-white/10">
            <ChevronRightIcon size={18} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
