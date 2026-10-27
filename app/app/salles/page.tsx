import { Photo } from "@/components/ui/Photo";
import Link from "next/link";
import { ScreenHeader } from "@/components/mb/AppHeader";
import { Chip } from "@/components/ui/Chip";
import { ChevronRightIcon, PinIcon } from "@/components/icons";
import { getVenues } from "@/lib/queries";
import { comptesActifs } from "@/lib/presences";
import { CarteSalles } from "@/components/salles/CarteSalles";
import { f, km } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Salles partenaires" };

export default async function SallesPage() {
  const venues = await getVenues();
  const actifs = await comptesActifs(venues.map((v) => v.id));
  const surCarte = venues
    .filter((v) => v.latitude != null && v.longitude != null)
    .map((v) => ({ id: v.id, slug: v.slug, name: v.name, area: `${v.area}, ${v.city}`, lat: v.latitude!, lng: v.longitude!, actifs: actifs.get(v.id) ?? 0 }));

  return (
    <>
      <ScreenHeader title="Salles partenaires" subtitle="Où jouer, qui y joue en ce moment, et comment y aller." />

      <CarteSalles salles={surCarte} />

      <div className="flex gap-2">
        <Chip tone="solid">Douala</Chip>
        <Chip tone="neutral">Yaoundé</Chip>
        <Chip tone="neutral">Ouvertes</Chip>
      </div>

      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-2 lg:gap-5">
      {venues.map((venue) => (
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
          <div className="flex grow flex-col justify-center gap-1.5">
            <span className="text-[15px] font-semibold">{venue.name}</span>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <PinIcon size={13} />
              {venue.area}, {venue.city} · {km(venue.distanceKm)}
            </span>
            <span className="flex flex-wrap items-center gap-2 text-[11px]">
              {(actifs.get(venue.id) ?? 0) > 0 ? (
                <span className="flex items-center gap-1 text-jade-text">
                  <span className="live-dot h-1.5 w-1.5 rounded-full bg-jade" />
                  {actifs.get(venue.id)} en jeu
                </span>
              ) : null}
              <span className="text-gold-text">{venue.freeTables} tables libres</span>
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
