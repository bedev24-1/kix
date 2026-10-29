"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Photo } from "@/components/ui/Photo";
import { Bande, type Vignette } from "@/components/mb/accueil/BlocEvenements";
import { group } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Encours } from "@/lib/stream";

type Direct = Encours["directs"][number];

/** Combien de directs passent en grand, à la verticale ; les suivants vont dans la bande. */
const EN_TETE = 3;
const PAUSE_VERTICALE = 7500;
const HAUTEUR = 118;

/**
 * Les directs de l'accueil, quand au moins une caméra tourne.
 *
 * En haut, les plus regardés en grand — joueurs, score, la salle qui signe
 * en petit dans la pastille des spectateurs — glissent tout seuls à la
 * verticale ; de petits traits sur le bord droit disent lequel on regarde.
 * En bas, les autres tables défilent à l'horizontale, à leur propre rythme.
 */
export function DirectsEnCours({ directs }: { directs: Direct[] }) {
  const haut = directs.slice(0, EN_TETE);
  const bas: Vignette[] = directs.slice(EN_TETE).map((d) => ({
    href: `/direct/${d.id}`,
    titre: d.titre,
    quand: `En direct · ${group(d.spectateurs)}`,
    detail: [d.salle, d.match ? `${d.match.a.nom} vs ${d.match.b.nom}` : d.rubrique].join(" · "),
    image: d.image,
    direct: true,
    score: d.match ? [d.match.a.score, d.match.b.score] : null,
  }));

  return (
    <section
      aria-label="Les directs"
      className="-mx-[9px] overflow-hidden rounded-[22px] border border-line bg-[#0b241a] text-white md:mx-0"
    >
      <Pile directs={haut} />
      {bas.length ? (
        <>
          <span className="block h-px bg-white/16" />
          <Bande autres={bas} compacte />
        </>
      ) : null}
    </section>
  );
}

/** Les directs phares, l'un au-dessus de l'autre ; on glisse de bas en haut. */
function Pile({ directs }: { directs: Direct[] }) {
  const n = directs.length;
  const [i, setI] = useState(0);
  const [anime, setAnime] = useState(true);
  const [tour, setTour] = useState(0);
  const depart = useRef<number | null>(null);
  const glisse = useRef(false);

  useEffect(() => {
    if (n < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => {
      setAnime(true);
      setI((k) => k + 1);
    }, PAUSE_VERTICALE);
    return () => window.clearTimeout(t);
  }, [n, i, tour]);

  // La liste peut rétrécir quand une caméra s'éteint : on ne pointe jamais dans le vide.
  const actif = n ? i % n : 0;
  const liste = n > 1 ? [...directs, directs[0]] : directs;

  return (
    <div
      className="relative touch-pan-x overflow-hidden"
      style={{ height: HAUTEUR }}
      onPointerDown={(e) => {
        depart.current = e.clientY;
      }}
      onPointerUp={(e) => {
        const d = depart.current;
        depart.current = null;
        glisse.current = d !== null && Math.abs(e.clientY - d) > 30;
        if (glisse.current && n > 1) {
          setAnime(true);
          setI((k) => (e.clientY < (d ?? 0) ? k + 1 : k === 0 ? n - 1 : k - 1));
          setTour((t) => t + 1);
        }
      }}
      onClickCapture={(e) => {
        if (glisse.current) e.preventDefault();
        glisse.current = false;
      }}
    >
      <div
        style={{
          transform: `translateY(${-Math.min(i, n) * HAUTEUR}px)`,
          transition: anime ? "transform 800ms cubic-bezier(.65,0,.35,1)" : "none",
        }}
        onTransitionEnd={() => {
          if (i >= n) {
            setAnime(false);
            setI(0);
          }
        }}
      >
        {liste.map((d, k) => (
          <Affiche key={`${d.id}-${k}`} d={d} visible={k === (i >= n ? 0 : i)} />
        ))}
      </div>

      {n > 1 ? (
        <span aria-hidden className="pointer-events-none absolute top-1/2 right-1.5 flex -translate-y-1/2 flex-col gap-[3px]">
          {directs.map((d, k) => (
            <span
              key={d.id}
              className={cn("w-[3px] rounded-full transition-all duration-300", k === actif ? "h-3 bg-[#f3eee2]" : "h-[5px] bg-white/40")}
            />
          ))}
        </span>
      ) : null}
    </div>
  );
}

function Affiche({ d, visible }: { d: Direct; visible: boolean }) {
  return (
    <Link
      href={`/direct/${d.id}`}
      draggable={false}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible || undefined}
      className="relative block overflow-hidden"
      style={{ height: HAUTEUR }}
    >
      <Photo src={d.image} alt="" fill sizes="(max-width: 1024px) 430px, 1200px" className="pointer-events-none object-cover" />
      <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,14,10,.5),rgba(4,14,10,.1)_38%,rgba(4,14,10,.92))]" />

      <span className="absolute top-3 left-3.5 flex h-5 items-center gap-[5px] rounded-full bg-[#c81e19]/85 pr-2 pl-[7px] text-[8px] font-extrabold tracking-[0.18em]">
        <span className="h-1.5 w-1.5 rounded-full bg-white [animation:mb-pouls_1.2s_infinite]" />
        EN DIRECT
      </span>
      <span className="absolute top-3 right-3 flex h-5 items-center gap-1.5 rounded-full bg-[#05100b]/60 pr-2 pl-[3px] text-[9.5px] font-bold">
        <LogoSalle nom={d.salle} logo={d.logo} />
        <span className="h-2.5 w-px bg-white/25" />
        <OeilIcon />
        {group(d.spectateurs)}
      </span>

      <span className="absolute inset-x-3.5 bottom-2.5 flex flex-col gap-1">
        <span className="truncate text-[8px] font-bold tracking-[0.14em] text-gold uppercase">
          {d.match ? `${d.match.etiquette} · course à ${d.match.course}` : d.rubrique}
        </span>
        {d.match ? (
          <span className="flex items-center gap-2">
            <Joueur j={d.match.a} />
            <span className="flex shrink-0 items-center gap-[3px]">
              <Case n={d.match.a.score} mene={d.match.a.score >= d.match.b.score} />
              <span className="text-[9px] text-white/55">–</span>
              <Case n={d.match.b.score} mene={d.match.b.score >= d.match.a.score} />
            </span>
            <Joueur j={d.match.b} droite />
          </span>
        ) : (
          <span className="flex flex-col">
            <span className="truncate text-[13.5px] font-extrabold">{d.titre}</span>
            <span className="truncate text-[10px] text-white/72">{d.salle}</span>
          </span>
        )}
      </span>
    </Link>
  );
}

type JoueurDuMatch = NonNullable<Direct["match"]>["a"];

function Joueur({ j, droite = false }: { j: JoueurDuMatch; droite?: boolean }) {
  return (
    <span className={cn("flex min-w-0 flex-1 items-center gap-[7px]", droite && "flex-row-reverse")}>
      {j.avatar ? (
        <Photo src={j.avatar} alt="" width={22} height={22} className="h-[22px] w-[22px] shrink-0 rounded-full border-[1.5px] border-[#f3eee2]/60 object-cover" />
      ) : (
        <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-[1.5px] border-[#f3eee2]/60 bg-[#05100b]/60 text-[8px] font-bold">
          {j.nom.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="truncate text-[12.5px] font-extrabold">{j.nom}</span>
      {j.aLaTable ? <span aria-label="à la table" className="h-[5px] w-[5px] shrink-0 rounded-full bg-gold" /> : null}
    </span>
  );
}

function Case({ n, mene }: { n: number; mene: boolean }) {
  return (
    <span
      className={cn(
        "grid h-[25px] min-w-6 place-items-center rounded-[7px] text-[14.5px] font-extrabold tabular-nums",
        mene ? "bg-[#f3eee2]/94 text-[#0b1a12]" : "border border-white/20 bg-[#05100b]/60",
      )}
    >
      {n}
    </span>
  );
}

/** Le logo de la salle, toujours en rond ; sans logo, ses initiales. */
function LogoSalle({ nom, logo }: { nom: string; logo: string }) {
  const initiales = nom
    .replace(/^(le|la|les|l')\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m[0])
    .join("")
    .toUpperCase();
  return (
    <span className="relative grid h-4 w-4 shrink-0 place-items-center overflow-hidden rounded-full border border-[#f3eee2]/60 bg-[#1a1a1a]">
      {logo ? (
        <Photo src={logo} alt={nom} fill sizes="16px" className="object-cover" />
      ) : (
        <span className="text-[6.5px] font-extrabold text-gold">{initiales}</span>
      )}
    </span>
  );
}

function OeilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
