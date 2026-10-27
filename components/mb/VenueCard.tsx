import { Photo } from "@/components/ui/Photo";
import Link from "next/link";
import { BadgeCertifie } from "@/components/ui/BadgeCertifie";
import { cn } from "@/lib/cn";
import { f } from "@/lib/format";
import { DistanceSalle } from "@/components/salles/ProchesDeToi";
import type { Venue } from "@/db";

export function VenueCard({ venue, className }: { venue: Venue; className?: string }) {
  return (
    <Link
      href="/app/recharge"
      className={cn("glass lift zoom press block w-45 shrink-0 overflow-hidden rounded-card lg:w-full lg:shrink", className)}
    >
      <div className="relative h-22 lg:h-44">
        <Photo src={venue.image} alt={venue.name} fill sizes="180px" className="object-cover" />
        <span className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white">
          <span className={cn("h-1.5 w-1.5 rounded-full", venue.freeTables > 0 ? "bg-gold" : "bg-warn")} />
          {venue.freeTables > 0 ? `${venue.freeTables} tables libres` : "Complet"}
        </span>
      </div>
      <div className="flex flex-col gap-1 px-3 py-2.5 lg:px-4 lg:py-3.5">
        <span className="flex items-center gap-1 text-sm font-semibold lg:text-[15px]">
          {venue.name} {venue.certifiee ? <BadgeCertifie motif="gerant" /> : null}
        </span>
        <span className="text-[11px] text-muted">
          Jeton {f(venue.tokenPrice)}
          <DistanceSalle lat={venue.latitude} lng={venue.longitude} demander="si_autorisee" />
        </span>
      </div>
    </Link>
  );
}
