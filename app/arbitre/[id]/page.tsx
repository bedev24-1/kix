import Link from "next/link";
import { notFound } from "next/navigation";
import { ScoreConsole } from "@/components/live/ScoreConsole";
import { ChevronLeftIcon } from "@/components/icons";
import { canScore, computeStats, getMatch, getMatchEvents } from "@/lib/live";
import type { LiveState } from "@/components/live/MatchLive";
import { requireUser } from "@/lib/session";
import { etatInitial, lireEtat8 } from "@/lib/huit";

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

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Link href="/arbitre" className="press flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
          <ChevronLeftIcon size={15} /> Toutes les feuilles
        </Link>
        <Link href={`/app/live/${id}`} className="text-[12.5px] text-gold-text underline-offset-4 hover:underline">
          Voir la fiche publique
        </Link>
      </div>

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
    </>
  );
}
