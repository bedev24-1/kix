"use client";

import { useState, useTransition } from "react";
import { useSnackbar } from "@/components/ui/Snackbar";
import { Spinner } from "@/components/ui/Spinner";
import { cancelReservation } from "@/lib/actions";

/**
 * Annulation en deux temps : l'acompte reste acquis à la salle, ce n'est pas un
 * geste qu'on fait par mégarde.
 */
export function CancelReservation({ id, acompte = 0 }: { id: string; acompte?: number }) {
  const { notify } = useSnackbar();
  const [sure, setSure] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!sure) {
    return (
      <button
        onClick={() => setSure(true)}
        className="press self-start text-[12px] text-muted underline-offset-4 transition hover:text-warn hover:underline"
      >
        Annuler cette réservation
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-none border border-warn/40 bg-warn/10 px-3.5 py-3">
      <span className="grow text-[12px] text-warn">{acompte > 0 ? "L’acompte reste acquis à la salle. On annule ?" : "La table sera rendue à la salle. On annule ?"}</span>
      <button
        onClick={() => setSure(false)}
        className="press h-9 rounded-full border border-line px-3.5 text-[12px] text-dim hover:text-ink"
      >
        Garder
      </button>
      <button
        onClick={() =>
          startTransition(async () => {
            await cancelReservation(id);
            notify("Réservation annulée", { tone: "warn" });
          })
        }
        disabled={pending}
        className="press flex h-9 items-center gap-1.5 rounded-full bg-warn px-3.5 text-[12px] font-semibold text-bg disabled:opacity-50"
      >
        {pending ? <Spinner size={13} /> : null}
        Annuler
      </button>
    </div>
  );
}
