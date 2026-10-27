import { Photo } from "@/components/ui/Photo";
import Link from "next/link";
import { ScreenHeader } from "@/components/mb/AppHeader";
import { Chip } from "@/components/ui/Chip";
import { ChevronRightIcon, PinIcon } from "@/components/icons";
import { getVenues } from "@/lib/queries";
import { comptesActifs } from "@/lib/presences";
import { CarteSalles } from "@/components/salles/CarteSalles";
import { DistanceSalle, ProchesDeToi } from "@/components/salles/ProchesDeToi";
import { f } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Salles partenaires" };

export default async function SallesPage({ searchParams }: { searchParams: Promise<{ ville?: string; filtre?: string }> }) {
  const { ville, filtre } = await searchParams;
  const venues = await getVenues();
  const actifs = await comptesActifs(venues.map((v) => v.id));
  const nb = (id: string) => actifs.get(id) ?? 0;

  // Les filtres : les villes où il y a vraiment des salles, et ce qui se passe maintenant.
  const villes = [...new Set(venues.map((v) => v.city))].sort();
  const liste = venues.filter(
    (v) =>
      (!ville || v.city === ville) &&
      (filtre !== "joueurs" || nb(v.id) > 0) &&
      (filtre !== "libres" || v.freeTables > 0),
  );
  const lien = (q: { ville?: string; filtre?: string }) => {
    const p = new URLSearchParams(Object.entries(q).filter(([, x]) => x) as [string, string][]);
    return p.size ? `/app/salles?${p}` : "/app/salles";
  };

  const placees = liste.filter((v) => v.latitude != null && v.longitude != null);
  const surCarte = placees.map((v) => ({ id: v.id, slug: v.slug, name: v.name, area: `${v.area}, ${v.city}`, lat: v.latitude!, lng: v.longitude!, actifs: nb(v.id) }));
  const proches = placees.map((v) => ({
    id: v.id, slug: v.slug, name: v.name, area: `${v.area}, ${v.city}`, image: v.image,
    lat: v.latitude!, lng: v.longitude!, actifs: nb(v.id), freeTables: v.freeTables,
  }));

  return (
    <>
      <ScreenHeader title="Salles partenaires" subtitle="Où jouer, qui y joue en ce moment, et comment y aller." />

      <CarteSalles salles={surCarte} />

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 md:-mx-7 md:px-7 lg:mx-0 lg:px-0">
        <Link href={lien({ filtre })}>
          <Chip tone={!ville ? "solid" : "neutral"}>Toutes</Chip>
        </Link>
        {villes.length > 1
          ? villes.map((c) => (
              <Link key={c} href={lien({ ville: c, filtre })}>
                <Chip tone={ville === c ? "solid" : "neutral"}>{c}</Chip>
              </Link>
            ))
          : null}
        <Link href={lien({ ville, filtre: filtre === "joueurs" ? undefined : "joueurs" })}>
          <Chip tone={filtre === "joueurs" ? "jade" : "neutral"}>Des joueurs sur place</Chip>
        </Link>
        <Link href={lien({ ville, filtre: filtre === "libres" ? undefined : "libres" })}>
          <Chip tone={filtre === "libres" ? "gold" : "neutral"}>Tables libres</Chip>
        </Link>
      </div>

      <ProchesDeToi salles={proches} />

      <h2 className="text-base">{ville ? `Salles à ${ville}` : "Toutes les salles"}</h2>
      {liste.length === 0 ? (
        <p className="text-[12.5px] text-muted">Aucune salle ne correspond pour le moment.</p>
      ) : null}
      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-2 lg:gap-5">
      {liste.map((venue) => (
        <Link
          key={venue.id}
          href={`/app/salles/${venue.slug}`}
          className="glass lift zoom flex gap-3 overflow-hidden rounded-card p-3"
        >
          <Photo
            src={venue.image}
            alt={venue.name}
            width={92}
            height={92}
            className="h-23 w-23 rounded-card object-cover lg:h-28 lg:w-28"
          />
          <div className="flex min-w-0 grow flex-col justify-center gap-1.5">
            <span className="text-[15px] font-semibold">{venue.name}</span>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <PinIcon size={13} className="shrink-0" />
              <span className="truncate">
                {venue.area}, {venue.city}
                <DistanceSalle lat={venue.latitude} lng={venue.longitude} />
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-2 text-[11px]">
              {nb(venue.id) > 0 ? (
                <span className="flex items-center gap-1 text-jade-text">
                  <span className="live-dot h-1.5 w-1.5 rounded-full bg-jade" />
                  {nb(venue.id)} en jeu
                </span>
              ) : null}
              <span className={venue.freeTables > 0 ? "text-gold-text" : "text-muted"}>
                {venue.freeTables > 0 ? `${venue.freeTables} table${venue.freeTables > 1 ? "s" : ""} libre${venue.freeTables > 1 ? "s" : ""}` : "Complet"}
              </span>
              <span className="text-muted">sur {venue.tables}</span>
              <span className="text-muted">· Jeton {f(venue.tokenPrice)}</span>
            </span>
          </div>
          <span className="grid w-8 place-items-center text-muted">
            <ChevronRightIcon size={16} />
          </span>
        </Link>
      ))}
      </div>
    </>
  );
}
