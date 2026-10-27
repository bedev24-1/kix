"use client";

import Link from "next/link";
import { Photo } from "@/components/ui/Photo";
import { distanceLisible, distanceM } from "@/lib/salles-geo";
import { demanderPosition, useMaPosition } from "./position";

/**
 * La distance réelle jusqu'à une salle, depuis ma position. Rien tant que
 * l'une ou l'autre n'est pas connue : pas de chiffre pour faire joli.
 */
export function DistanceSalle({
  lat,
  lng,
  avant = " · ",
  demander = "toujours",
}: {
  lat: number | null;
  lng: number | null;
  avant?: string;
  demander?: "toujours" | "si_autorisee";
}) {
  const { point } = useMaPosition(demander);
  if (!point || lat == null || lng == null) return null;
  return (
    <>
      {avant}
      {distanceLisible(distanceM(point, { lat, lng }))}
    </>
  );
}

export type SalleProche = {
  id: string;
  slug: string;
  name: string;
  area: string;
  image: string;
  lat: number;
  lng: number;
  actifs: number;
  freeTables: number;
};

/** Le slide « Près de toi » : les salles les plus proches de ma position, la plus proche d'abord. */
export function ProchesDeToi({ salles, max = 6 }: { salles: SalleProche[]; max?: number }) {
  const { point, statut } = useMaPosition();
  if (!salles.length) return null;

  if (!point) {
    if (statut === "refusee" || statut === "indisponible") {
      return (
        <p className="rounded-card border border-dashed border-line px-4 py-3 text-[12.5px] text-muted">
          Active la localisation de ton téléphone pour voir les salles les plus proches de toi.
        </p>
      );
    }
    return (
      <button type="button" onClick={demanderPosition} className="press glass rounded-card px-4 py-3 text-left text-[12.5px] text-muted">
        {statut === "recherche" ? "Recherche de ta position…" : "Voir les salles les plus proches de moi"}
      </button>
    );
  }

  const proches = salles
    .map((s) => ({ s, d: distanceM(point, s) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, max);

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-base">Près de toi</h2>
      <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 md:-mx-7 md:px-7 lg:mx-0 lg:px-0">
        {proches.map(({ s, d }, i) => (
          <Link
            key={s.id}
            href={`/app/salles/${s.slug}`}
            className="glass lift press w-44 shrink-0 snap-start overflow-hidden rounded-card"
          >
            <div className="relative h-24">
              <Photo src={s.image} alt={s.name} fill sizes="176px" className="object-cover" />
              <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-1 text-[10.5px] font-semibold text-white">
                {distanceLisible(d)}
              </span>
              {i === 0 ? (
                <span className="absolute top-2 right-2 rounded-full bg-gold px-2 py-1 text-[10px] font-semibold text-gold-ink">
                  La plus proche
                </span>
              ) : null}
            </div>
            <div className="flex flex-col gap-1 px-3 py-2.5">
              <span className="truncate text-[13.5px] font-semibold">{s.name}</span>
              <span className="truncate text-[11px] text-muted">{s.area}</span>
              <span className="flex items-center gap-2 text-[11px]">
                {s.actifs > 0 ? (
                  <span className="flex items-center gap-1 text-jade-text">
                    <span className="live-dot h-1.5 w-1.5 rounded-full bg-jade" />
                    {s.actifs} en jeu
                  </span>
                ) : null}
                <span className={s.freeTables > 0 ? "text-gold-text" : "text-muted"}>
                  {s.freeTables > 0 ? `${s.freeTables} table${s.freeTables > 1 ? "s" : ""} libre${s.freeTables > 1 ? "s" : ""}` : "Complet"}
                </span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
