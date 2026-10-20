import Image from "next/image";
import { Photo } from "@/components/ui/Photo";
import Link from "next/link";
import { PopupPromo } from "@/components/mb/PopupPromo";
import { DotGrid } from "@/components/site/DotGrid";
import { Marquee } from "@/components/site/Marquee";
import { SiteNav } from "@/components/site/SiteNav";
import { ArrowRightIcon, ClockIcon, UserIcon } from "@/components/icons";
import { Reveal } from "@/components/ui/Reveal";
import { getEvents, getVenues } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { f } from "@/lib/format";

export const dynamic = "force-dynamic";

const coaches = [
  {
    name: "Max Douala",
    role: "8-ball · effet rétro",
    image: "/img/coach-1.jpg",
    hours: "9.000h",
    students: "700+",
    price: 15000,
  },
  {
    name: "Alex Mercier",
    role: "9-ball · casse et sécurité",
    image: "/img/coach-2.jpg",
    hours: "5.400h",
    students: "300+",
    price: 12000,
  },
];

export default async function LandingPage() {
  const [venues, events, user] = await Promise.all([getVenues(), getEvents(), getCurrentUser()]);
  const featured = events[0];
  // La une, choisie dans l'administration : son image habille la section des
  // tables, et son titre mène à sa page.
  const une = events.find((e) => e.featured && !e.endedAt) ?? null;

  return (
    <div className="min-h-dvh bg-bg">
      <SiteNav user={user} />

      {/* ---------------------------------------------------------------- héros */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="halo halo-gold -top-40 -left-30 h-160 w-160" />
        <div className="halo halo-jade -right-40 bottom-0 h-150 w-150" />

        <div className="relative mx-auto flex min-h-[660px] max-w-400 flex-col px-5 pt-12 pb-6 lg:min-h-[720px] lg:px-10">
          <div className="stagger grid gap-8 lg:grid-cols-3 lg:items-start lg:gap-6">
            <div className="flex flex-col gap-4">
              <h1 className="text-[58px] font-extrabold lg:text-[86px] xl:text-[104px]">Casse.</h1>
              <p className="max-w-64 text-[13px] leading-5 text-muted">
                Tu choisis ta salle, tu paies tes jetons au chaud. La table t&apos;attend, personne ne
                cherche la monnaie.
              </p>
              <span className="w-fit rounded-full border border-line px-3 py-1 text-[11px] tracking-[0.18em] text-muted uppercase">
                v1.0
              </span>
            </div>

            <div className="flex flex-col items-start gap-4 lg:items-center lg:text-center">
              <h1 className="text-[58px] font-extrabold text-gold-text lg:text-[86px] xl:text-[104px]">
                Contrôle.
              </h1>
              <p className="max-w-64 text-[13px] leading-5 text-muted">
                Un QR par partie, un code de secours à 4 chiffres quand le réseau lâche. Le gérant
                scanne, le jeton tombe.
              </p>
            </div>

            <div className="flex flex-col gap-4 lg:items-end lg:text-right">
              <h1 className="text-[58px] font-extrabold lg:text-[86px] xl:text-[104px]">Victoire.</h1>
              <p className="max-w-64 text-[13px] leading-5 text-muted">
                Chaque partie compte des points, chaque tournoi te classe. Douala regarde qui tient
                la table.
              </p>
            </div>
          </div>

          <div className="rise relative mt-8 flex grow items-end justify-center lg:mt-2" style={{ ["--d" as string]: 4 }}>
            <div className="relative h-90 w-72 overflow-hidden rounded-t-[160px] border border-line lg:h-100 lg:w-84">
              <Image
                src="/img/player-cut.jpg"
                alt="Joueur au break sur une table du Break Akwa"
                fill
                sizes="(max-width: 1024px) 288px, 360px"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-linear-to-t from-bg via-transparent to-transparent" />
            </div>
          </div>

          <div className="rise mt-8 flex flex-col gap-6 border-t border-line pt-6 sm:flex-row sm:items-end sm:justify-between" style={{ ["--d" as string]: 6 }}>
            <div className="rect lift flex w-fit items-center gap-5 px-5 py-4">
              <span className="flex flex-col gap-1">
                <span className="label-caps">Ta salle du soir</span>
                <span className="text-[15px] font-semibold">{venues[0]?.name ?? "Le Break Akwa"}</span>
              </span>
              <span className="h-10 w-px bg-line" />
              <span className="flex flex-col gap-1">
                <span className="text-[22px] font-bold text-gold-text">4,8</span>
                <span className="text-[11px] text-muted">128 avis</span>
              </span>
              <span className="h-10 w-px bg-line" />
              <span className="flex flex-col gap-1">
                <span className="text-[22px] font-bold">{venues[0]?.freeTables ?? 2}</span>
                <span className="text-[11px] text-muted">tables libres</span>
              </span>
            </div>

            <Link
              href="/app/recharge"
              className="press group flex items-center gap-3 text-[13px] font-semibold tracking-[0.18em] text-gold-text uppercase"
            >
              Réserver une table
              <span className="grid h-9 w-9 place-items-center rounded-full border border-gold/45 transition group-hover:bg-gold group-hover:text-gold-ink">
                <ArrowRightIcon size={15} className="-rotate-45" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <Marquee items={["Master Break Club", "Billard", "Vape", "Nuit", "Douala"]} />

      {/* ------------------------------------------------------------- énergie */}
      <section className="relative isolate flex min-h-[560px] items-center justify-center overflow-hidden px-5 py-20 lg:min-h-[680px]">
        <Image
          src="/img/balls-glow.jpg"
          alt="Billes de billard sous les néons"
          fill
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-bg/72" />

        <Reveal className="stagger flex max-w-3xl flex-col items-center gap-7 text-center">
          <p className="text-[12px] tracking-[0.22em] text-dim uppercase">
            Trouve une table, achète tes jetons, scanne, joue
          </p>
          <DotGrid size={7} className="text-gold" />
          <h2 className="text-[38px] font-extrabold text-balance uppercase lg:text-[62px]">
            Vis la vraie énergie
            <br />
            du billard
          </h2>
          <p className="max-w-xl text-[14px] leading-6 text-dim text-pretty">
            {venues.length} salles partenaires à Douala, jetons crédités en quelques secondes par
            Orange Money ou MTN MoMo, et une file d&apos;attente qui n&apos;existe plus. Le reste,
            c&apos;est ton break.
          </p>
          <Link
            href={user ? "/app/salles" : "/inscription"}
            className="press go flex h-13 items-center gap-3 rounded-full bg-gold px-7 text-[13px] font-semibold tracking-[0.16em] text-gold-ink uppercase transition hover:brightness-105"
          >
            Réserver une table
            <ArrowRightIcon size={16} className="-rotate-45" />
          </Link>
        </Reveal>
      </section>

      {/* --------------------------------------------------------------- coachs */}
      <section className="border-y border-line px-5 py-16 lg:px-10">
        <Reveal className="mx-auto flex max-w-400 flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="h-px w-12 bg-gold" />
              <h2 className="text-[22px] font-bold tracking-[0.06em] uppercase lg:text-[26px]">
                Joue comme un pro
              </h2>
            </div>
            <Link href="/app/events" className="go flex items-center gap-2 text-[13px] text-dim hover:text-ink">
              Voir tous les coachs
              <span className="grid h-8 w-8 place-items-center rounded-full border border-line">
                <ArrowRightIcon size={14} />
              </span>
            </Link>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {coaches.map((coach) => (
              <article
                key={coach.name}
                className="lift zoom group relative h-100 overflow-hidden rounded-panel border border-line lg:h-115"
              >
                <Photo
                  src={coach.image}
                  alt={coach.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 640px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-black/40" />

                <div className="absolute inset-x-5 top-5 flex items-start justify-between">
                  <Link
                    href="/app/recharge"
                    className="press flex h-10 items-center rounded-full bg-gold px-4 text-[11px] font-semibold tracking-[0.12em] text-gold-ink uppercase"
                  >
                    Réserver une séance
                  </Link>
                  <span className="rounded-none border border-white/25 bg-black/40 px-3 py-2 text-[11px] tracking-[0.12em] text-white/80 uppercase backdrop-blur">
                    {f(coach.price)} / h
                  </span>
                </div>

                <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4">
                  <div className="flex flex-col gap-3 transition-transform duration-500 group-hover:-translate-y-1">
                    <div className="flex gap-2">
                      <Stat icon={<ClockIcon size={14} />} value={coach.hours} label="de table" />
                      <Stat icon={<UserIcon size={14} />} value={coach.students} label="élèves" />
                    </div>
                    <span className="text-[30px] font-extrabold text-white lg:text-[38px]">{coach.name}</span>
                    <span className="text-[12px] text-white/70">{coach.role}</span>
                  </div>
                  <span className="hidden rounded-full border border-white/25 px-3 py-2 text-[11px] tracking-[0.12em] text-white/80 uppercase sm:inline">
                    Coach MASTER BREAK
                  </span>
                </div>
              </article>
            ))}
          </div>

          <div className="flex items-center gap-5">
            <span className="h-px grow bg-line" />
            <span className="text-[13px] font-semibold tracking-[0.18em] uppercase">
              Joue comme un champion
            </span>
          </div>
        </Reveal>
      </section>

      {/* --------------------------------------------------------------- tables */}
      <section className="relative isolate min-h-[620px] overflow-hidden px-5 py-10 lg:px-10">
        <Photo
          src={une?.image || "/img/hall-neon.jpg"}
          alt={une ? une.title : "Salle de billard la nuit"}
          fill
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-black/62" />

        <Reveal className="mx-auto flex min-h-[560px] max-w-400 flex-col justify-between gap-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <span className="flex items-center gap-2.5 rounded-full bg-white/12 px-4 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-white uppercase backdrop-blur">
              Choisis ta table
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            </span>
            <span className="text-[11px] tracking-[0.22em] text-white/70 uppercase">Table black</span>
            {une ? (
              <Link
                href={`/app/events/${une.slug}`}
                className="rounded-full bg-gold px-4 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-gold-ink uppercase"
              >
                À la une · {une.title} · {une.day}
              </Link>
            ) : (
              <span className="text-[11px] tracking-[0.22em] text-white/70 uppercase">
                {featured ? `${featured.title} · ${featured.day}` : "Tournoi du samedi"}
              </span>
            )}
          </div>

          <div className="stagger flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            {["Élève", "Ton", "Jeu", "De Billard"].map((word) => (
              <span key={word} className="text-[44px] font-extrabold text-gold lg:text-[76px] xl:text-[92px]">
                {word}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-6">
            <Link
              href="/app/salles"
              className="press go flex items-center gap-3 text-[13px] font-semibold tracking-[0.18em] text-gold uppercase"
            >
              Réserver une table
              <span className="grid h-9 w-9 place-items-center rounded-full border border-gold/60">
                <ArrowRightIcon size={15} className="-rotate-45" />
              </span>
            </Link>

            <div className="flex gap-3">
              {venues.slice(0, 3).map((venue) => (
                <Link
                  key={venue.id}
                  href="/app/salles"
                  className="zoom relative h-20 w-28 overflow-hidden border border-white/25 transition hover:border-gold lg:h-24 lg:w-36"
                >
                  <Photo src={venue.image} alt={venue.name} fill sizes="144px" className="object-cover" />
                  <span className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-[10px] text-white">
                    {venue.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* --------------------------------------------------------------- footer */}
      <footer className="border-t border-line px-5 py-10 lg:px-10">
        <div className="mx-auto flex max-w-400 flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-[28px] font-extrabold lg:text-[40px]">Master Break Club</span>
            <div className="flex flex-wrap gap-3 text-[13px]">
              <Link href="/app" className="rounded-full border border-line px-4 py-2.5 hover:bg-surface">
                L&apos;app client
              </Link>
              <Link href="/gerant" className="rounded-full border border-line px-4 py-2.5 hover:bg-surface">
                Espace gérant
              </Link>
              <Link href="/admin" className="rounded-full border border-line px-4 py-2.5 hover:bg-surface">
                Administration
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-5 text-[12px] text-muted">
            <span>Douala, Cameroun · prix, salles et personnes donnés à titre d&apos;exemple</span>
            <span>Paiement Orange Money &amp; MTN MoMo</span>
          </div>
        </div>
      </footer>
      <PopupPromo page="site" />
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <span className="flex items-center gap-2 rounded-none border border-white/25 bg-black/35 px-3 py-2 text-white backdrop-blur">
      {icon}
      <span className="text-[15px] font-bold">{value}</span>
      <span className="text-[11px] text-white/70">{label}</span>
    </span>
  );
}
