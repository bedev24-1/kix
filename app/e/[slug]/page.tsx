import Image from "next/image";
import { Photo } from "@/components/ui/Photo";
import Link from "next/link";
import { PopupPromo } from "@/components/mb/PopupPromo";
import { notFound } from "next/navigation";
import { and, eq, isNull, ne, or } from "drizzle-orm";
import { db, events, venues } from "@/db";
import { getEvent, getTournoiDeLEvenement } from "@/lib/queries";
import { metadonneesApercu, prixLisible } from "@/lib/apercu";
import { soireeTerminee } from "@/lib/soirees";
import { spotifyIntegre, videoIntegree } from "@/lib/vitrine";
import { PartagerBouton } from "@/components/mb/PartagerBouton";
import { Contact } from "@/components/vitrine/Contact";
import { Hero } from "@/components/vitrine/Hero";
import { Video } from "@/components/vitrine/Video";
import { GRAIN, nuage, palette, type Palette } from "@/components/vitrine/styles";

/**
 * La page publique d'une soirée : celle qu'on partage — sa vitrine.
 *
 * Les pages de l'application demandent un compte. Partager leur adresse
 * montrait donc, dans WhatsApp, l'aperçu de la page de connexion. Celle-ci
 * s'ouvre à tous : l'affiche, le jour, le lieu, le prix — et un bouton qui
 * mène à la billetterie, en passant par la connexion s'il le faut.
 *
 * Chaque événement a la sienne : sa palette vient de son adresse, et ce que
 * le gérant ajoute (vidéo, galerie, artistes, musique) s'y range en sections.
 * Une section sans contenu n'apparaît pas.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event || !event.active) return { title: "Soirée introuvable" };
  const salle = event.venueId
    ? (await db.select({ name: venues.name }).from(venues).where(eq(venues.id, event.venueId)).limit(1))[0]
    : null;
  const lieu = salle?.name || event.address;
  return metadonneesApercu({
    titre: event.title,
    description: [
      event.subtitle,
      [event.day, event.hours].filter(Boolean).join(" · "),
      lieu,
      prixLisible(event.price),
      event.description,
    ]
      .filter(Boolean)
      .join(" — "),
    image: event.image,
    chemin: `/e/${event.slug}`,
  });
}

export default async function SoireePublique({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event || !event.active) notFound();

  const [salle, jumeau, autres] = await Promise.all([
    event.venueId
      ? db.select().from(venues).where(eq(venues.id, event.venueId)).limit(1).then((r) => r[0] ?? null)
      : null,
    getTournoiDeLEvenement(event.id),
    // Les autres dates à l'affiche, de la même salle d'abord.
    db
      .select()
      .from(events)
      .where(
        and(
          eq(events.active, true),
          isNull(events.endedAt),
          ne(events.id, event.id),
          event.venueId ? or(eq(events.venueId, event.venueId), isNull(events.venueId)) : undefined,
        ),
      )
      .limit(5),
  ]);

  const v = event.vitrine ?? {};
  const p = palette(event.slug);
  const terminee = soireeTerminee(event.endedAt);
  const billetterie = `/rejoindre?vers=/app/events/${event.slug}`;
  const lieu = salle?.name || event.address;
  const galerie = (v.galerie ?? []).filter(Boolean);
  const artistes = (v.artistes ?? []).filter((a) => a.nom);
  const spotify = v.musique ? spotifyIntegre(v.musique) : null;
  const dates = [event, ...autres];

  const liens = [
    v.video ? { href: "#video", label: "Vidéo" } : null,
    { href: "#evenement", label: "L'événement" },
    galerie.length ? { href: "#galerie", label: "Galerie" } : null,
    { href: "#dates", label: "Dates" },
    artistes.length ? { href: "#affiche", label: "À l'affiche" } : null,
    v.contact !== false ? { href: "#contact", label: "Contact" } : null,
  ].filter((l): l is { href: string; label: string } => l !== null);

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-black text-white">
      <Regle couleurs={p} className="top-24 left-3 h-[60vh]" />
      <Regle couleurs={p} className="top-[140vh] right-3 h-[45vh]" />

      <nav className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-4 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image src="/brand/emblem.png" alt="" width={26} height={26} />
          <span className="text-[13px] font-extrabold tracking-[-0.02em] uppercase">Master Break</span>
        </Link>
        <div className="hidden grow justify-center gap-5 font-mono text-[9.5px] tracking-[0.1em] text-white/75 uppercase md:flex">
          {liens.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-white">
              {l.label}
            </a>
          ))}
        </div>
        <PartagerBouton
          chemin={`/e/${event.slug}`}
          titre={event.title}
          className="ml-auto rounded-full border border-white/25 px-3 py-1.5 font-mono text-[10.5px] text-white/85 md:ml-0"
        />
      </nav>

      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 pb-10 sm:gap-14 sm:px-8">
        <Hero
          images={[event.image, ...galerie].slice(0, 5)}
          titre={event.title}
          sousTitre={[event.day, event.hours, lieu].filter(Boolean).join(" · ")}
          texte={event.description || event.subtitle}
          couleurs={p}
          principal={
            terminee
              ? undefined
              : {
                  href: billetterie,
                  label: event.price > 0 ? `Prendre ma place · ${prixLisible(event.price)}` : "Réserver ma place",
                }
          }
          secondaire={jumeau ? { href: `/t/${jumeau.tournoi.slug}`, label: "Voir le tournoi" } : { href: "#dates", label: "Voir les dates" }}
        />

        {v.video ? (
          <div id="video">
            <Video integree={videoIntegree(v.video)} fichier={v.video} affiche={event.image} couleurs={p} />
          </div>
        ) : null}

        <Manifeste
          titre={event.title}
          lignes={(v.manifeste || event.subtitle || "").split("\n").filter((l) => l.trim())}
          texte={event.description}
          couleurs={p}
          billetterie={terminee ? null : billetterie}
          infos={[
            ["Quand", [event.day, event.hours].filter(Boolean).join(" · ") || "À confirmer"],
            ["Où", lieu || "À confirmer"],
            ["Entrée", prixLisible(event.price)],
            ["Places", `${Math.max(0, event.capacity - event.attendees)} restantes`],
          ]}
        />
      </div>

      {galerie.length ? <Galerie id="galerie" images={galerie} /> : null}

      <div className="mx-auto flex max-w-5xl flex-col gap-14 px-4 py-12 sm:px-8">
        <section id="dates" className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {dates.map((d, n) => (
            <CarteDate
              key={d.id}
              href={d.id === event.id ? billetterie : `/e/${d.slug}`}
              image={d.image}
              titre={d.title}
              jour={d.day}
              lieu={d.id === event.id ? lieu : d.address}
              ton={[p.b, p.a, p.c][n % 3]}
              sombre={n % 3 === 2}
            />
          ))}
        </section>

        {artistes.length ? (
          <section id="affiche" className="flex flex-col gap-10">
            {artistes.map((a, n) => (
              <Artiste key={a.nom + n} {...a} aDroite={n % 2 === 0} />
            ))}
          </section>
        ) : null}

        {spotify ? (
          <section className="mx-auto w-full max-w-2xl overflow-hidden rounded-[14px]" style={{ background: p.b }}>
            <iframe
              src={spotify}
              title="Musique"
              height={352}
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              className="block w-full border-0"
            />
          </section>
        ) : null}
      </div>

      {v.contact !== false ? <Contact slug={event.slug} couleurs={p} /> : null}

      <footer className="flex flex-col items-center gap-6 px-5 py-20 text-center">
        <span className="text-[48px] leading-none font-extrabold tracking-[-0.05em] uppercase sm:text-[80px]">
          Master Break
        </span>
        <div className="flex gap-5 font-mono text-[10px] tracking-[0.12em] text-white/70 uppercase">
          {terminee ? null : (
            <Link href={billetterie} className="hover:text-white">
              Billets
            </Link>
          )}
          {v.contact !== false ? (
            <a href="#contact" className="hover:text-white">
              Contact
            </a>
          ) : null}
          <Link href="/" className="hover:text-white">
            Application
          </Link>
        </div>
      </footer>
      <PopupPromo page="site" />
    </main>
  );
}

/** La règle graduée des bords, avec sa barre de néon. */
function Regle({ couleurs, className }: { couleurs: Palette; className: string }) {
  return (
    <div className={`pointer-events-none absolute hidden w-4 lg:flex ${className}`} aria-hidden="true">
      <span
        className="h-full w-2.5"
        style={{
          backgroundImage: "repeating-linear-gradient(to bottom, rgba(255,255,255,.35) 0 1px, transparent 1px 6px)",
        }}
      />
      <span
        className="h-full w-1"
        style={{ background: `linear-gradient(to bottom, ${couleurs.c}, ${couleurs.a}, ${couleurs.b})` }}
      />
    </div>
  );
}

function Manifeste({
  titre,
  lignes,
  texte,
  couleurs,
  billetterie,
  infos,
}: {
  titre: string;
  lignes: string[];
  texte: string;
  couleurs: Palette;
  billetterie: string | null;
  infos: [string, string][];
}) {
  // Le titre empilé, un mot par ligne, comme sur une affiche de tournée.
  const mots = titre.toUpperCase().split(/\s+/).slice(0, 5);
  return (
    <section
      id="evenement"
      className="relative overflow-hidden px-5 py-10 sm:px-10 sm:py-14"
      style={{ background: nuage(couleurs) }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-35 mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
      <Coins />
      <span className="pointer-events-none absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 text-xl text-white/60 sm:block">
        ⌖
      </span>

      <div className="relative grid items-center gap-8 sm:grid-cols-2">
        <h2 className="-rotate-6 text-[52px] leading-[0.8] font-black tracking-[-0.06em] text-white uppercase [text-shadow:0_6px_30px_rgba(0,0,0,.35)] sm:text-[84px]">
          {mots.map((m, n) => (
            <span key={n} className="block" style={{ marginLeft: `${(n % 2) * 0.6}em` }}>
              {m}
            </span>
          ))}
        </h2>

        <div className="flex flex-col gap-4">
          {lignes.length ? (
            <div className="font-mono text-[12px] leading-[1.6] text-white/90">
              {lignes.map((l, n) => (
                <p key={n}>{l}</p>
              ))}
            </div>
          ) : null}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[11px]">
            {infos.map(([q, val]) => (
              <div key={q}>
                <dt className="text-[9.5px] tracking-[0.12em] text-white/60 uppercase">{q}</dt>
                <dd className="text-white">{val}</dd>
              </div>
            ))}
          </dl>
          {billetterie ? (
            <Link
              href={billetterie}
              className="press flex h-8 w-fit items-center gap-2 rounded-full px-4 font-mono text-[11px] text-white"
              style={{ background: couleurs.a }}
            >
              → Billets et inscriptions
            </Link>
          ) : (
            <p className="font-mono text-[11px] text-white/70">Cette soirée est terminée.</p>
          )}
        </div>
      </div>

      {texte ? (
        <p className="relative mt-10 max-w-3xl font-mono text-[11px] leading-[1.6] whitespace-pre-line text-white/85">
          {texte}
        </p>
      ) : null}
    </section>
  );
}

function Coins() {
  const c = "pointer-events-none absolute h-3 w-3 border-white/60";
  return (
    <>
      <span className={`${c} top-3 left-3 border-t border-l`} />
      <span className={`${c} top-3 right-3 border-t border-r`} />
      <span className={`${c} bottom-3 left-3 border-b border-l`} />
      <span className={`${c} right-3 bottom-3 border-r border-b`} />
    </>
  );
}

/** Le bandeau de photos qui file d'un bord à l'autre. */
function Galerie({ id, images }: { id: string; images: string[] }) {
  return (
    <section id={id} className="flex snap-x gap-2.5 overflow-x-auto px-4 [scrollbar-width:none] sm:px-5">
      {images.map((src, n) => (
        <span key={src + n} className="relative aspect-square w-[42vw] shrink-0 snap-start overflow-hidden sm:w-[22vw] lg:w-60">
          <Photo src={src} alt="" fill sizes="(max-width: 640px) 42vw, 240px" className="object-cover" />
        </span>
      ))}
    </section>
  );
}

function CarteDate({
  href,
  image,
  titre,
  jour,
  lieu,
  ton,
  sombre,
}: {
  href: string;
  image: string;
  titre: string;
  jour: string;
  lieu: string;
  ton: string;
  sombre: boolean;
}) {
  return (
    <Link href={href} className="press group flex flex-col">
      <span className="relative aspect-[3/4] overflow-hidden">
        <Photo src={image} alt="" fill sizes="(max-width: 640px) 50vw, 320px" className="object-cover transition group-hover:scale-105" />
        <span className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/80 to-transparent" />
        <span className="absolute inset-x-3 bottom-3 text-[15px] leading-tight font-extrabold tracking-[-0.02em] text-white uppercase">
          {titre}
        </span>
      </span>
      <span
        className="mx-2 -mt-1 flex flex-col items-center gap-0.5 px-2 py-2.5 text-center"
        style={{ background: ton, color: sombre ? "#111" : "#fff" }}
      >
        <span className="font-mono text-[11px] font-semibold uppercase">{titre}</span>
        <span className="font-mono text-[9.5px] opacity-85">{jour}</span>
        {lieu ? <span className="font-mono text-[9.5px] opacity-85">{lieu}</span> : null}
      </span>
    </Link>
  );
}

function Artiste({ nom, photo, bio, aDroite }: { nom: string; photo: string; bio: string; aDroite: boolean }) {
  return (
    <div className={`flex flex-col gap-4 sm:items-end sm:gap-6 ${aDroite ? "sm:flex-row" : "sm:flex-row-reverse"}`}>
      {photo ? (
        <span className="relative aspect-[4/5] w-full shrink-0 overflow-hidden sm:w-72">
          <Photo src={photo} alt={nom} fill sizes="(max-width: 640px) 100vw, 288px" className="object-cover" />
        </span>
      ) : null}
      <div className={`flex max-w-xs flex-col gap-2 ${aDroite ? "" : "sm:items-end sm:text-right"}`}>
        <h3 className="font-mono text-[18px] text-white">{aDroite ? `→ ${nom}` : `${nom} ←`}</h3>
        {bio ? <p className="font-mono text-[10.5px] leading-[1.55] text-white/75">{bio}</p> : null}
      </div>
    </div>
  );
}
