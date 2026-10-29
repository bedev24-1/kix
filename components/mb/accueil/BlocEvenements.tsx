"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Photo } from "@/components/ui/Photo";
import { ChevronRightIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

export type Affiche = {
  href: string;
  titre: string;
  sousTitre: string;
  image: string;
  genre: string;
  quand: string;
  inscrits: number;
  prix: string;
  /** Le début, en millisecondes, pour le compte à rebours. */
  debut: number | null;
  /** Déjà terminé : plus de minuteur. */
  fini: boolean;
};

export type Vignette = {
  href: string;
  titre: string;
  quand: string;
  detail: string;
  image: string;
  /** Un direct : l'étiquette passe au rouge, avec son point qui bat. */
  direct?: boolean;
  /** Le score d'un match filmé, calé à droite. */
  score?: [number, number] | null;
};

/**
 * Les événements de l'accueil, en un seul bloc.
 *
 * La grande affiche prend l'essentiel de la hauteur ; dessous, séparée d'un
 * simple filet, une bande fait défiler les autres événements toute seule,
 * sans jamais sortir du bloc. Un compte à rebours occupe le coin haut droit.
 */
export function BlocEvenements({ une, autres }: { une: Affiche; autres: Vignette[] }) {
  return (
    <section className="flex h-[286px] flex-col overflow-hidden rounded-[24px] border border-line bg-bg lg:h-[440px]">
      <Link href={une.href} className="relative block min-h-0 flex-1">
        <Photo src={une.image} alt={une.titre} fill priority sizes="(max-width: 1024px) 430px, 1200px" className="object-cover object-[center_30%]" />
        <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,14,10,.35)_0%,rgba(4,14,10,0)_28%,rgba(4,14,10,0)_45%,rgba(4,14,10,.88))]" />
        <span className="absolute inset-x-3.5 top-3 flex items-start justify-between text-white">
          <span className="rounded-full border border-gold/60 bg-[#071a13]/50 px-2.5 py-[5px] text-[9.5px] font-bold tracking-[0.12em] text-gold uppercase">
            {une.genre}
          </span>
          {!une.fini && une.debut ? <Minuteur debut={une.debut} /> : null}
        </span>
        <span className="absolute inset-x-4 bottom-3.5 flex flex-col text-white lg:inset-x-8 lg:bottom-7">
          <span className="text-[23px] leading-[1.04] font-extrabold tracking-[-0.025em] text-balance lg:text-[40px]">
            {une.titre}
            {une.sousTitre ? (
              <>
                <br />
                {une.sousTitre}
              </>
            ) : null}
          </span>
          <span className="mt-2 flex items-center justify-between text-[11.5px] text-white/78 lg:text-sm">
            <span>
              {une.quand}
              {une.inscrits > 0 ? ` · ${une.inscrits} inscrits` : ""}
            </span>
            <span className="rounded-full bg-[#f3eee2]/92 px-3 py-[7px] text-[11.5px] font-extrabold text-[#0b1a12]">{une.prix}</span>
          </span>
        </span>
      </Link>
      {autres.length ? (
        <>
          <span className="h-px shrink-0 bg-white/18" />
          <Bande autres={autres} />
        </>
      ) : null}
    </section>
  );
}

const PAUSE = 4000;

/**
 * La bande du bas : un événement reste 4 s, puis la bande glisse vers le
 * suivant en 0,7 s. Le trait du point actif se remplit pendant l'attente.
 * Un doigt posé l'arrête ; elle reprend quand on le lève.
 */
export function Bande({
  autres,
  lecture = false,
  compacte = false,
}: {
  autres: Vignette[];
  /** Un bouton lecture devant le texte : des rediffusions. */
  lecture?: boolean;
  /** 56 px au lieu de 64 : sous les directs. */
  compacte?: boolean;
}) {
  const n = autres.length;
  const [i, setI] = useState(0);
  const [anime, setAnime] = useState(true);
  const [tenu, setTenu] = useState(false);
  const [tour, setTour] = useState(0);
  const depart = useRef<number | null>(null);
  // Un glissé n'est pas un toucher : il ne doit pas ouvrir l'événement.
  const glisse = useRef(false);

  useEffect(() => {
    if (n < 2 || tenu || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => {
      setAnime(true);
      setI((k) => k + 1);
    }, PAUSE);
    return () => window.clearTimeout(t);
  }, [n, tenu, tour, i]);

  const aller = (sens: 1 | -1) => {
    setAnime(true);
    setI((k) => (sens < 0 && k === 0 ? n - 1 : k + sens));
    setTour((t) => t + 1);
  };

  // Une copie du premier ferme la boucle : on y glisse, puis on revient au vrai sans transition.
  const liste = n > 1 ? [...autres, autres[0]] : autres;
  const actif = i % n;

  return (
    <div
      className={cn("relative shrink-0 touch-pan-y overflow-hidden lg:h-24", compacte ? "h-14" : "h-16")}
      onPointerDown={(e) => {
        depart.current = e.clientX;
        setTenu(true);
      }}
      onPointerUp={(e) => {
        const d = depart.current;
        depart.current = null;
        setTenu(false);
        setTour((t) => t + 1);
        glisse.current = d !== null && Math.abs(e.clientX - d) > 40;
        if (glisse.current && n > 1) aller(e.clientX < (d ?? 0) ? 1 : -1);
      }}
      onClickCapture={(e) => {
        if (glisse.current) e.preventDefault();
        glisse.current = false;
      }}
      onPointerCancel={() => {
        depart.current = null;
        setTenu(false);
      }}
    >
      <div
        className="flex h-full"
        style={{
          transform: `translateX(${-i * 100}%)`,
          transition: anime ? "transform 700ms cubic-bezier(.2,.7,.2,1)" : "none",
        }}
        onTransitionEnd={() => {
          if (i >= n) {
            setAnime(false);
            setI(0);
          }
        }}
      >
        {liste.map((v, k) => (
          <Link
            key={k}
            href={v.href}
            draggable={false}
            tabIndex={k === i ? 0 : -1}
            className="relative block h-full w-full shrink-0"
          >
            <Photo src={v.image} alt="" fill sizes="(max-width: 1024px) 430px, 1200px" className="pointer-events-none object-cover" />
            <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,12,9,.85)_0%,rgba(4,12,9,.5)_55%,rgba(4,12,9,.1))]" />
            <span className="absolute inset-y-0 right-10 left-4 flex items-center gap-[11px] text-white">
              {lecture ? (
                <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full border-[1.5px] border-white/70">
                  <PlayIcon />
                </span>
              ) : null}
              <span className="flex min-w-0 flex-col">
                <span
                  className={cn(
                    "flex items-center gap-1.5 text-[8.5px] font-bold tracking-[0.14em] uppercase",
                    v.direct ? "text-[#ff7b72]" : "text-gold",
                  )}
                >
                  {v.direct ? <span className="h-[5px] w-[5px] rounded-full bg-[#ff5a50] [animation:mb-pouls_1.2s_infinite]" /> : null}
                  {v.quand}
                </span>
                <span className="mt-0.5 truncate text-[13.5px] font-extrabold">{v.titre}</span>
                <span className="mt-0.5 truncate text-[10px] text-white/75">{v.detail}</span>
              </span>
              {v.score ? (
                <span className="ml-auto flex shrink-0 gap-[3px]">
                  {v.score.map((n, j) => (
                    <span
                      key={j}
                      className="grid h-[22px] min-w-5 place-items-center rounded-md border border-white/20 bg-[#05100b]/60 text-[11.5px] font-extrabold tabular-nums"
                    >
                      {n}
                    </span>
                  ))}
                </span>
              ) : null}
            </span>
          </Link>
        ))}
      </div>

      {n > 1 ? (
        <span className="pointer-events-none absolute top-[9px] right-10 flex gap-1">
          {autres.map((_, k) => (
            <span key={k} className={cn("relative h-[5px] overflow-hidden rounded-full bg-white/40", k === actif ? "w-3.5" : "w-[5px]")}>
              {k === actif ? (
                <span
                  key={`${actif}-${tour}`}
                  className="absolute inset-0 origin-left rounded-full bg-[#f3eee2]"
                  style={{
                    animation: `mb-remplit ${PAUSE}ms linear both`,
                    animationPlayState: tenu ? "paused" : "running",
                  }}
                />
              ) : null}
            </span>
          ))}
        </span>
      ) : null}

      <Link
        href={autres[actif].href}
        aria-label={`Voir ${autres[actif].titre}`}
        className="absolute inset-y-0 right-0 grid w-[30px] place-items-center border-l border-white/35 bg-white/30 text-white backdrop-blur-md"
      >
        <ChevronRightIcon size={15} strokeWidth={2.4} />
      </Link>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden className="ml-0.5 fill-white">
      <path d="M7 4.5v15l12-7.5z" />
    </svg>
  );
}

/* ------------------------------------------------------------- minuteur */

const abonnes = new Set<() => void>();
let horloge: number | undefined;
function abonner(fn: () => void) {
  abonnes.add(fn);
  horloge ??= window.setInterval(() => abonnes.forEach((f) => f()), 1000);
  return () => {
    abonnes.delete(fn);
    if (!abonnes.size) {
      window.clearInterval(horloge);
      horloge = undefined;
    }
  };
}
const seconde = () => Math.floor(Date.now() / 1000);

/**
 * Le compte à rebours : jours, heures, minutes, secondes en petites cases de
 * verre fumé ; seule la case des secondes est dorée et son chiffre monte à
 * chaque seconde. Le jour venu, il devient « En direct » pendant 12 h, puis
 * s'efface. Côté serveur, rien : l'heure n'y est pas celle du téléphone.
 */
function Minuteur({ debut }: { debut: number }) {
  const maintenant = useSyncExternalStore(abonner, seconde, () => null);
  if (maintenant === null) return null;
  const reste = Math.floor(debut / 1000) - maintenant;

  if (reste <= 0) {
    if (reste < -12 * 3600) return null;
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-[#071a13]/55 px-2.5 py-[5px] text-[9.5px] font-bold tracking-[0.14em] text-white backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-live [animation:mb-pouls_1s_infinite]" />
        EN DIRECT
      </span>
    );
  }

  const j = Math.floor(reste / 86400);
  const h = Math.floor((reste % 86400) / 3600);
  const m = Math.floor((reste % 3600) / 60);
  const s = reste % 60;
  const cases: [number, string][] = [
    [h, "h"],
    [m, "m"],
    [s, "s"],
  ];
  if (j > 0) cases.unshift([j, "j"]);

  return (
    <span className="flex flex-col items-end gap-1" aria-label={`Début dans ${j ? `${j} j ` : ""}${h} h ${m} min`}>
      <span className="flex items-center gap-[5px] text-[8.5px] font-bold tracking-[0.16em] text-white/75">
        <span className="h-[5px] w-[5px] rounded-full bg-gold [animation:mb-pouls_1s_infinite]" />
        DÉBUT DANS
      </span>
      <span className="flex items-center gap-[3px]" aria-hidden>
        {cases.map(([v, u], k) => {
          const dernier = k === cases.length - 1;
          return (
            <span key={u} className="flex items-center gap-[3px]">
              {k > 0 ? <span className="text-[12px] font-extrabold text-white/50">:</span> : null}
              <span
                className={cn(
                  "h-[27px] min-w-[27px] overflow-hidden rounded-[8px] border bg-[#05100b]/55 px-[5px] backdrop-blur-md",
                  dernier ? "border-gold/60 text-gold" : "border-white/18",
                )}
              >
                <span
                  key={dernier ? v : undefined}
                  className={cn(
                    "block text-center text-[13px] leading-[27px] font-extrabold tabular-nums",
                    dernier && "[animation:mb-chiffre_.35s_cubic-bezier(.2,.7,.3,1)]",
                  )}
                >
                  {String(v).padStart(2, "0")}
                  <span className="ml-px text-[8px] font-semibold opacity-70">{u}</span>
                </span>
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
