"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Photo } from "@/components/ui/Photo";
import { cn } from "@/lib/cn";
import type { CartePromo } from "@/lib/banniere";

/**
 * La bannière de l'en-tête : les promos du moment, une carte à la fois.
 * Toutes les 4 s — ou d'un toucher — la carte suivante bascule depuis le
 * haut, comme un panneau d'aéroport. Elle s'arrête quand la page est cachée.
 */
export function Banniere({ cartes }: { cartes: CartePromo[] }) {
  const [i, setI] = useState(0);
  const n = cartes.length;

  useEffect(() => {
    if (n < 2) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setI((x) => (x + 1) % n);
    }, 4000);
    return () => window.clearInterval(id);
  }, [n]);

  if (!n) return <span className="grow" />;
  const c = cartes[i % n];

  return (
    <div className="relative h-11 min-w-0 grow [perspective:400px]">
      <Link
        key={c.id}
        href={c.lien}
        onClick={(e) => {
          // Un toucher sur la carte (hors bouton) passe à la suivante.
          if (n > 1 && !(e.target as HTMLElement).closest("[data-cta]")) {
            e.preventDefault();
            setI((x) => (x + 1) % n);
          }
        }}
        className="absolute inset-0 flex origin-top items-center gap-2 overflow-hidden rounded-[12px] px-2.5 text-white motion-safe:animate-[mb-feuillet_.5s_cubic-bezier(.2,.8,.3,1)_both]"
      >
        <Photo src={c.image} alt="" fill sizes="240px" className="object-cover" />
        <span className="absolute inset-0 bg-gradient-to-r from-[#071a13]/95 to-[#071a13]/40" />
        <span className="relative min-w-0 grow">
          <b className="block truncate text-[12px] font-extrabold text-[#f6d77a]">{c.titre}</b>
          <span className="block truncate text-[10px] text-white/85">{c.detail}</span>
        </span>
        <span data-cta className="relative shrink-0 rounded-[10px] bg-[#e0b43a] px-2 py-1 text-[9.5px] font-extrabold whitespace-nowrap text-[#1a1405]">
          {c.bouton}
        </span>
      </Link>
      {n > 1 ? (
        <span className="pointer-events-none absolute top-1 right-1.5 flex gap-[3px]">
          {cartes.map((x, k) => (
            <i key={x.id} className={cn("h-1 w-1 rounded-full", k === i % n ? "bg-[#e0b43a]" : "bg-white/45")} />
          ))}
        </span>
      ) : null}
    </div>
  );
}
