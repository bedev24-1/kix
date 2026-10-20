import { Photo } from "@/components/ui/Photo";
import Link from "next/link";
import { AppHeader } from "@/components/mb/AppHeader";
import { WalletStrip } from "@/components/mb/WalletStrip";
import { VenueCard } from "@/components/mb/VenueCard";
import { Chip } from "@/components/ui/Chip";
import { SectionTitle } from "@/components/ui/Card";
import {
  BoltIcon,
  ChartIcon,
  ChevronRightIcon,
  MapIcon,
  SearchIcon,
  TargetIcon,
  TicketIcon,
  TrophyIcon,
  UserIcon,
} from "@/components/icons";
import { DirectAccueil } from "@/components/mb/DirectAccueil";
import { Tile, Tiles } from "@/components/dash/Section";
import { getDirectsEnCours } from "@/lib/stream";
import { getBalance, getEvents, getUnreadCount, getVenues } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { f } from "@/lib/format";

export const dynamic = "force-dynamic";

const categories = ["Tout", "Billard", "Vapes", "Soirées"];

export default async function AccueilPage() {
  const user = await requireUser();
  const [balance, venues, events, unread, encours] = await Promise.all([
    getBalance(user.id),
    getVenues(),
    getEvents(),
    getUnreadCount(user.id),
    getDirectsEnCours(),
  ]);
  const [featured, tonight] = events;

  return (
    <>
      <AppHeader user={user} unread={unread} />

      {/* Une vraie barre, pas une image de barre : elle envoie vers la
          recherche, qui fouille salles, soirées, tournois, articles et
          joueurs. Un simple formulaire GET — ça marche sans JavaScript. */}
      <form action="/app/recherche" className="flex gap-2.5 lg:max-w-xl">
        <label className="glass flex h-12 grow items-center gap-2.5 rounded-full px-4">
          <SearchIcon size={17} className="shrink-0 text-muted" />
          <span className="sr-only">Rechercher</span>
          <input
            name="q"
            placeholder="Salle, tournoi, puff…"
            className="h-full w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
        </label>
        <button
          aria-label="Rechercher"
          className="press grid h-12 w-12 shrink-0 place-items-center rounded-full border border-jade/40 bg-jade/15 text-jade-text"
        >
          <SearchIcon size={18} />
        </button>
      </form>

      <div className="lg:hidden">
        <WalletStrip balance={balance} />
      </div>

      <div className="grid gap-3.5 lg:grid-cols-3 lg:gap-6">
        {featured ? (
          <Link
            href={`/app/events/${featured.slug}`}
            className="relative block h-44 overflow-hidden rounded-panel border border-line lg:col-span-2 lg:h-105"
          >
            {/* L'image de l'événement lui-même : l'affiche fixe d'avant faisait
                croire que chaque soirée avait la même photo. */}
            <Photo
              src={featured.image || "/img/hero-player.jpg"}
              alt={featured.title}
              fill
              sizes="(max-width: 1024px) 430px, 800px"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/45 to-black/95" />
            <div className="absolute inset-x-4 bottom-3.5 flex flex-col gap-2 text-white lg:inset-x-8 lg:bottom-8 lg:gap-3">
              <div className="flex gap-1.5">
                <span className="rounded-full border border-gold/45 bg-gold/20 px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-gold uppercase">
                  Tournoi
                </span>
                <span className="rounded-full border border-white/20 bg-black/50 px-2.5 py-1 text-[10px] font-medium">
                  {featured.day}
                </span>
              </div>
              <h2 className="text-[22px] leading-6 text-white lg:text-[40px] lg:leading-10">
                {featured.title}
                <br />
                {featured.subtitle}
              </h2>
              <div className="flex items-center justify-between lg:max-w-md">
                <span className="text-xs text-white/75 lg:text-sm">{featured.attendees} inscrits</span>
                <span className="rounded-full border border-white/20 bg-white/12 px-3.5 py-2 text-xs font-semibold lg:text-sm">
                  Dès {f(featured.price)}
                </span>
              </div>
            </div>
          </Link>
        ) : null}

        {tonight ? (
          <Link
            href={`/app/events/${tonight.slug}`}
            className="glass flex items-center gap-3 rounded-card p-3 transition hover:bg-surface-2 lg:h-full lg:flex-col lg:items-stretch lg:justify-between lg:gap-4 lg:rounded-panel lg:p-4"
          >
            <Photo
              src={tonight.image}
              alt={tonight.title}
              width={320}
              height={320}
              className="h-16 w-16 shrink-0 rounded-card object-cover lg:h-48 lg:w-full lg:rounded-card"
            />
            <div className="flex grow flex-col gap-1 lg:justify-center lg:gap-2.5">
              <span className="hidden lg:block">
                <Chip tone="jade" className="text-[11px]">
                  Ce soir
                </Chip>
              </span>
              <span className="text-sm font-semibold lg:text-xl">{tonight.title}</span>
              <span className="text-[11px] text-muted lg:text-[13px]">
                {tonight.day} · {tonight.hours} · Pass {f(tonight.price)}
              </span>
              <span className="hidden text-[13px] leading-5 text-dim lg:line-clamp-3">{tonight.description}</span>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-jade/40 bg-jade/15 text-jade-text lg:h-11 lg:w-full lg:gap-2 lg:text-[13px] lg:font-semibold">
              <ChevronRightIcon size={15} className="lg:hidden" />
              <span className="hidden lg:inline">Prendre un pass</span>
            </span>
          </Link>
        ) : null}
      </div>

      <div className="flex gap-2">
        {categories.map((c, i) => (
          <Chip key={c} tone={i === 0 ? "solid" : "neutral"}>
            {c}
          </Chip>
        ))}
      </div>

      {/* Le direct s'annonce lui-même, avant le reste : c'est ce que la
          plateforme a de particulier, et rien ne le signalait. */}
      <DirectAccueil initial={encours} />

      {/* Ce que la barre du bas ne peut pas porter tient ici : quatre places
          en bas, le reste est à une touche de l'accueil. Huit tuiles font deux
          rangées pleines — une rangée à moitié vide se lit comme un oubli. */}
      <Tiles>
        <Tile href="/app/salles" label="Salles" icon={<MapIcon size={17} />} />
        <Tile href="/app/events" label="Soirées" icon={<TicketIcon size={17} />} />
        <Tile href="/app/live" label="Scores" icon={<TargetIcon size={17} />} />
        <Tile href="/app/tournois" label="Tournois" icon={<TrophyIcon size={17} />} />
        <Tile href="/app/classement" label="Classement" icon={<ChartIcon size={17} />} />
        <Tile href="/app/cours" label="Cours" icon={<TargetIcon size={17} />} />
        <Tile href="/app/abonnement" label="Abonnement" icon={<BoltIcon size={17} />} />
        <Tile href="/app/amis" label="Mes amis" icon={<UserIcon size={17} />} />
      </Tiles>

      <div className="flex flex-col gap-2.5 lg:gap-4">
        <SectionTitle title="Salles près de toi" action="Voir toutes" href="/app/salles" />
        <div className="-mx-5 flex md:-mx-7 gap-3 overflow-x-auto px-5 md:px-7 pb-1 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-5 lg:px-0">
          {venues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      </div>
    </>
  );
}
