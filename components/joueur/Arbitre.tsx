"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";
import { Spinner } from "@/components/ui/Spinner";
import { useSnackbar } from "@/components/ui/Snackbar";
import { CheckIcon, UserIcon } from "@/components/icons";
import { confierLaFeuille } from "@/lib/actions";

/**
 * Confier la feuille de match.
 *
 * Dans un défi, chacun des deux joueurs peut arbitrer lui-même, depuis son
 * téléphone, entre deux coups. Ou ils désignent un tiers — un ami, un
 * habitué — qui tient la feuille comme un arbitre de salle.
 */
export function Arbitre({
  matchId,
  amis,
  arbitres,
}: {
  matchId: string;
  amis: { id: string; name: string; avatar: string | null }[];
  arbitres: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { notify } = useSnackbar();
  const [ouvert, setOuvert] = useState(false);
  const [pending, start] = useTransition();

  function confier(userId: string, nom: string) {
    start(async () => {
      const res = await confierLaFeuille(matchId, userId);
      if (!res.ok) {
        notify("Impossible", { detail: res.error, tone: "warn" });
        return;
      }
      setOuvert(false);
      notify(`${nom} tient la feuille`, { detail: "Il peut marquer depuis son téléphone.", tone: "jade" });
      router.refresh();
    });
  }

  return (
    <>
      <Card shape="panel" className="flex flex-col gap-3 p-4">
        <span className="flex items-center gap-2 text-[13.5px] font-semibold">
          <UserIcon size={16} /> La feuille de match
        </span>

        {arbitres.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {arbitres.map((a) => (
              <span
                key={a.id}
                className="flex items-center gap-1.5 rounded-full border border-jade/40 bg-jade/12 px-3 py-1 text-[12px] text-jade-text"
              >
                <CheckIcon size={13} /> {a.name}
              </span>
            ))}
            <Link href={`/arbitre/${matchId}`} className="press text-[12px] text-gold-text">
              Ouvrir la feuille →
            </Link>
          </div>
        ) : (
          <p className="text-[12px] text-muted">
            Arbitre toi-même depuis ton téléphone, ou confie la feuille à quelqu&apos;un qui marquera pendant que
            vous jouez. Chaque coup noté porte le nom de celui qui l&apos;a saisi.
          </p>
        )}

        <Link
          href={`/arbitre/${matchId}`}
          className="press grid h-11 place-items-center rounded-full bg-gold text-[13px] font-semibold text-gold-ink"
        >
          Arbitrer moi-même
        </Link>

        <button
          onClick={() => setOuvert(true)}
          className="press h-11 rounded-full border border-line text-[12.5px] text-dim transition hover:text-ink"
        >
          Confier la feuille à quelqu&apos;un
        </button>
      </Card>

      <Sheet open={ouvert} onClose={() => setOuvert(false)} title="Qui tient la feuille ?">
        <div className="flex flex-col gap-2">
          {amis.length === 0 ? (
            <p className="text-[12.5px] text-muted">
              Ajoute d&apos;abord un ami : c&apos;est parmi eux qu&apos;on choisit son arbitre.
            </p>
          ) : null}
          {amis.map((a) => (
            <button
              key={a.id}
              onClick={() => confier(a.id, a.name)}
              disabled={pending}
              className="press flex h-12 items-center justify-between gap-3 rounded-panel border border-line px-4 text-[13.5px] transition hover:bg-surface-2 disabled:opacity-60"
            >
              {a.name}
              {pending ? <Spinner size={14} /> : <UserIcon size={15} className="text-muted" />}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
