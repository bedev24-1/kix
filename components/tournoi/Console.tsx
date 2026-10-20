import Link from "next/link";
import { DecisionCandidat, EncaisserGuichet, EtatTournoi, SaisieScore } from "@/components/tournoi/Actions";
import { Bracket, type DuelView } from "@/components/tournoi/Bracket";
import { Poules } from "@/components/tournoi/Poules";
import { FormulaireTournoi } from "@/components/tournoi/Organisation";
import { PartageTournoi } from "@/components/tournoi/Partage";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ChevronLeftIcon } from "@/components/icons";
import { nomDuTour } from "@/lib/bracket";
import {
  duree,
  getBracket,
  getClassementDesPoules,
  getDuelsDePoule,
  getPlayers,
  nomsDuTableau,
  poulesTerminees,
  tourEnCours,
} from "@/lib/tournaments";
import { vuesDesDuelsDePoule, vuesDesPoules } from "@/lib/tournoi-vues";
import { CANDIDATURES, DISCIPLINES, ETATS, FORMATS, NIVEAUX } from "@/lib/tournois";
import { displayPhone } from "@/lib/phone";
import { f } from "@/lib/format";
import { db, events } from "@/db";
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
  const [joueurs, duels, poules, classements, finies, noms, jumeau] = await Promise.all([
    getPlayers(tournoi.id),
    getBracket(tournoi.id),
    enPoules ? getDuelsDePoule(tournoi.id) : Promise.resolve([]),
    enPoules ? getClassementDesPoules(tournoi.id) : Promise.resolve([]),
    enPoules ? poulesTerminees(tournoi.id) : Promise.resolve(false),
    nomsDuTableau(tournoi.id),
    tournoi.eventId
      ? db.select().from(events).where(eq(events.id, tournoi.eventId)).limit(1)
      : Promise.resolve([]),
  ]);

  const candidats = joueurs.filter((j) => j.player.status === "candidat");
  const retenus = joueurs.filter((j) => j.player.status === "accepte");
  const regles = retenus.filter((j) => j.player.fee === 0 || j.player.payment === "paye");
  const ecartes = joueurs.filter((j) => j.player.status === "refuse" || j.player.status === "retire");

  const tours = duels.length ? Math.max(...duels.map((d) => d.round)) : 0;
  const courant = duels.length ? tourEnCours(duels) : 0;

  // Les duels du tour en cours dont les deux joueurs sont connus : ce sont les
  // seuls sur lesquels un organisateur a quelque chose à saisir.
  // Les duels sur lesquels l'organisateur a quelque chose à saisir : ceux du
  // tour en cours sur le tableau, et tous ceux des poules qui restent.
  const duTableau = duels.filter((d) => d.round === courant && d.playerAId && d.playerBId && d.status !== "exempt");
  const dePoule = poules.filter((d) => d.status !== "termine" && d.playerAId && d.playerBId);
  const aJouer = [...(enPoules && !finies ? dePoule : duTableau)].sort(
    (a, b) => Number(a.status === "termine") - Number(b.status === "termine"),
  );

  const vues: DuelView[] = duels.map((d) => ({
    id: d.id,
    round: d.round,
    slot: d.slot,
    aId: d.playerAId,
    bId: d.playerBId,
    a: d.playerAId ? noms.get(d.playerAId) : undefined,
    b: d.playerBId ? noms.get(d.playerBId) : undefined,
    scoreA: d.scoreA,
    scoreB: d.scoreB,
    winnerId: d.winnerId,
    raceTo: d.raceTo,
    status: d.status,
  }));

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

      <PartageTournoi titre={tournoi.title} slug={tournoi.slug} eventSlug={jumeau[0]?.slug ?? null} />

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
            {enPoules && !finies ? "Duels de poule · à saisir" : `${nomDuTour(courant, tours)} · à saisir`}
          </h2>
          <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-3">
            {aJouer.map((d) => (
              <SaisieScore
                key={d.id}
                duelId={d.id}
                raceTo={d.raceTo}
                nomA={noms.get(d.playerAId!)?.nom ?? "Joueur A"}
                nomB={noms.get(d.playerBId!)?.nom ?? "Joueur B"}
                scoreA={d.scoreA}
                scoreB={d.scoreB}
                termine={d.status === "termine"}
              />
            ))}
          </div>
        </section>
      ) : null}

      {classements.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold">Les poules</h2>
          <Poules
            classements={vuesDesPoules(classements, noms, tournoi.qualifiers)}
            duels={vuesDesDuelsDePoule(poules, noms)}
            qualifiesParPoule={tournoi.qualifiers}
          />
        </section>
      ) : null}

      {vues.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold">
            {enPoules ? "Le tableau final" : "Le tableau"}
          </h2>
          <Bracket duels={vues} tours={tours} />
        </section>
      ) : null}

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
                    <span className="truncate text-[13.5px] font-semibold">
                      {player.nickname || user.name}
                    </span>
                    <span className="truncate text-[11.5px] text-muted">
                      {user.name} · {displayPhone(player.phone || user.phone)} ·{" "}
                      {NIVEAUX[player.level] ?? player.level} · {user.points} pts
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
