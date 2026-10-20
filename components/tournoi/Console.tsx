import Link from "next/link";
import { BadgeCertifie } from "@/components/ui/BadgeCertifie";
import {
  DecisionCandidat,
  DesignationDuel,
  EncaisserGuichet,
  EtatTournoi,
  GestionArbitres,
  Placement,
  SaisieScore,
} from "@/components/tournoi/Actions";
import { TableauEnDirect } from "@/components/tournoi/direct/TableauEnDirect";
import { FormulaireTournoi } from "@/components/tournoi/Organisation";
import { PartageTournoi } from "@/components/tournoi/Partage";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ChevronLeftIcon } from "@/components/icons";
import { nomDuTour } from "@/lib/bracket";
import { nomDuDuel } from "@/lib/double";
import {
  duree,
  getBracket,
  getDuelsDePoule,
  getPlayers,
  nomsDuTableau,
  poulesTerminees,
  tourEnCours,
} from "@/lib/tournaments";
import { nomDeLaPoule } from "@/lib/poules";
import { arbitresActifs } from "@/lib/profils-db";
import { CANDIDATURES, DISCIPLINES, ETATS, FORMATS, NIVEAUX } from "@/lib/tournois";
import { displayPhone } from "@/lib/phone";
import { f } from "@/lib/format";
import { db, events, matchOfficials, users } from "@/db";
import { eq } from "drizzle-orm";
import type { Tournament, Venue } from "@/db";

/**
 * La console d'un tournoi, côté organisateur.
 *
 * Trois choses au même endroit, dans l'ordre où l'on s'en sert : qui se
 * présente, comment on tire le tableau, et ce qui se passe sur les tables.
 * L'administration et les gérants voient exactement la même — seul le
 * périmètre change, et il est tenu par les actions, pas par l'affichage.
 */
export async function ConsoleTournoi({
  tournoi,
  venue,
  retour,
  salles,
}: {
  tournoi: Tournament;
  venue: Venue | null;
  retour: string;
  /** Fourni à l'administration seule : un gérant n'organise que chez lui. */
  salles?: { value: string; label: string }[];
}) {
  const enPoules = tournoi.format === "poules";
  const [joueurs, duels, poules, finies, noms, jumeau, arbitres] = await Promise.all([
    getPlayers(tournoi.id),
    getBracket(tournoi.id),
    enPoules ? getDuelsDePoule(tournoi.id) : Promise.resolve([]),
    enPoules ? poulesTerminees(tournoi.id) : Promise.resolve(false),
    nomsDuTableau(tournoi.id),
    tournoi.eventId
      ? db.select().from(events).where(eq(events.id, tournoi.eventId)).limit(1)
      : Promise.resolve([]),
    tournoi.eventId
      ? db
          .select({ id: users.id, nom: users.name })
          .from(matchOfficials)
          .innerJoin(users, eq(users.id, matchOfficials.userId))
          .where(eq(matchOfficials.eventId, tournoi.eventId))
      : Promise.resolve([] as { id: string; nom: string }[]),
  ]);

  const candidats = joueurs.filter((j) => j.player.status === "candidat");
  const retenus = joueurs.filter((j) => j.player.status === "accepte");
  const regles = retenus.filter((j) => j.player.fee === 0 || j.player.payment === "paye");
  const ecartes = joueurs.filter((j) => j.player.status === "refuse" || j.player.status === "retire");

  const principal = duels.filter((d) => d.stage === "tableau");
  const tours = principal.length ? Math.max(...principal.map((d) => d.round)) : 0;
  const double = duels.some((d) => d.stage === "perdants" || d.stage === "finale");
  const courant = duels.length ? tourEnCours(duels) : 0;

  // Les duels du tour en cours dont les deux joueurs sont connus : ce sont les
  // seuls sur lesquels un organisateur a quelque chose à saisir.
  // Les duels sur lesquels l'organisateur a quelque chose à saisir : ceux du
  // tour en cours sur le tableau, et tous ceux des poules qui restent.
  // En double élimination, les deux tableaux avancent en même temps : tout
  // duel dont les deux joueurs sont connus est à jouer.
  const duTableau = double
    ? duels.filter((d) => d.status === "attente" && d.playerAId && d.playerBId)
    : duels.filter((d) => d.round === courant && d.playerAId && d.playerBId && d.status !== "exempt");
  const dePoule = poules.filter((d) => d.status !== "termine" && d.playerAId && d.playerBId);
  const aJouer = [...(enPoules && !finies ? dePoule : duTableau)].sort(
    (a, b) => Number(a.status === "termine") - Number(b.status === "termine"),
  );

  // Où se trouve chaque joueur, pour le placement à la main : sa poule tant
  // que le tableau n'est pas ouvert, sa case sur l'arbre ensuite.
  const placeDe = (id: string, groupe: number | null, seed: number | null) => {
    if (duels.length) {
      const d = duels.find((x) => x.status !== "termine" && (x.playerAId === id || x.playerBId === id));
      return d ? `${nomDuDuel(d, tours, nomDuTour)} · duel ${d.slot + 1}` : "Éliminé ou exempté";
    }
    return groupe ? `Poule ${nomDeLaPoule(groupe)}` : seed ? `#${seed}` : "—";
  };
  const placables = retenus
    .filter((j) => j.player.seed !== null)
    .map((j) => ({ id: j.player.id, nom: j.player.nickname || j.user.name, place: placeDe(j.player.id, j.player.groupe, j.player.seed) }));

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link href={retour} className="press flex items-center gap-1.5 text-[12px] text-muted">
          <ChevronLeftIcon size={14} /> Tous les tournois
        </Link>
        <h1 className="text-xl lg:text-[26px]">{tournoi.title}</h1>
        <p className="text-[13px] text-muted">
          {DISCIPLINES[tournoi.discipline] ?? tournoi.discipline} · {FORMATS[tournoi.format] ?? tournoi.format}
          {enPoules ? ` · poules de ${tournoi.groupSize}, ${tournoi.qualifiers} qualifiés` : ` · ${tournoi.size} places`} ·{" "}
          {duree(tournoi)}
          {venue ? ` · ${venue.name}` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Chip tone={tournoi.status === "inscriptions" ? "solid" : "neutral"} className="text-[11px]">
            {ETATS[tournoi.status] ?? tournoi.status}
          </Chip>
          <EtatTournoi
            id={tournoi.id}
            status={tournoi.status}
            acceptes={regles.length}
            format={tournoi.format}
            poulesFinies={finies}
            tableauOuvert={duels.length > 0}
          />
        </div>

        <FormulaireTournoi
          salles={salles}
          tournoi={tournoi}
          jumeau={jumeau[0] ?? null}
          base={retour}
        />
      </header>

      <PartageTournoi titre={tournoi.title} slug={tournoi.slug} eventSlug={jumeau[0]?.slug ?? null} imprimable />

      {/* La promotion passe par l'événement jumeau : c'est lui que le public achète. */}
      {retour.startsWith("/gerant") && jumeau[0] ? (
        <Link
          href={`/gerant/evenements/${jumeau[0].id}#promouvoir`}
          className="press flex items-center justify-between gap-3 rounded-panel border border-gold/40 bg-gold/8 px-4 py-3.5"
        >
          <span className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold">Promouvoir ce tournoi</span>
            <span className="text-[12px] text-muted">Pop-up, à la une, sponsorisé, notification : avec ton affiche.</span>
          </span>
          <span className="shrink-0 text-[13px] font-semibold text-gold-text">Choisir →</span>
        </Link>
      ) : null}

      <div className="grid grid-cols-3 gap-2.5">
        <Chiffre valeur={String(candidats.length)} quoi="en attente" />
        <Chiffre valeur={`${regles.length}/${retenus.length}`} quoi="retenus réglés" />
        <Chiffre
          valeur={tournoi.prizePool > 0 ? f(tournoi.prizePool) : "—"}
          quoi="dotation"
        />
      </div>

      {tournoi.entryFee > 0 && regles.length < retenus.length ? (
        <Card tone="dashed" shape="panel" className="p-3.5 text-[12.5px] text-muted">
          {retenus.length - regles.length} joueur{retenus.length - regles.length > 1 ? "s" : ""} retenu
          {retenus.length - regles.length > 1 ? "s" : ""} n&apos;{retenus.length - regles.length > 1 ? "ont" : "a"} pas
          réglé son droit d&apos;inscription : il{retenus.length - regles.length > 1 ? "s" : ""} n&apos;
          {retenus.length - regles.length > 1 ? "entreront" : "entrera"} pas au tableau.
        </Card>
      ) : null}

      {aJouer.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold">
            {enPoules && !finies ? "Duels de poule · à saisir" : double ? "Phase finale · à saisir" : `${nomDuTour(courant, tours)} · à saisir`}
          </h2>
          <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-3">
            {aJouer.map((d) => (
              <div key={d.id} className="flex flex-col gap-1.5">
                <SaisieScore
                  duelId={d.id}
                  raceTo={d.raceTo}
                  nomA={noms.get(d.playerAId!)?.nom ?? "Joueur A"}
                  nomB={noms.get(d.playerBId!)?.nom ?? "Joueur B"}
                  scoreA={d.scoreA}
                  scoreB={d.scoreB}
                  termine={d.status === "termine"}
                />
                {d.status !== "termine" ? (
                  <DesignationDuel duelId={d.id} arbitres={arbitres} arbitreId={d.refereeId} table={d.tableLabel} />
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-semibold">Arbitres du tournoi</h2>
        <p className="text-[12px] text-muted">
          Choisis parmi les arbitres Master Break actifs, puis désigne-les duel par duel, avec la table.
          L&apos;arbitre d&apos;un duel en saisit le score depuis la page du tournoi.
        </p>
        <GestionArbitres
          tournamentId={tournoi.id}
          arbitres={arbitres}
          disponibles={(await arbitresActifs()).map((a) => ({ id: a.id, nom: a.nom, phone: displayPhone(a.phone) }))}
        />
      </section>

      {tournoi.status === "encours" && placables.length > 1 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold">Placer les joueurs</h2>
          <p className="text-[12px] text-muted">
            Deux joueurs échangent leur place — {duels.length ? "leur case sur l'arbre" : "leur poule"} et leurs duels
            — tant qu&apos;aucun des deux n&apos;a joué.
          </p>
          <Placement tournamentId={tournoi.id} joueurs={placables} />
        </section>
      ) : null}

      <TableauEnDirect t={tournoi} base={retour} lien={(o) => `${retour}/${o.id}`} />

      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-semibold">
          Candidatures {candidats.length > 0 ? `· ${candidats.length} à traiter` : ""}
        </h2>

        {joueurs.length === 0 ? (
          <Card tone="dashed" shape="panel" className="px-5 py-8 text-center text-[13px] text-muted">
            Personne ne s&apos;est encore présenté.
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {[...candidats, ...retenus, ...ecartes].map(({ player, user }) => (
              <Card key={player.id} shape="panel" className="flex flex-col gap-2.5 p-3.5">
                <div className="flex items-start gap-3">
                  <span className="w-7 shrink-0 pt-0.5 text-[12px] text-faint tabular-nums">
                    {player.seed ? `#${player.seed}` : "—"}
                  </span>
                  <span className="flex min-w-0 grow flex-col gap-0.5">
                    <span className="flex min-w-0 items-center gap-1 text-[13.5px] font-semibold">
                      <span className="truncate">{player.nickname || user.name}</span>
                      <BadgeCertifie motif={user.certifie} />
                    </span>
                    <span className="truncate text-[11.5px] text-muted">
                      {user.name} · {displayPhone(player.phone || user.phone)} ·{" "}
                      {NIVEAUX[player.level] ?? player.level} · {user.points} pts
                      {user.sexe ? ` · ${user.sexe === "femme" ? "Femme" : "Homme"}` : " · sexe non indiqué"}
                    </span>
                    {player.note ? (
                      <span className="text-[11.5px] text-dim text-pretty">{player.note}</span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <Chip
                      tone={player.status === "accepte" ? "solid" : "neutral"}
                      className="text-[10.5px]"
                    >
                      {CANDIDATURES[player.status] ?? player.status}
                    </Chip>
                    {player.fee > 0 ? (
                      <span
                        className={
                          player.payment === "paye"
                            ? "text-[10.5px] text-jade-text"
                            : "text-[10.5px] text-warn"
                        }
                      >
                        {player.payment === "paye"
                          ? `${f(player.fee)} réglés`
                          : player.payment === "guichet"
                            ? "paiera au guichet"
                            : "droit impayé"}
                      </span>
                    ) : null}
                    {player.fee > 0 && player.status === "accepte" && player.payment !== "paye" ? (
                      <EncaisserGuichet playerId={player.id} montant={f(player.fee)} />
                    ) : null}
                  </span>
                </div>

                {tournoi.status === "inscriptions" || tournoi.status === "complet" ? (
                  <DecisionCandidat playerId={player.id} status={player.status} />
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Chiffre({ valeur, quoi }: { valeur: string; quoi: string }) {
  return (
    <Card shape="panel" className="flex flex-col gap-0.5 px-3 py-3">
      <span className="text-[17px] leading-tight font-bold tracking-[-0.02em] tabular-nums">{valeur}</span>
      <span className="text-[11px] leading-tight text-muted">{quoi}</span>
    </Card>
  );
}
