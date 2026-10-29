import { AppHeader } from "@/components/mb/AppHeader";
import { VenueCard } from "@/components/mb/VenueCard";
import { SectionTitle } from "@/components/ui/Card";
import { DirectAccueil } from "@/components/mb/DirectAccueil";
import { EnTeteAccueil } from "@/components/mb/accueil/EnTete";
import { BlocEvenements, type Affiche, type Vignette } from "@/components/mb/accueil/BlocEvenements";
import { Filtres } from "@/components/mb/accueil/Filtres";
import { Acces } from "@/components/mb/accueil/Acces";
import { getDirectsEnCours } from "@/lib/stream";
import { getBalance, getEvents, getUnreadCount, getVenues, tournoisDesEvenements } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { lireDebut } from "@/lib/debut";
import { f } from "@/lib/format";

export const dynamic = "force-dynamic";

/** « 21:00 → 02:00 » → « 21:00 » : l'heure d'ouverture suffit sur une vignette. */
const ouverture = (hours: string) => hours.split(/→|-|–/)[0].trim();

export default async function AccueilPage() {
  const user = await requireUser();
  const [balance, venues, events, unread, encours] = await Promise.all([
    getBalance(user.id),
    getVenues(),
    getEvents(),
    getUnreadCount(user.id),
    getDirectsEnCours(),
  ]);

  // Ce qui arrive passe devant ; s'il n'y a plus rien à venir, la dernière affiche reste.
  const avenir = events.filter((e) => !e.endedAt);
  const tete = avenir[0] ?? events[0];
  const suite = avenir.slice(1, 5);
  const tournois = await tournoisDesEvenements(tete ? [tete.id] : []);

  const une: Affiche | null = tete
    ? {
        href: `/app/events/${tete.slug}`,
        titre: tete.title,
        sousTitre: tete.subtitle,
        image: tete.image || "/img/hero-player.jpg",
        genre: tournois.has(tete.id) ? "Tournoi" : "Soirée",
        quand: tete.day,
        inscrits: tete.attendees,
        prix: tete.price > 0 ? `Dès ${f(tete.price)}` : "Entrée libre",
        debut: (tournois.get(tete.id) ?? lireDebut(tete.day, tete.hours))?.getTime() ?? null,
        fini: Boolean(tete.endedAt),
      }
    : null;

  const autres: Vignette[] = suite.map((e) => ({
    href: `/app/events/${e.slug}`,
    titre: e.title,
    quand: [e.day, ouverture(e.hours)].filter(Boolean).join(" · "),
    detail: [e.address, e.price > 0 ? `Pass ${f(e.price)}` : "Entrée libre"].filter(Boolean).join(" · "),
    image: e.image,
  }));

  return (
    // Le haut de l'accueil reste sombre quel que soit le thème choisi ; le
    // bas, à partir des accès, passe en clair. Le tout déborde la colonne
    // pour aller d'un bord à l'autre de l'écran.
    <div
      data-theme="dark"
      className="relative -mx-5 -mt-4 -mb-32 bg-bg text-ink md:-mx-7 md:-mt-6 lg:mx-0 lg:mt-0 lg:mb-0 lg:bg-transparent"
    >
      <div className="halo halo-gold -top-35 -left-24 h-85 w-85 lg:hidden" />
      <div className="halo halo-jade top-75 -right-32 h-80 w-80 lg:hidden" />

      <EnTeteAccueil
        user={user}
        unread={unread}
        solde={balance}
        annonces={avenir.slice(0, 6).map((e) => ({ titre: e.title, href: `/app/events/${e.slug}` }))}
      />

      <div className="relative flex flex-col gap-2.5 px-[11px] pt-5 md:px-7 lg:gap-5 lg:px-0 lg:pt-0">
        <div className="hidden lg:mb-1 lg:block">
          <AppHeader user={user} unread={unread} />
        </div>
        {une ? <BlocEvenements une={une} autres={autres} /> : null}
        <Filtres />
        <div className="px-[9px] pt-1 md:px-0">
          <DirectAccueil initial={encours} />
        </div>
      </div>

      {/* Sous les directs, un passage court du vert profond au vert sapin,
          un cran plus clair, jusqu'en bas. Pas d'ombres : des filets fins. */}
      <div
        className="zone-verte relative mt-2 flex flex-col gap-[22px] bg-[linear-gradient(180deg,rgba(7,26,19,0)_0,#123628_28px)] px-[11px] pt-[34px] pb-36 text-ink md:px-7 lg:mt-8 lg:rounded-panel lg:bg-bg lg:bg-none lg:px-8 lg:pt-8 lg:pb-10"
      >
        <Acces />
        <div className="flex flex-col gap-2.5 px-[9px] md:px-0 lg:gap-4">
          <SectionTitle title="Salles près de toi" action="Voir toutes" href="/app/salles" />
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 md:-mx-7 md:px-7 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-5 lg:px-0">
            {venues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
