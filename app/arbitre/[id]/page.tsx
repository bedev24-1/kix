import Link from "next/link";
import { notFound } from "next/navigation";
import { ScoreConsole } from "@/components/live/ScoreConsole";
import { ChevronLeftIcon } from "@/components/icons";
import { canScore, computeStats, getMatch, getMatchEvents } from "@/lib/live";
import type { LiveState } from "@/components/live/MatchLive";
import { requireUser } from "@/lib/session";
import { etatInitial, lireEtat8 } from "@/lib/huit";
import { and, eq, isNull, ne, or } from "drizzle-orm";
import { db, streams } from "@/db";
import { etatBarre, directDuMatch } from "@/lib/barre";
import { ingest } from "@/lib/stream";
import { urlPublique } from "@/lib/url-publique";
import { peutDiffuser } from "@/lib/niveaux";
import { FeuillePro } from "@/components/arbitre/FeuillePro";
import type { DiffusionVue } from "@/components/arbitre/PanneauDiffusion";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const card = await getMatch((await params).id);
  return { title: card ? `Feuille · ${card.a.name} – ${card.b.name}` : "Feuille de match" };
}

export default async function ArbitreMatch({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const card = await getMatch(id);
  if (!card) notFound();

  const [events, right] = await Promise.all([getMatchEvents(id), canScore(user, card.match)]);

  const initial: LiveState = {
    id: card.match.id,
    status: card.match.status,
    scoreA: card.match.scoreA,
    scoreB: card.match.scoreB,
    target: card.match.target,
    turnId: card.match.turnId,
    winnerId: card.match.winnerId,
    stats: computeStats(card.match, events),
    events: events.slice(0, 40).map((e) => ({
      id: e.id,
      kind: e.kind,
      playerId: e.playerId,
      detail: e.detail,
      scoreA: e.scoreA,
      scoreB: e.scoreB,
      at: e.createdAt.toISOString(),
    })),
  };

  const entete = (
    <div className="flex items-center justify-between gap-3">
      <Link href="/arbitre" className="press flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
        <ChevronLeftIcon size={15} /> Toutes les feuilles
      </Link>
      <Link href={`/app/live/${id}`} className="text-[12.5px] text-gold-text underline-offset-4 hover:underline">
        Voir la fiche publique
      </Link>
    </div>
  );

  // Le billard américain se suit coup par coup, sur la feuille pro.
  if (card.match.kind === "8-ball") {
    const [barre, direct] = await Promise.all([etatBarre(id), directDuMatch(id)]);
    const comptoir = user.role === "admin" || (user.role === "manager" && user.venueId === card.match.venueId);
    const peut = comptoir || (right.ok && peutDiffuser(user.points));
    const gerable = Boolean(direct && (comptoir || direct.createdBy === user.id));
    const candidats = peut && !direct
      ? await db
          .select({ id: streams.id, titre: streams.title, status: streams.status, createdBy: streams.createdBy })
          .from(streams)
          .where(and(eq(streams.venueId, card.match.venueId), ne(streams.status, "ended"), or(isNull(streams.matchId), ne(streams.matchId, id))))
      : [];
    const diffusion: DiffusionVue = {
      peut,
      direct: direct
        ? {
            id: direct.id,
            titre: direct.title,
            status: direct.status,
            viewers: direct.viewers,
            sponsor: direct.sponsor,
            barreVideo: direct.barreVideo,
            gerable,
            ingest: gerable ? ingest(direct) : null,
          }
        : null,
      candidats: candidats.filter((c) => comptoir || c.createdBy === user.id).map(({ id: cid, titre, status }) => ({ id: cid, titre, status })),
      incrustation: `${await urlPublique()}/incrustation/${id}`,
    };
    return (
      <>
        {entete}
        <FeuillePro
          matchId={id}
          a={{ id: card.a.id, name: card.a.name, avatar: card.a.avatar }}
          b={{ id: card.b.id, name: card.b.name, avatar: card.b.avatar }}
          barre={barre!}
          etat={lireEtat8(card.match.etat8, etatInitial(card.match.turnId === card.match.playerBId ? "B" : "A"))}
          annulable={((card.match.etat8 as { pile?: unknown[] } | null)?.pile?.length ?? 0) > 0}
          can={right.ok}
          raison={right.ok ? undefined : right.reason}
          diffusion={diffusion}
        />
        <p className="text-center text-[11.5px] text-muted">
          Chaque geste est horodaté à ton nom : la feuille reste opposable en cas de litige.
        </p>
      </>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      {entete}


      <ScoreConsole
        initial={initial}
        a={{ id: card.a.id, name: card.a.name, avatar: card.a.avatar }}
        b={{ id: card.b.id, name: card.b.name, avatar: card.b.avatar }}
        label={card.match.label}
        venue={card.venue.name}
        table={card.table}
        can={right.ok}
        huit={
          card.match.kind === "8-ball"
            ? {
                etat: lireEtat8(card.match.etat8, etatInitial(card.match.turnId === card.match.playerBId ? "B" : "A")),
                annulable: ((card.match.etat8 as { pile?: unknown[] } | null)?.pile?.length ?? 0) > 0,
              }
            : null
        }
      />

      {!right.ok ? (
        <p className="text-center text-[12px] text-muted">{right.reason}</p>
      ) : (
        <p className="text-center text-[11.5px] text-muted">
          Chaque geste est horodaté à ton nom : la feuille reste opposable en cas de litige.
        </p>
      )}
    </div>
  );
}
