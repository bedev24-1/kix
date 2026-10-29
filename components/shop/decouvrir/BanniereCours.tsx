"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Photo } from "@/components/ui/Photo";
import { ChevronRightIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

export type CoursVitrine = {
  slug: string;
  titre: string;
  niveau: string;
  ligne: string;
  prix: string;
  image: string;
};

const PAUSE = 5000;

/**
 * Les cours, dans la charte des blocs de l'accueil : photo pleine, étiquette
 * d'or, prix en pastille ivoire, et la languette translucide pleine hauteur à
 * droite au lieu d'un bouton rond. Ils passent seuls de l'un à l'autre.
 */
export function BanniereCours({ cours }: { cours: CoursVitrine[] }) {
  const n = cours.length;
  const [i, setI] = useState(0);
  useEffect(() => {
    if (n < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => setI((k) => (k + 1) % n), PAUSE);
    return () => window.clearTimeout(t);
  }, [i, n]);
  if (n === 0) return null;
  const c = cours[i % n];

  return (
    <div className="relative -mx-[9px] h-44 overflow-hidden rounded-[24px] border border-line md:mx-0">
      <div className="flex h-full transition-transform duration-700 ease-[cubic-bezier(.2,.7,.2,1)]" style={{ transform: `translateX(${-i * 100}%)` }}>
        {cours.map((k, j) => (
          <Link key={k.slug} href={`/app/cours/${k.slug}`} tabIndex={j === i ? 0 : -1} className="relative block h-full w-full shrink-0">
            <Photo src={k.image} alt="" fill sizes="(max-width: 1024px) 430px, 900px" className="object-cover object-[center_30%]" />
            <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,14,10,.92),rgba(4,14,10,.45)_60%,rgba(4,14,10,.1))]" />
            <span className="absolute top-3 left-3.5 rounded-full border border-gold/60 bg-[#071a13]/50 px-2.5 py-[5px] text-[9px] font-bold tracking-[0.12em] text-gold uppercase">
              Cours · {k.niveau}
            </span>
            <span className="absolute right-11 bottom-3.5 left-4 flex items-end justify-between gap-3 text-white">
              <span className="min-w-0">
                <span className="block text-[20px] leading-[1.05] font-extrabold tracking-[-0.025em] text-balance">{k.titre}</span>
                <span className="mt-1.5 block truncate text-[11px] text-white/75">{k.ligne}</span>
              </span>
              <span className="shrink-0 rounded-full bg-[#f3eee2]/92 px-3 py-[7px] text-[11.5px] font-extrabold text-[#0b1a12]">{k.prix}</span>
            </span>
          </Link>
        ))}
      </div>
      {n > 1 ? (
        <span className="pointer-events-none absolute top-3.5 right-11 flex gap-1">
          {cours.map((k, j) => (
            <span key={k.slug} className={cn("h-[5px] rounded-full transition-all", j === i % n ? "w-3.5 bg-[#f3eee2]" : "w-[5px] bg-white/40")} />
          ))}
        </span>
      ) : null}
      <Link
        href={`/app/cours/${c.slug}`}
        aria-label={`Voir le cours ${c.titre}`}
        className="absolute inset-y-0 right-0 grid w-[30px] place-items-center border-l border-white/35 bg-white/30 text-white backdrop-blur-md"
      >
        <ChevronRightIcon size={15} strokeWidth={2.4} />
      </Link>
    </div>
  );
}
