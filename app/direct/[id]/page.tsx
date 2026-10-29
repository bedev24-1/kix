import { notFound } from "next/navigation";
import Link from "next/link";
import { WatchStream, type WatchGate } from "@/components/live/WatchStream";
import { Suivre } from "@/components/live/Suivre";
import { Photo } from "@/components/ui/Photo";
import { Card } from "@/components/ui/Card";
import { ChevronLeftIcon, PinIcon, UserIcon } from "@/components/icons";
import { computeStats, getMatch, getMatchEvents } from "@/lib/live";
import { accessLabel, canWatch, getStream, levelLabel, type StreamAccess, type StreamLevel } from "@/lib/stream";
import type { LiveState } from "@/components/live/MatchLive";
import { hoteDuDirect } from "@/lib/suivis";
import { requireUser } from "@/lib/session";
import { Commentaires } from "@/components/live/Commentaires";
import { derniersCommentaires, peutModerer } from "@/lib/commentaires";
import { etatBarre } from "@/lib/barre";
import type { EtatBarre } from "@/lib/barre-types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const card = await getStream((await params).id);
  return { title: card?.stream.title ?? "Direct" };
}

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const card = await getStream(id);
  if (!card) notFound();

  const access = await canWatch(user, card.stream);
  const gate: WatchGate = access.ok ? { open: true } : { open: false, reason: access.reason, price: access.price };

  // Qui tient la caméra. Un direct de salle n'a pas d'auteur à suivre ; celui
  // d'un joueur, si — et c'est lui qu'on vient revoir la semaine suivante.
  const hote = await hoteDuDirect(card.stream.createdBy, user.id);

  // Le direct peut être rattaché à un match : on prépare alors l'habillage.
  let match = null;
  if (card.stream.matchId) {
    const game = await getMatch(card.stream.matchId);
    if (game) {
      const events = await getMatchEvents(game.match.id);
      const initial: LiveState & { barre?: EtatBarre | null } = {
        id: game.match.id,
        status: game.match.status,
        scoreA: game.match.scoreA,
        scoreB: game.match.scoreB,
        target: game.match.target,
        turnId: game.match.turnId,
        winnerId: game.match.winnerId,
        stats: computeStats(game.match, events),
        events: [],
        // La Barre Master Break dès l'ouverture, avant le premier signal du direct.
        barre: await etatBarre(game.match.id),
      };
      match = {
        id: game.match.id,
        a: game.a.name,
        b: game.b.name,
        aId: game.a.id,
        bId: game.b.id,
        initial,
      };
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Link href="/direct" className="press flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
          <ChevronLeftIcon size={15} /> Tous les directs
        </Link>
        <span className="text-[12.5px] text-muted">{card.venue.name}</span>
      </div>

      <h1 className="text-[22px] lg:text-[26px]">{card.stream.title}</h1>

      {hote ? (
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/app/joueurs/${hote.id}`} className="press flex min-w-0 items-center gap-2.5">
            {hote.avatar ? (
              <Photo
                src={hote.avatar}
                alt={hote.name}
                width={38}
                height={38}
                className="h-9.5 w-9.5 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="grid h-9.5 w-9.5 shrink-0 place-items-center rounded-full bg-surface-2 text-[11px] font-semibold">
                {hote.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[13.5px] font-semibold">{hote.name}</span>
              <span className="text-[11.5px] text-muted">
                {hote.abonnes} abonné{hote.abonnes > 1 ? "s" : ""} · {hote.directs} direct
                {hote.directs > 1 ? "s" : ""}
              </span>
            </span>
          </Link>
          {hote.cestMoi ? null : (
            <Suivre hostId={hote.id} nom={hote.name} suivi={hote.suivi} abonnes={hote.abonnes} compact />
          )}
        </div>
      ) : null}

      <WatchStream
        streamId={card.stream.id}
        title={card.stream.title}
        gate={gate}
        phone={user.phone}
        live={card.stream.status === "live"}
        poster={card.venue.image}
        match={match}
      />

      {/* La conversation du direct : réservée à ceux qui peuvent le regarder. */}
      {access.ok ? (
        <Commentaires
          streamId={card.stream.id}
          initial={await derniersCommentaires(card.stream)}
          ouvert={card.stream.status === "live"}
          moderateur={peutModerer(user, card.stream)}
          moi={user.id}
        />
      ) : null}

      <Card shape="square" tone="dashed" className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3.5 text-[12px] text-muted">
        <span className="flex items-center gap-1.5">
          <PinIcon size={13} /> {card.venue.name}
        </span>
        <span>{levelLabel[card.stream.level as StreamLevel] ?? card.stream.level}</span>
        <span>{accessLabel[card.stream.access as StreamAccess] ?? card.stream.access}</span>
        {card.stream.status === "live" ? (
          <span className="flex items-center gap-1.5">
            <UserIcon size={13} /> {card.stream.viewers} spectateurs
          </span>
        ) : (
          <span>Pic de {card.stream.peakViewers} spectateurs</span>
        )}
      </Card>
    </div>
  );
}
