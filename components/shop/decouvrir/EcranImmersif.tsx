"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Photo } from "@/components/ui/Photo";
import { poserBarre, useBarre } from "@/lib/barre-nav";

/**
 * L'écran immersif du Shop, après les produits populaires.
 *
 * Dès qu'il dépasse de la hauteur d'une carte, la page glisse d'elle-même
 * jusqu'à lui, et l'entrée se joue comme un habillage de chaîne sportive, sans
 * se presser :
 *   1. un voile d'or translucide, une seule forme en couches, monte à travers
 *      l'écran tandis que le titre se découvre ;
 *   2. la barre du bas se rassemble en un point, au bout à droite ;
 *   3. ce point monte doucement, et un point d'or naît à côté ;
 *   4. le point d'or s'étire jusqu'au bord : « Voir la collection » ;
 *   5. en dessous, le second bouton se lève en douceur, comme un rideau.
 * En remontant, tout se défait, la barre plus vite que le reste.
 */
type Phase = 0 | 1 | 2 | 3 | 4 | 5;

const DEPASSE = 150;

function glisserVers(cible: number, ms: number, fin: () => void) {
  const depart = window.scrollY;
  const t0 = performance.now();
  const doux = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const pas = (now: number) => {
    const k = Math.min(1, (now - t0) / ms);
    window.scrollTo(0, depart + (cible - depart) * doux(k));
    if (k < 1) requestAnimationFrame(pas);
    else fin();
  };
  requestAnimationFrame(pas);
}

export function EcranImmersif({ hrefCollection, hrefCadeau }: { hrefCollection: string; hrefCadeau: string }) {
  const ref = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<Phase>(0);
  const [tour, setTour] = useState(0);
  const barre = useBarre();
  const auto = useRef(false);
  const minuteurs = useRef<number[]>([]);
  const phaseRef = useRef<Phase>(0);

  useEffect(() => {
    const vider = () => {
      minuteurs.current.forEach((t) => window.clearTimeout(t));
      minuteurs.current = [];
    };
    const aller = (p: Phase) => {
      phaseRef.current = p;
      setPhase(p);
      if (p === 2) poserBarre("rassemblee");
      if (p === 3) poserBarre("montee");
    };
    const plus = (ms: number, f: () => void) => minuteurs.current.push(window.setTimeout(f, ms));
    let dernier = window.scrollY;

    const surDefilement = () => {
      const el = ref.current;
      if (!el || auto.current || window.innerWidth >= 1024) return;
      const haut = el.getBoundingClientRect().top;
      const descend = window.scrollY > dernier;
      dernier = window.scrollY;

      // On remonte : tout se défait, la barre revient vite.
      if (phaseRef.current > 0 && haut > 60) {
        vider();
        aller(0);
        poserBarre("normale");
        return;
      }
      // On descend et l'écran dépasse d'une carte : il prend toute la place.
      if (phaseRef.current === 0 && descend && haut > 0 && haut <= window.innerHeight - DEPASSE) {
        const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        auto.current = true;
        setTour((t) => t + 1);
        aller(1);
        glisserVers(window.scrollY + haut, calme ? 1 : 1400, () => {
          dernier = window.scrollY;
          auto.current = false;
          plus(calme ? 0 : 900, () => aller(2));
          plus(calme ? 0 : 1900, () => aller(3));
          plus(calme ? 0 : 3800, () => aller(4));
          plus(calme ? 0 : 5100, () => aller(5));
        });
      }
    };
    window.addEventListener("scroll", surDefilement, { passive: true });
    return () => {
      window.removeEventListener("scroll", surDefilement);
      vider();
      poserBarre("normale");
    };
  }, []);

  // Le point rouvert d'un toucher : les boutons s'effacent avec la mise en scène.
  const enScene = barre !== "normale";
  const or = phase >= 3 && enScene;
  const etire = phase >= 4 && enScene;
  const rideau = phase >= 5 && enScene;
  const titre = phase >= 1;

  return (
    <section
      ref={ref}
      aria-label="Collection Pro"
      className="relative -mx-5 -mb-32 h-[100svh] overflow-hidden md:-mx-7 lg:mx-0 lg:mb-0 lg:h-[560px] lg:rounded-panel"
    >
      <Photo src="/img/hero-player.jpg" alt="" fill sizes="100vw" className="object-cover object-[40%_35%]" />
      <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,14,10,.35),rgba(4,14,10,.05)_30%,rgba(4,14,10,.15)_55%,rgba(4,14,10,.92))]" />

      {/* Le voile : une seule forme oblique, en couches d'or de plus en plus légères. */}
      {phase >= 1 ? (
        <span
          key={tour}
          aria-hidden
          className="pointer-events-none absolute inset-x-[-15%] top-full z-10 h-[78%] backdrop-blur-[1.5px] [animation:mb-voile_2.6s_cubic-bezier(.45,0,.3,1)_forwards] motion-reduce:hidden"
          style={{
            background:
              "linear-gradient(180deg,rgba(233,200,106,.22) 0,rgba(233,200,106,.22) 1.2%,rgba(217,180,80,.13) 1.2%,rgba(217,180,80,.13) 14%,rgba(217,180,80,.08) 14%,rgba(217,180,80,.08) 34%,rgba(217,180,80,.05) 34%,rgba(217,180,80,.05) 58%,rgba(217,180,80,.025) 58%,rgba(217,180,80,0) 100%)",
          }}
        />
      ) : null}

      <div className="absolute inset-x-0 top-[13%] z-[5] text-center text-white">
        <span
          className="inline-block text-[12px] font-bold tracking-[0.24em] text-gold"
          style={{ clipPath: titre ? "inset(0 0 0 0)" : "inset(0 100% 0 0)", transition: titre ? "clip-path .9s cubic-bezier(.6,0,.3,1) .9s" : "clip-path .3s" }}
        >
          COLLECTION PRO
        </span>
        <h2
          className="mt-2 text-[34px] leading-none font-extrabold tracking-[-0.02em] lg:text-[52px]"
          style={{ clipPath: titre ? "inset(0 0 0 0)" : "inset(0 100% 0 0)", transition: titre ? "clip-path 1.1s cubic-bezier(.6,0,.3,1) 1.2s" : "clip-path .3s" }}
        >
          JOUE COMME
          <br />
          <em className="font-serif text-[40px] font-normal italic lg:text-[60px]">un champion</em>
        </h2>
        <p className="mt-2.5 text-[12.5px] text-white/80" style={{ opacity: titre ? 1 : 0, transition: titre ? "opacity .8s 2s" : "opacity .2s" }}>
          Queues, billes et craies choisies par nos joueurs
        </p>
      </div>

      {/* Bureau : pas de barre du bas à mettre en scène, les boutons sont là. */}
      <div className="absolute inset-x-8 bottom-8 z-[5] hidden gap-3 lg:flex">
        <Link href={hrefCollection} className="press grid h-13 grow place-items-center rounded-full bg-gold text-[15px] font-extrabold text-gold-ink">
          Voir la collection
        </Link>
        <Link href={hrefCadeau} className="press grid h-13 grow place-items-center rounded-full border border-white/20 bg-[#071a13]/85 text-[15px] font-bold text-white">
          Offrir une carte cadeau
        </Link>
      </div>

      {/* Téléphone : les boutons naissent de la barre, au même endroit qu'elle. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[430px] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] lg:hidden">
        <div className="relative h-[130px]">
          <Link
            href={hrefCollection}
            tabIndex={or ? 0 : -1}
            aria-hidden={!or}
            className="pointer-events-auto absolute bottom-[74px] grid h-[52px] place-items-center overflow-hidden rounded-full bg-gold text-[15px] font-extrabold whitespace-nowrap text-gold-ink"
            style={{
              left: etire ? 0 : "calc(100% - 114px)",
              width: etire ? "calc(100% - 62px)" : 52,
              transform: or ? "scale(1)" : "scale(0)",
              transition: or
                ? "transform .6s cubic-bezier(.3,1.3,.5,1) .8s, left 1s cubic-bezier(.65,0,.35,1), width 1s cubic-bezier(.65,0,.35,1)"
                : "transform .25s, left .3s, width .3s",
              pointerEvents: or ? "auto" : "none",
            }}
          >
            <span style={{ opacity: etire ? 1 : 0, transition: etire ? "opacity .4s .7s" : "opacity .1s" }}>Voir la collection</span>
          </Link>
          <Link
            href={hrefCadeau}
            tabIndex={rideau ? 0 : -1}
            aria-hidden={!rideau}
            className="absolute inset-x-0 bottom-1 grid h-[52px] place-items-center rounded-full border border-white/20 bg-[#071a13]/85 text-[15px] font-bold text-white backdrop-blur-md"
            style={{
              clipPath: rideau ? "inset(0 0 0 0 round 26px)" : "inset(100% 0 0 0 round 26px)",
              opacity: rideau ? 1 : 0,
              transform: rideau ? "translateY(0)" : "translateY(10px)",
              transition: rideau
                ? "clip-path .9s cubic-bezier(.4,0,.2,1), opacity .9s, transform .9s cubic-bezier(.4,0,.2,1)"
                : "clip-path .3s, opacity .3s, transform .3s",
              pointerEvents: rideau ? "auto" : "none",
            }}
          >
            Offrir une carte cadeau
          </Link>
        </div>
      </div>
    </section>
  );
}
