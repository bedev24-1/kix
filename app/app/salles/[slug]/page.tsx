import { Photo } from "@/components/ui/Photo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ScreenHeader } from "@/components/mb/AppHeader";
import { BookTable } from "@/components/mb/BookTable";
import { Card } from "@/components/ui/Card";
import { ArrowRightIcon, CoinIcon, PinIcon, TableIcon } from "@/components/icons";
import { getFloor, getVenue } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { f, km } from "@/lib/format";
import { joueursActifs, maPresence } from "@/lib/presences";
import { lienItineraire } from "@/lib/salles-geo";
import { niveauDe, nomDuNiveau } from "@/lib/niveaux";
import { BoutonPresence, InviterPresents } from "@/components/salles/PresenceSalle";
import { CarteSalles } from "@/components/salles/CarteSalles";

const COMMENT = { en_jeu: "en partie", a_table: "à une table", present: "présent" } as const;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const venue = await getVenue((await params).slug);
  return { title: venue?.name ?? "Salle" };
}

export default async function VenuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [venue, user] = await Promise.all([getVenue(slug), requireUser()]);
  if (!venue) notFound();

  const [floor, actifs, presence] = await Promise.all([getFloor(venue.id), joueursActifs(venue.id), maPresence(user.id)]);
  const free = floor.filter((t) => t.table.status === "free").length;
  const placee = venue.latitude != null && venue.longitude != null;
  const presentIci = presence?.venueId === venue.id;
  const autres = actifs.filter((a) => a.id !== user.id);

  return (
    <>
      <ScreenHeader title={venue.name} subtitle={`${venue.area}, ${venue.city} · ${km(venue.distanceKm)}`} back="/app/salles" />

      <div className="relative h-44 overflow-hidden rounded-panel lg:h-64">
        <Photo src={venue.image} alt={venue.name} fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/20 to-transparent" />
        <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center gap-2 text-[11.5px]">
          <span className="flex items-center gap-1.5 rounded-full bg-jade/20 px-3 py-1.5 text-jade-text">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-jade" />
            {free} table{free > 1 ? "s" : ""} libre{free > 1 ? "s" : ""}
          </span>
          <span className="glass-strong flex items-center gap-1.5 rounded-full px-3 py-1.5">
            <CoinIcon size={13} className="text-gold-text" />
            Jeton {f(venue.tokenPrice)}
          </span>
          <span className="glass-strong flex items-center gap-1.5 rounded-full px-3 py-1.5">
            <PinIcon size={13} />
            {venue.address}
          </span>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base">Qui joue en ce moment</h2>
          <span className="flex items-center gap-1.5 text-[12px] text-jade-text">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-jade" />
            {actifs.length} joueur{actifs.length > 1 ? "s" : ""} actif{actifs.length > 1 ? "s" : ""}
          </span>
        </div>
        {autres.length ? (
          <div className="flex flex-wrap gap-2">
            {autres.slice(0, 18).map((a) => (
              <Link key={a.id} href={`/app/joueurs/${a.id}`} className="glass press flex items-center gap-2 rounded-full py-1 pl-1 pr-3">
                <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-surface-2 text-[12px] font-semibold">
                  {a.avatar ? <Photo src={a.avatar} alt="" width={32} height={32} className="h-8 w-8 object-cover" /> : a.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-[12.5px] font-semibold">{a.name}</span>
                  <span className="text-[10.5px] text-muted">{nomDuNiveau(niveauDe(a.points))} · {COMMENT[a.comment]}</span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-muted">Personne ne s&apos;est encore signalé ici. Sois le premier : tes amis sauront où te trouver.</p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <BoutonPresence venueId={venue.id} present={presentIci} />
          <InviterPresents
            venueId={venue.id}
            salle={venue.name}
            joueurs={autres.map((a) => ({ id: a.id, name: a.name, detail: `${nomDuNiveau(niveauDe(a.points))} · ${COMMENT[a.comment]}` }))}
          />
        </div>
      </section>

      {placee ? (
        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base">Venir à la salle</h2>
            <a href={lienItineraire({ lat: venue.latitude!, lng: venue.longitude! })} target="_blank" rel="noreferrer"
              className="press rounded-full bg-gold px-3.5 py-1.5 text-[12px] font-semibold text-gold-ink">
              Itinéraire
            </a>
          </div>
          <CarteSalles hauteur={220} salles={[{ id: venue.id, slug: venue.slug, name: venue.name, area: `${venue.area}, ${venue.city}`, lat: venue.latitude!, lng: venue.longitude!, actifs: actifs.length }]} />
        </section>
      ) : null}

      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base">Les tables, en direct</h2>
          <span className="text-[11px] text-muted">
            <TableIcon size={12} className="mr-1 inline" />
            {floor.length} tables
          </span>
        </div>
        <p className="text-[12.5px] leading-5 text-muted">
          L&apos;acompte retient la table et se déduit de ta note à l&apos;arrivée.
        </p>
      </div>

      {floor.length === 0 ? (
        <Card tone="dashed" shape="panel" className="flex flex-col items-center gap-3 px-5 py-9 text-center">
          <span className="grid h-13 w-13 place-items-center rounded-full bg-surface-2 text-muted">
            <TableIcon size={22} />
          </span>
          <p className="text-[13px] text-muted">
            Cette salle n&apos;a pas encore ouvert ses tables à la réservation.
          </p>
        </Card>
      ) : (
        <BookTable floor={floor} phone={user.phone} />
      )}

      <Link
        href="/app/recharge"
        className="glass press go flex items-center gap-3 rounded-card p-4 transition hover:bg-surface-2"
      >
        <span className="grid h-11 w-11 place-items-center rounded-full bg-gold/15 text-gold-text">
          <CoinIcon size={20} />
        </span>
        <span className="flex grow flex-col gap-0.5">
          <span className="text-[14px] font-semibold">Recharge avant de venir</span>
          <span className="text-[12px] text-muted">Un jeton par partie, {f(venue.tokenPrice)} ici.</span>
        </span>
        <ArrowRightIcon size={17} className="text-muted" />
      </Link>
    </>
  );
}
