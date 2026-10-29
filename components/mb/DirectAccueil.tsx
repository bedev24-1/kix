"use client";

import { Photo } from "@/components/ui/Photo";
import Link from "next/link";
import { useLive } from "@/lib/useLive";
import { LiveDot } from "@/components/live/LiveDot";
import { Card } from "@/components/ui/Card";
import { ArrowRightIcon, BoltIcon } from "@/components/icons";
import { group } from "@/lib/format";
import type { Encours } from "@/lib/stream";

/**
 * La bande « en direct » de l'accueil.
 *
 * La section des matchs filmés existait sans que rien ne l'annonce : elle
 * n'était ni dans la barre du bas ni sur l'accueil, et un client n'avait
 * aucune raison de la découvrir. Elle se montre maintenant d'elle-même, et
 * elle se met à jour toute seule — une salle qui allume sa caméra apparaît
 * ici sans que personne ne recharge quoi que ce soit.
 */
export function DirectAccueil({ initial, vide }: { initial: Encours; /** Ce qui s'affiche quand aucune caméra ne tourne. */ vide?: React.ReactNode }) {
  const { data } = useLive<Encours>("/api/direct/encours", initial);

  // Rien à l'antenne : l'accueil fournit son propre bloc (rappel + rediffusions).
  if (data.total === 0 && vide) return <>{vide}</>;

  // Rien à l'antenne : on invite, sans mentir sur ce qui s'y passe.
  if (data.total === 0) {
    return (
      <Link href="/direct" className="press block">
        <Card tone="dashed" shape="panel" className="flex items-center gap-3.5 p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
            <BoltIcon size={19} />
          </span>
          <span className="flex min-w-0 grow flex-col gap-0.5">
            <span className="text-[14px] font-semibold">Les tables filmées</span>
            <span className="text-[12px] text-muted">
              Personne ne diffuse à cette heure. Reviens ce soir.
            </span>
          </span>
          <ArrowRightIcon size={16} className="shrink-0 text-muted" />
        </Card>
      </Link>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-[15px] font-semibold lg:text-[17px]">
          En direct maintenant
          <LiveDot label={`${data.total}`} connected />
        </h2>
        <Link href="/direct" className="press text-[12px] text-gold-text">
          Tout voir
        </Link>
      </div>

      {/* Bande défilante : sur un téléphone, on fait glisser plutôt que de
          descendre — l'accueil garde sa hauteur quel que soit le nombre de
          caméras allumées. */}
      <div className="-mx-5 flex md:-mx-7 gap-3 overflow-x-auto px-5 md:px-7 pb-1 lg:mx-0 lg:grid lg:grid-cols-3 lg:px-0">
        {data.directs.slice(0, 6).map((d) => (
          <Link
            key={d.id}
            href={`/direct/${d.id}`}
            className="press relative block h-36 w-60 shrink-0 overflow-hidden rounded-panel border border-line lg:h-40 lg:w-auto"
          >
            <Photo src={d.image} alt="" fill sizes="(max-width: 1024px) 240px, 320px" className="object-cover" />
            <span className="absolute inset-0 bg-linear-to-t from-black/90 via-black/35 to-black/10" />

            <span className="absolute top-2.5 left-2.5">
              <LiveDot className="bg-black/65 backdrop-blur-md" />
            </span>
            <span className="absolute top-2.5 right-2.5 rounded-full bg-black/65 px-2.5 py-1 text-[10.5px] text-white/85 backdrop-blur-md">
              {group(d.spectateurs)}
            </span>

            <span className="absolute inset-x-3 bottom-2.5 flex flex-col gap-0.5 text-white">
              <span className="truncate text-[13.5px] font-semibold">{d.titre}</span>
              <span className="truncate text-[11.5px] text-white/70">
                {d.salle} · {d.rubrique}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
