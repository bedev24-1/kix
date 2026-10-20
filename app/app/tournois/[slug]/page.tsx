import { Photo } from "@/components/ui/Photo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db, events, tickets, tournamentMatches } from "@/db";
import { Programme } from "@/components/tournoi/Poules";
import { Inscription, type MaCandidature } from "@/components/tournoi/Inscription";
import { PartageTournoi } from "@/components/tournoi/Partage";
import { SaisieScore } from "@/components/tournoi/Actions";
import { TableauEnDirect } from "@/components/tournoi/direct/TableauEnDirect";
import { Cagnottes } from "@/components/tournoi/Cagnottes";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ChevronLeftIcon, PinIcon, TrophyIcon } from "@/components/icons";
import { nombreDeTours } from "@/lib/bracket";
import {
  duree,
  getBracket,
  getDuelsDePoule,
  getPlayers,
  getTournament,
  maCandidature,
  nomsDuTableau,
} from "@/lib/tournaments";
import { programme } from "@/lib/tournoi-vues";
import { CANDIDATURES, DISCIPLINES, ETATS, FORMATS, NIVEAUX } from "@/lib/tournois";
import { nomDuJeu, regleDuJeu } from "@/lib/regles";
import { exigenceDuTournoi, ilManque, niveauDe } from "@/lib/niveaux";
import { requireUser } from "@/lib/session";
import { f, fcfa } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lu = await getTournament(slug);
  return { title: lu?.tournament.title ?? "Tournoi" };
}

export default async function TournoiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [lu, user] = await Promise.all([getTournament(slug), requireUser()]);
  if (!lu || lu.tournament.status === "brouillon") notFound();

  const { tournament: t, venue } = lu;

  const [joueurs, duels, poules, noms, mienne, billet, aArbitrer] = await Promise.all([
    getPlayers(t.id),
    getBracket(t.id),
    t.format === "poules" ? getDuelsDePoule(t.id) : Promise.resolve([]),
    nomsDuTableau(t.id),
    maCandidature(t.id, user.id),
    t.eventId
      ? db
          .select({ id: tickets.id })
          .from(tickets)
          .where(
            and(
              eq(tickets.eventId, t.eventId),
              eq(tickets.userId, user.id),
              inArray(tickets.status, ["valid", "used", "guichet"]),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    // Les duels confiés à ce joueur comme arbitre, encore à jouer.
    db
      .select()
      .from(tournamentMatches)
      .where(and(eq(tournamentMatches.tournamentId, t.id), eq(tournamentMatches.refereeId, user.id)))
      .then((rows) => rows.filter((d) => d.status !== "termine" && d.status !== "exempt" && d.playerAId && d.playerBId)),
  ]);

  // Le prix de la place spectateur vit sur l'événement jumeau : c'est lui qui
  // porte la billetterie, et il ne doit pas être recopié sur le tournoi.
  const jumeau = t.eventId
    ? (await db.select().from(events).where(eq(events.id, t.eventId)).limit(1))[0]
    : undefined;

  const retenus = joueurs.filter((j) => j.player.status === "accepte");
  const tours = duels.length ? Math.max(...duels.map((d) => d.round)) : nombreDeTours(retenus.length);

  const candidature: MaCandidature = mienne
    ? {
        status: mienne.status,
        payment: mienne.payment,
        fee: mienne.fee,
        seed: mienne.seed,
        nickname: mienne.nickname,
        level: mienne.level,
      }
    : null;

  const champion = t.winnerId ? joueurs.find((j) => j.user.id === t.winnerId) : undefined;

  const { aVenir, joues } = programme([...poules, ...duels], noms, tours);

  return (
    <div className="-mx-5 -mt-4 flex flex-col gap-5 pb-8 lg:mx-0 lg:mt-0">
      <div className="relative h-72 lg:h-88 lg:overflow-hidden lg:rounded-panel lg:border lg:border-line">
        <Photo
          src={t.image}
          alt={t.title}
          fill
          sizes="(max-width: 1024px) 100vw, 1100px"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/55 via-black/15 to-bg lg:to-black/75" />

        <Link
          href="/app/tournois"
          aria-label="Retour"
          className="absolute top-4 left-5 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur lg:hidden"
        >
          <ChevronLeftIcon size={18} />
        </Link>

        <div className="absolute inset-x-5 bottom-4 flex flex-col gap-2 text-white lg:inset-x-7">
          <div className="flex flex-wrap gap-1.5">
            <Chip tone="gold" className="px-2.5 py-1 text-[10px] tracking-[0.06em] uppercase">
              {DISCIPLINES[t.discipline] ?? t.discipline}
            </Chip>
            <Chip tone="neutral" className="px-2.5 py-1 text-[10px] tracking-[0.06em] uppercase">
              {ETATS[t.status] ?? t.status}
            </Chip>
            <Chip tone="neutral" className="px-2.5 py-1 text-[10px] tracking-[0.06em] uppercase">
              {FORMATS[t.format] ?? t.format}
            </Chip>
            {/* Comment se joue un duel : c'est la première question d'un
                joueur qui lit l'affiche, avant même la dotation. */}
            <Chip tone="neutral" className="px-2.5 py-1 text-[10px] tracking-[0.06em] uppercase">
              {nomDuJeu(t.raceTo)}
            </Chip>
            {t.minLevel > 1 ? (
              <Chip tone="gold" className="px-2.5 py-1 text-[10px] tracking-[0.06em] uppercase">
                {exigenceDuTournoi(t.minLevel)}
              </Chip>
            ) : null}
          </div>
          <h1 className="text-[24px] leading-tight lg:text-[32px]">{t.title}</h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-white/75">
            <span>{duree(t)}</span>
            {venue ? (
              <span className="flex items-center gap-1.5">
                <PinIcon size={13} /> {venue.name}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-5 lg:px-0">
        {champion ? (
          <Card tone="gold" shape="panel" className="flex items-center gap-3.5 p-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gold text-gold-ink">
              <TrophyIcon size={22} />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="label-caps text-[10px]">Vainqueur</span>
              <span className="truncate text-[17px] font-semibold">
                {champion.player.nickname || champion.user.name}
              </span>
            </span>
          </Card>
        ) : null}

        {t.presentation ? (
          <p className="text-[14px] leading-6 whitespace-pre-line text-dim">{t.presentation}</p>
        ) : null}

        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <Fait valeur={String(t.size)} quoi="places au tableau" />
          <Fait valeur={String(retenus.length)} quoi="joueurs retenus" />
          <Fait valeur={t.prizePool > 0 ? f(t.prizePool) : "—"} quoi="dotation" />
          <Fait valeur={t.entryFee > 0 ? f(t.entryFee) : "Gratuit"} quoi="droit d'inscription" />
        </div>

        <Inscription
          tournamentId={t.id}
          titre={t.title}
          eventId={jumeau?.active ? t.eventId : null}
          ticketPrice={jumeau?.price ?? 0}
          entryFee={t.entryFee}
          phone={user.phone}
          nom={user.name}
          ouvert={t.status === "inscriptions"}
          billetPris={billet.length > 0}
          candidature={candidature}
          niveauRequis={t.minLevel}
          monNiveau={niveauDe(user.points)}
          ilMeManque={ilManque(user.points, t.minLevel)}
        />

        <Cagnottes cagnottes={t.cagnottes ?? []} partage={t.prizeSplit} />

        {/* La règle du jeu se dit toujours, même sans règlement écrit : un
            joueur doit savoir comment on gagne un duel avant de s'inscrire.
            Le règlement complet, lui, se replie : il n'est pas ce qu'on lit
            en premier. */}
        <Card shape="panel" className="flex flex-col gap-1.5 p-4">
          <span className="label-caps text-[10px]">Règlement</span>
          <p className="text-[13.5px] leading-6 text-dim">
            <span className="text-ink">{nomDuJeu(t.raceTo)}.</span> {regleDuJeu(t.raceTo)}
          </p>
          {t.rules ? (
            <details className="group">
              <summary className="cursor-pointer list-none text-[12.5px] text-gold-text [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">Lire le règlement complet →</span>
                <span className="hidden group-open:inline">Replier le règlement</span>
              </summary>
              <p className="mt-2 text-[13.5px] leading-6 whitespace-pre-line text-dim">{t.rules}</p>
            </details>
          ) : null}
        </Card>

        {/* Chacun peut faire venir ses amis : joueurs et public ont leur QR. */}
        <PartageTournoi titre={t.title} slug={t.slug} eventSlug={jumeau?.active ? jumeau.slug : null} />

        {aVenir.length > 0 || joues.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-[15px] font-semibold">Le programme</h2>
            <Programme aVenir={aVenir} joues={joues} />
          </section>
        ) : null}

        {/* Les duels que ce joueur arbitre : il en saisit le score d'ici. */}
        {aArbitrer.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-[15px] font-semibold">Tes duels à arbitrer</h2>
            <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-3">
              {aArbitrer.map((d) => (
                <div key={d.id} className="flex flex-col gap-1">
                  {d.tableLabel ? <span className="text-[11px] text-muted">Table {d.tableLabel}</span> : null}
                  <SaisieScore
                    duelId={d.id}
                    raceTo={d.raceTo}
                    nomA={noms.get(d.playerAId!)?.nom ?? "Joueur A"}
                    nomB={noms.get(d.playerBId!)?.nom ?? "Joueur B"}
                    scoreA={d.scoreA}
                    scoreB={d.scoreB}
                    termine={false}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <TableauEnDirect t={t} base="/app/tournois" />

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold">
              {t.status === "inscriptions" ? "Les candidatures" : "Les participants"}
            </h2>
            <span className="text-[12px] text-muted">
              {joueurs.filter((j) => j.player.status !== "retire").length} inscrit
              {joueurs.filter((j) => j.player.status !== "retire").length > 1 ? "s" : ""}
            </span>
          </div>

          {joueurs.length === 0 ? (
            <Card tone="dashed" shape="panel" className="px-5 py-8 text-center text-[13px] text-muted">
              Personne ne s&apos;est encore présenté. Sois le premier au tableau.
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {joueurs
                .filter((j) => j.player.status !== "retire")
                .map(({ player, user: joueur }) => (
                  <Link key={player.id} href={`/app/joueurs/${joueur.id}`} className="press block">
                  <Card shape="panel" className="flex items-center gap-3 px-3.5 py-3">
                    <span className="w-8 shrink-0 text-[12px] text-faint tabular-nums">
                      {player.seed ? `#${player.seed}` : "—"}
                    </span>
                    <span className="flex min-w-0 grow flex-col gap-0.5">
                      <span className="truncate text-[13.5px] font-semibold">
                        {player.nickname || joueur.name}
                      </span>
                      <span className="truncate text-[11.5px] text-muted">
                        {NIVEAUX[player.level] ?? player.level} · {joueur.points} points
                      </span>
                    </span>
                    <Chip
                      tone={player.status === "accepte" ? "solid" : "neutral"}
                      className="shrink-0 text-[10.5px]"
                    >
                      {CANDIDATURES[player.status] ?? player.status}
                    </Chip>
                  </Card>
                  </Link>
                ))}
            </div>
          )}
        </section>

        {t.entryFee > 0 ? (
          <p className="text-[12px] text-muted">
            Droit d&apos;inscription {fcfa(t.entryFee)} · réglé une fois la candidature retenue.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Fait({ valeur, quoi }: { valeur: string; quoi: string }) {
  return (
    <Card shape="panel" className="flex flex-col gap-0.5 px-3 py-3">
      <span className="text-[18px] leading-tight font-bold tracking-[-0.02em]">{valeur}</span>
      <span className="text-[11px] leading-tight text-muted">{quoi}</span>
    </Card>
  );
}
