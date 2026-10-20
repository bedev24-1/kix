"use client";

import { Photo } from "@/components/ui/Photo";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Palette } from "@/components/vitrine/styles";

/**
 * L'ouverture : l'affiche en grand, puis les photos de la galerie qui se
 * relaient. Le titre, l'accroche et les deux boutons restent posés dessus.
 */
export function Hero({
  images,
  titre,
  sousTitre,
  texte,
  principal,
  secondaire,
  couleurs,
}: {
  couleurs: Palette;
  images: string[];
  titre: string;
  sousTitre?: string;
  texte: string;
  principal?: { href: string; label: string };
  secondaire?: { href: string; label: string };
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % images.length), 5500);
    return () => clearInterval(t);
  }, [images.length]);

  return (
    <section className="relative aspect-[4/5] w-full overflow-hidden sm:aspect-[16/9]">
      {images.map((src, n) => (
        <Photo
          key={src + n}
          src={src}
          alt=""
          fill
          priority={n === 0}
          sizes="(max-width: 1024px) 100vw, 1024px"
          className="object-cover transition-opacity duration-1000"
          style={{ opacity: n === i ? 1 : 0 }}
        />
      ))}
      <div className="absolute inset-0 bg-linear-to-r from-black/85 via-black/45 to-black/10" />
      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />

      <div className="absolute inset-x-5 bottom-14 flex max-w-md flex-col gap-4 sm:inset-x-10 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2">
        <h1 className="text-[44px] leading-[0.85] font-extrabold tracking-[-0.04em] text-white uppercase sm:text-[72px]">
          {titre}
        </h1>
        {sousTitre ? <p className="font-mono text-[12px] tracking-wide text-white/80 uppercase">{sousTitre}</p> : null}
        {texte ? (
          <p className="line-clamp-6 font-mono text-[11.5px] leading-[1.55] whitespace-pre-line text-white/85">{texte}</p>
        ) : null}
        <div className="flex flex-wrap gap-2.5 pt-1">
          {principal ? (
            <Link
              href={principal.href}
              className="press flex h-9 items-center gap-2 rounded-full px-4 font-mono text-[11.5px] text-white"
              style={{ background: couleurs.a }}
            >
              → {principal.label}
            </Link>
          ) : null}
          {secondaire ? (
            <Link
              href={secondaire.href}
              className="press flex h-9 items-center gap-2 rounded-full px-4 font-mono text-[11.5px] text-white"
              style={{ background: couleurs.b }}
            >
              → {secondaire.label}
            </Link>
          ) : null}
        </div>
      </div>

      <span className="absolute bottom-4 left-4 text-xl text-white/70" aria-hidden="true">↙</span>
      {images.length > 1 ? (
        <div className="absolute inset-x-0 bottom-5 flex justify-center gap-1.5">
          {images.map((_, n) => (
            <button
              key={n}
              onClick={() => setI(n)}
              aria-label={`Image ${n + 1}`}
              className="h-1.5 w-1.5 rounded-full transition-all"
              style={{ background: n === i ? couleurs.a : "rgba(255,255,255,.7)", width: n === i ? 14 : 6 }}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
