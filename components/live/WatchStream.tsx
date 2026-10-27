"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MomoCheckout, type Method } from "@/components/mb/MomoCheckout";
import { StreamPlayer, type Overlay } from "@/components/live/StreamPlayer";
import { Card } from "@/components/ui/Card";
import { useSnackbar } from "@/components/ui/Snackbar";
import { ArrowRightIcon, BoltIcon, LockIcon } from "@/components/icons";
import { buyStreamPass } from "@/lib/actions";
import { useLive } from "@/lib/useLive";
import { fcfa } from "@/lib/format";
import type { LiveState } from "@/components/live/MatchLive";
import type { EtatBarre } from "@/lib/barre-types";
import { CarteMatch } from "@/components/live/barre/CarteMatch";
import { resteChrono, useHorloge } from "@/components/live/barre/useHorloge";

export type WatchGate = { open: true } | { open: false; reason: "members" | "ppv"; price: number };

/**
 * L'écran de visionnage. Quand le direct est rattaché à un match, l'habillage
 * du lecteur suit le flux de la feuille de match : la vidéo et le score
 * viennent de deux sources, mais le spectateur n'en voit qu'une.
 */
export function WatchStream({
  streamId,
  title,
  gate,
  phone,
  live,
  poster,
  match,
}: {
  streamId: string;
  title: string;
  gate: WatchGate;
  phone: string;
  live: boolean;
  poster?: string;
  match: { id: string; a: string; b: string; aId: string; bId: string; initial: LiveState & { barre?: EtatBarre | null } } | null;
}) {
  const { notify } = useSnackbar();
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(gate.open);

  if (!unlocked && !gate.open) {
    return (
      <Locked
        streamId={streamId}
        title={title}
        reason={gate.reason}
        price={gate.price}
        phone={phone}
        onPaid={() => {
          setUnlocked(true);
          notify("Billet vidéo confirmé", { tone: "jade" });
          router.refresh();
        }}
      />
    );
  }

  return match ? (
    <PlayerWithScore streamId={streamId} title={title} live={live} poster={poster} match={match} />
  ) : (
    <StreamPlayer streamId={streamId} title={title} overlay={null} live={live} poster={poster} />
  );
}

/** Le score de l'habillage vient du même flux SSE que la fiche du match. */
function PlayerWithScore({
  streamId,
  title,
  live,
  poster,
  match,
}: {
  streamId: string;
  title: string;
  live: boolean;
  poster?: string;
  match: { id: string; a: string; b: string; aId: string; bId: string; initial: LiveState & { barre?: EtatBarre | null } };
}) {
  const { data, recu } = useLive<LiveState & { barre?: EtatBarre | null }>(`/api/live/${match.id}`, match.initial);
  const barre = data.barre ?? null;
  const horloge = useHorloge(Boolean(barre?.chrono?.fin));
  const reste = barre ? resteChrono(barre.chrono, horloge, barre.maintenant, recu) : null;

  const overlay: Overlay = {
    a: match.a,
    b: match.b,
    aId: match.aId,
    bId: match.bId,
    scoreA: data.scoreA,
    scoreB: data.scoreB,
    target: data.target,
    turnId: data.turnId,
  };

  return (
    <div className="flex flex-col gap-3">
      <StreamPlayer streamId={streamId} title={title} overlay={overlay} live={live} poster={poster} barre={barre ? { etat: barre, reste } : null} />
      {barre ? <CarteMatch etat={barre} /> : null}
      <Link
        href={`/app/live/${match.id}`}
        className="glass press go flex items-center gap-3 rounded-card px-4 py-3 text-[13px] transition hover:bg-surface-2"
      >
        <span className="grow">Statistiques et déroulé du match</span>
        <ArrowRightIcon size={15} className="text-muted" />
      </Link>
    </div>
  );
}

function Locked({
  streamId,
  title,
  reason,
  price,
  phone,
  onPaid,
}: {
  streamId: string;
  title: string;
  reason: "members" | "ppv";
  price: number;
  phone: string;
  onPaid: () => void;
}) {
  const start = async (phoneNumber: string, method: Method) => {
    const result = await buyStreamPass(streamId, phoneNumber, method);
    if (!result.ok) return result;
    return { ok: true as const, reference: result.reference, instruction: result.instruction };
  };

  return (
    <Card shape="panel" className="flex flex-col gap-5 p-5">
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-card bg-black/70">
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-gold/15 text-gold-text">
            <LockIcon size={24} />
          </span>
          <p className="text-[14px] font-semibold text-white">{title}</p>
          <p className="max-w-sm text-[12.5px] text-white/60">
            {reason === "members"
              ? "Ce direct est réservé aux abonnés Master Break."
              : "Ce direct se regarde avec un billet vidéo."}
          </p>
        </div>
      </div>

      {reason === "ppv" ? (
        <MomoCheckout
          amount={price}
          defaultPhone={phone}
          start={start}
          onPaid={onPaid}
          hint="Billet vidéo · valable pour ce direct et sa rediffusion"
          label={`Prendre mon billet · ${fcfa(price)}`}
        />
      ) : (
        <Link
          href="/app/abonnement"
          className="press flex h-12 items-center justify-center gap-2 rounded-full bg-gold text-sm font-semibold text-gold-ink transition hover:brightness-105"
        >
          <BoltIcon size={18} />
          Voir l&apos;abonnement Master Break
        </Link>
      )}
    </Card>
  );
}
