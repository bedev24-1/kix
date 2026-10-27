import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, ne, or } from "drizzle-orm";
import { db, matches, tournamentPlayers, tournaments, users, venues } from "@/db";
import type { Tournament } from "@/db";
import { BadgeCertifie } from "@/components/ui/BadgeCertifie";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Photo } from "@/components/ui/Photo";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { DecisionCandidat, EncaisserGuichet } from "@/components/tournoi/Actions";
import { getPlayers } from "@/lib/tournaments";
import { CANDIDATURES, ETATS, NIVEAUX } from "@/lib/tournois";
import { niveauDe, nomDuNiveau } from "@/lib/niveaux";
import { displayPhone } from "@/lib/phone";
import { f } from "@/lib/format";

const jour = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";

/**
 * Le dossier complet d'un candidat : qui il est, ce qu'il a déclaré, ce qu'il
 * a déjà joué. De quoi décider d'une candidature sans appeler personne — et
 * passer au suivant d'un geste.
 */
export async function DossierCandidat({
  tournoi,
  playerId,
  base,
}: {
  tournoi: Tournament;
  playerId: string;
  /** La console du tournoi, ex. /admin/tournois/<id>. */
  base: string;
}) {
  const tous = await getPlayers(tournoi.id);
  const ordre = [
    ...tous.filter((j) => j.player.status === "candidat"),
    ...tous.filter((j) => j.player.status === "accepte"),
    ...tous.filter((j) => j.player.status === "refuse" || j.player.status === "retire"),
  ];
  const i = ordre.findIndex((j) => j.player.id === playerId);
  if (i < 0) notFound();
  const { player, user } = ordre[i];
  const avant = ordre[i - 1]?.player.id, apres = ordre[i + 1]?.player.id;

  const [salle, parcours, parties] = await Promise.all([
    user.venueId
      ? db.select({ name: venues.name }).from(venues).where(eq(venues.id, user.venueId)).limit(1).then((r) => r[0]?.name ?? null)
      : Promise.resolve(null),
    db
      .select({ p: tournamentPlayers, t: tournaments })
      .from(tournamentPlayers)
      .innerJoin(tournaments, eq(tournaments.id, tournamentPlayers.tournamentId))
      .where(and(eq(tournamentPlayers.userId, user.id), ne(tournamentPlayers.tournamentId, tournoi.id)))
      .orderBy(desc(tournaments.startsAt))
      .limit(12),
    db
      .select({ m: matches, salle: venues.name })
      .from(matches)
      .innerJoin(venues, eq(venues.id, matches.venueId))
      .where(and(eq(matches.status, "done"), or(eq(matches.playerAId, user.id), eq(matches.playerBId, user.id))))
      .orderBy(desc(matches.endedAt))
      .limit(50),
  ]);

  const gagnes = parties.filter((x) => x.m.winnerId === user.id).length;
  const perdus = parties.length - gagnes;
  const titres = parcours.filter((x) => x.t.winnerId === user.id).length;
  const retraits = parcours.filter((x) => x.p.status === "retire").length;
  const adversaires = await (async () => {
    const ids = [...new Set(parties.slice(0, 5).map((x) => (x.m.playerAId === user.id ? x.m.playerBId : x.m.playerAId)))];
    if (!ids.length) return new Map<string, string>();
    const rows = await db.select({ id: users.id, name: users.name }).from(users).where(or(...ids.map((id) => eq(users.id, id))));
    return new Map(rows.map((r) => [r.id, r.name]));
  })();
  const membre = user.memberUntil && new Date(user.memberUntil) > new Date();
  const tel = displayPhone(player.phone || user.phone);
  const telBrut = (player.phone || user.phone).replace(/[^\d+]/g, "");

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link href={base} className="press flex items-center gap-1.5 text-[12px] text-muted">
          <ChevronLeftIcon size={14} /> {tournoi.title}
        </Link>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] text-muted">Dossier {i + 1} sur {ordre.length}</span>
          <span className="flex gap-2">
            {avant ? <Link href={`${base}/candidats/${avant}`} className="press rounded-full border border-line px-3 py-1.5 text-[12px]"><ChevronLeftIcon size={13} className="inline" /> Précédent</Link> : null}
            {apres ? <Link href={`${base}/candidats/${apres}`} className="press rounded-full border border-line px-3 py-1.5 text-[12px]">Suivant <ChevronRightIcon size={13} className="inline" /></Link> : null}
          </span>
        </div>
      </header>

      <Card shape="panel" className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 text-xl font-semibold">
            {user.avatar ? <Photo src={user.avatar} alt="" width={64} height={64} className="h-16 w-16 object-cover" /> : user.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="flex min-w-0 grow flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[19px] font-bold">
              <span className="truncate">{player.nickname || user.name}</span>
              <BadgeCertifie motif={user.certifie} />
            </span>
            <span className="text-[12.5px] text-muted">{user.name} · code {user.code}</span>
          </span>
          <Chip tone={player.status === "accepte" ? "solid" : player.status === "candidat" ? "gold" : "neutral"}>
            {CANDIDATURES[player.status] ?? player.status}
          </Chip>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px] sm:grid-cols-3">
          <Info quoi="Téléphone" valeur={tel} />
          <Info quoi="Sexe" valeur={user.sexe ? (user.sexe === "femme" ? "Femme" : "Homme") : "Non indiqué"} alerte={!user.sexe} />
          <Info quoi="Niveau Master Break" valeur={`${nomDuNiveau(niveauDe(user.points))} · ${user.points} pts`} />
          <Info quoi="Niveau déclaré" valeur={NIVEAUX[player.level] ?? player.level} />
          <Info quoi="Salle habituelle" valeur={salle ?? "—"} />
          <Info quoi="Membre" valeur={membre ? `Oui, jusqu'au ${jour(user.memberUntil)}` : "Non"} />
          <Info quoi="Inscrit sur l'appli" valeur={jour(user.createdAt)} />
          <Info quoi="Candidature" valeur={jour(player.createdAt)} />
          <Info quoi="Place au tableau" valeur={player.seed ? `#${player.seed}${player.groupe ? ` · poule ${player.groupe}` : ""}` : "Pas encore tiré"} />
        </dl>

        {player.note ? (
          <div className="rounded-card bg-surface px-3.5 py-3 text-[13px]">
            <span className="text-[11px] text-muted">Son message</span>
            <p className="text-pretty">{player.note}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <a href={`tel:${telBrut}`} className="press rounded-full border border-line px-4 py-2 text-[12.5px]">Appeler</a>
          <a href={`https://wa.me/${telBrut.replace(/^\+/, "")}`} target="_blank" rel="noreferrer" className="press rounded-full border border-line px-4 py-2 text-[12.5px]">WhatsApp</a>
          <Link href={`/app/joueurs/${user.id}`} className="press rounded-full border border-line px-4 py-2 text-[12.5px]">Profil public</Link>
        </div>
      </Card>

      <Card shape="panel" className="flex flex-col gap-2.5 p-5">
        <h2 className="text-[15px] font-semibold">Droit d&apos;inscription</h2>
        {player.fee > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
            <span>
              {f(player.fee)} ·{" "}
              <span className={player.payment === "paye" ? "text-jade-text" : "text-warn"}>
                {player.payment === "paye" ? "réglé" : player.payment === "guichet" ? "réglera au guichet" : "impayé"}
              </span>
              {player.reference ? <span className="text-muted"> · réf. {player.reference}</span> : null}
            </span>
            {player.status === "accepte" && player.payment !== "paye" ? <EncaisserGuichet playerId={player.id} montant={f(player.fee)} /> : null}
          </div>
        ) : (
          <p className="text-[13px] text-muted">Tournoi sans droit d&apos;inscription.</p>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Chiffre valeur={String(parcours.length)} quoi="autres tournois" />
        <Chiffre valeur={String(titres)} quoi="titres" />
        <Chiffre valeur={parties.length ? `${gagnes}–${perdus}` : "—"} quoi="parties gagnées–perdues" />
        <Chiffre valeur={String(retraits)} quoi="retraits" alerte={retraits > 0} />
      </div>

      <Card shape="panel" className="flex flex-col gap-2 p-5">
        <h2 className="text-[15px] font-semibold">Ses tournois</h2>
        {parcours.length === 0 ? (
          <p className="text-[13px] text-muted">Premier tournoi sur Master Break.</p>
        ) : (
          parcours.map(({ p, t }) => (
            <div key={p.id} className="flex items-center justify-between gap-3 border-b border-line py-2 text-[13px] last:border-0">
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">{t.title}</span>
                <span className="text-[11.5px] text-muted">{jour(t.startsAt)} · {ETATS[t.status] ?? t.status}</span>
              </span>
              <span className="shrink-0 text-[12px] text-muted">
                {t.winnerId === user.id ? "🏆 vainqueur" : p.reachedRound > 0 ? `tour ${p.reachedRound}` : CANDIDATURES[p.status] ?? p.status}
              </span>
            </div>
          ))
        )}
      </Card>

      <Card shape="panel" className="flex flex-col gap-2 p-5">
        <h2 className="text-[15px] font-semibold">Dernières parties</h2>
        {parties.length === 0 ? (
          <p className="text-[13px] text-muted">Aucune partie enregistrée.</p>
        ) : (
          parties.slice(0, 5).map(({ m, salle: s }) => {
            const lui = m.playerAId === user.id;
            const adv = adversaires.get(lui ? m.playerBId : m.playerAId) ?? "—";
            return (
              <div key={m.id} className="flex items-center justify-between gap-3 border-b border-line py-2 text-[13px] last:border-0">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">contre <b>{adv}</b></span>
                  <span className="text-[11.5px] text-muted">{s} · {m.kind} · {jour(m.endedAt)}</span>
                </span>
                <span className={m.winnerId === user.id ? "font-semibold text-jade-text" : "text-muted"}>
                  {lui ? `${m.scoreA}–${m.scoreB}` : `${m.scoreB}–${m.scoreA}`}
                </span>
              </div>
            );
          })
        )}
      </Card>

      {tournoi.status === "inscriptions" || tournoi.status === "complet" ? (
        <Card shape="panel" className="flex flex-col gap-2 p-5">
          <h2 className="text-[15px] font-semibold">Décision</h2>
          <DecisionCandidat playerId={player.id} status={player.status} />
        </Card>
      ) : null}
    </div>
  );
}

function Info({ quoi, valeur, alerte }: { quoi: string; valeur: string; alerte?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] text-muted">{quoi}</dt>
      <dd className={alerte ? "text-warn" : ""}>{valeur}</dd>
    </div>
  );
}

function Chiffre({ valeur, quoi, alerte }: { valeur: string; quoi: string; alerte?: boolean }) {
  return (
    <Card shape="panel" className="flex flex-col gap-0.5 px-3 py-3">
      <span className={`text-[17px] leading-tight font-bold tabular-nums ${alerte ? "text-warn" : ""}`}>{valeur}</span>
      <span className="text-[11px] leading-tight text-muted">{quoi}</span>
    </Card>
  );
}
