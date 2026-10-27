import Link from "next/link";
import { PopupPromo } from "@/components/mb/PopupPromo";
import { Cagnottes } from "@/components/tournoi/Cagnottes";
import { TableauEnDirect } from "@/components/tournoi/direct/TableauEnDirect";
import { heureDebut, periode } from "@/lib/periode";
import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db, events, tournamentPlayers, users } from "@/db";
import { Photo } from "@/components/ui/Photo";
import { getTournament } from "@/lib/tournaments";
import { CATEGORIES, DISCIPLINES, formule } from "@/lib/tournois";
import { metadonneesApercu, prixLisible } from "@/lib/apercu";

/**
 * La page publique d'un tournoi : l'affiche qu'on partage.
 *
 * Deux portes : le joueur pose sa candidature, le spectateur prend sa place.
 * L'aperçu dans WhatsApp dit l'essentiel — discipline, tableau, dotation,
 * droit d'inscription.
 */
async function charger(slug: string) {
  const ligne = await getTournament(slug);
  if (!ligne || ligne.tournament.status === "brouillon") return null;
  const t = ligne.tournament;
  const jumeau = t.eventId ? (await db.select().from(events).where(eq(events.id, t.eventId)).limit(1))[0] : null;
  return { ...ligne, t, jumeau };
}

function resume(t: NonNullable<Awaited<ReturnType<typeof charger>>>["t"]) {
  return [
    t.category === "mixte" && (t.placesHommes || t.placesDames)
      ? `${DISCIPLINES[t.discipline] ?? t.discipline} · ${t.placesHommes} hommes + ${t.placesDames} femmes`
      : `${DISCIPLINES[t.discipline] ?? t.discipline} · ${t.size} joueurs`,
    t.category !== "open" ? CATEGORIES[t.category] : null,
    formule(t),
    t.prizePool > 0 ? `Dotation ${t.prizePool.toLocaleString("fr-FR")} F` : null,
    t.entryFee > 0 ? `Inscription ${t.entryFee.toLocaleString("fr-FR")} F` : "Inscription gratuite",
  ]
    .filter(Boolean)
    .join(" · ");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await charger(slug);
  if (!d) return { title: "Tournoi introuvable" };
  const quand = d.t.startsAt ? periode(d.t.startsAt, d.t.endsAt, { jourSemaine: true }) : d.jumeau?.day;
  return metadonneesApercu({
    titre: `Tournoi · ${d.t.title}`,
    description: [d.t.presentation || resume(d.t), quand, d.venue?.name].filter(Boolean).join(" — "),
    image: d.t.image,
    chemin: `/t/${d.t.slug}`,
  });
}

export default async function TournoiPublic({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await charger(slug);
  if (!d) notFound();
  const { t, venue, jumeau } = d;
  const ouvert = t.status === "inscriptions";
  const retenus = await retenusParSexe(t.id);
  const quand = t.startsAt
    ? `${periode(t.startsAt, t.endsAt, { jourSemaine: true })} · dès ${heureDebut(t.startsAt)}`
    : jumeau?.day || "Date à confirmer";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-8 px-5 py-6">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <div className="relative h-72 overflow-hidden rounded-panel border border-line">
        <Photo src={t.image} alt={t.title} fill sizes="600px" className="object-cover" priority />
        <div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/35 to-black/90" />
        <div className="absolute inset-x-4 bottom-4 flex flex-col gap-1.5 text-white">
          <span className="w-fit rounded-full border border-gold/45 bg-gold/20 px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-gold uppercase">
            Tournoi {t.category !== "open" ? `· ${CATEGORIES[t.category]}` : ""}
          </span>
          <h1 className="text-[26px] leading-7 text-white">{t.title}</h1>
          {t.resumePosition === "haut" ? <p className="text-[13px] text-white/80">{resume(t)}</p> : null}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2.5 text-[13px]">
        <Info quoi="Quand" valeur={quand} />
        <Info quoi="Où" valeur={venue?.name || jumeau?.address || "À confirmer"} />
        <Info quoi="Inscription" valeur={t.entryFee > 0 ? `${t.entryFee.toLocaleString("fr-FR")} F` : "Gratuite"} />
        <Info quoi="Dotation" valeur={t.prizePool > 0 ? `${t.prizePool.toLocaleString("fr-FR")} F` : "—"} />
        {t.category === "mixte" && (t.placesHommes || t.placesDames) ? (
          <>
            <Info quoi="Places hommes" valeur={`${retenus.homme} / ${t.placesHommes}`} />
            <Info quoi="Places femmes" valeur={`${retenus.femme} / ${t.placesDames}`} />
          </>
        ) : null}
      </dl>

      {t.presentation ? (
        <p className="text-[14px] leading-6 whitespace-pre-line text-dim">{t.presentation}</p>
      ) : null}
      {t.resumePosition === "bas" ? <p className="text-[13px] text-muted">{resume(t)}</p> : null}
      <Cagnottes cagnottes={t.cagnottes ?? []} partage={t.prizeSplit} />
      {t.rules ? (
        <details className="rounded-panel border border-line px-4 py-3">
          <summary className="cursor-pointer list-none text-[13px] font-semibold [&::-webkit-details-marker]:hidden">Règlement →</summary>
          <p className="mt-2 text-[13.5px] leading-6 whitespace-pre-line text-dim">{t.rules}</p>
        </details>
      ) : null}

      <div className="flex flex-col gap-2.5">
        {ouvert ? (
          <Link
            href={`/rejoindre?vers=/app/tournois/${t.slug}`}
            className="press flex h-12 items-center justify-center rounded-full bg-gold text-sm font-semibold text-gold-ink"
          >
            Je m&apos;inscris comme joueur
          </Link>
        ) : null}
        {jumeau?.active ? (
          <Link
            href={`/rejoindre?vers=/app/events/${jumeau.slug}`}
            className="press flex h-12 items-center justify-center rounded-full border border-line text-sm font-semibold"
          >
            Je viens regarder · {prixLisible(jumeau.price)}
          </Link>
        ) : null}
        {!ouvert ? (
          <Link href={`/rejoindre?vers=/app/tournois/${t.slug}`} className="text-center text-[12.5px] text-gold-text">
            Voir le tableau et les résultats →
          </Link>
        ) : null}
      </div>
      </div>

      {/* Le tournoi en direct : groupes, arbre, arbitres — sans compte. */}
      <TableauEnDirect t={t} base="/t" />
      <PopupPromo page="site" />
    </main>
  );
}

function Info({ quoi, valeur }: { quoi: string; valeur: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-panel border border-line px-3.5 py-2.5">
      <dt className="text-[10.5px] tracking-[0.08em] text-muted uppercase">{quoi}</dt>
      <dd className="font-semibold first-letter:uppercase">{valeur}</dd>
    </div>
  );
}

/** Les joueurs retenus de chaque sexe, pour les places d'un mixte. */
async function retenusParSexe(tournamentId: string) {
  const lignes = await db
    .select({ sexe: users.sexe, n: sql<number>`count(*)::int` })
    .from(tournamentPlayers)
    .innerJoin(users, eq(users.id, tournamentPlayers.userId))
    .where(and(eq(tournamentPlayers.tournamentId, tournamentId), eq(tournamentPlayers.status, "accepte")))
    .groupBy(users.sexe);
  const n = (s: string) => Number(lignes.find((l) => l.sexe === s)?.n ?? 0);
  return { homme: n("homme"), femme: n("femme") };
}
