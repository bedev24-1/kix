"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MomoCheckout, type Method } from "@/components/mb/MomoCheckout";
import { Sheet } from "@/components/ui/Sheet";
import { Spinner } from "@/components/ui/Spinner";
import { useSnackbar } from "@/components/ui/Snackbar";
import { CheckIcon, TicketIcon } from "@/components/icons";
import { buyTicket } from "@/lib/actions";
import { fcfa } from "@/lib/format";

export function TicketButton({
  eventId,
  eventTitle,
  price,
  phone,
  owned = false,
  terminee = false,
  libelle = "Billet d'entrée",
}: {
  eventId: string;
  eventTitle: string;
  price: number;
  phone: string;
  owned?: boolean;
  terminee?: boolean;
  /** « Billet spectateur » sur la soirée d'un tournoi : ce n'est pas la place d'un joueur. */
  libelle?: string;
}) {
  const { notify } = useSnackbar();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [taken, setTaken] = useState(owned);
  const [open, setOpen] = useState(false);

  /** Billet gratuit : pas de paiement, on l'émet tout de suite. */
  function takeFree() {
    startTransition(async () => {
      const result = await buyTicket(eventId);
      if (!result.ok) {
        notify("Billet indisponible", { detail: result.error, tone: "warn" });
        return;
      }
      setTaken(true);
      if (result.free) notify("Billet réservé", { detail: `Code d'entrée ${result.code}`, tone: "jade" });
      router.refresh();
    });
  }

  const start = async (phoneNumber: string, method: Method) => {
    const result = await buyTicket(eventId, phoneNumber, method);
    if (!result.ok) return result;
    if (result.free) return { ok: false as const, error: "Billet gratuit : aucun paiement nécessaire." };
    return { ok: true as const, reference: result.reference, instruction: result.instruction };
  };

  /** Payer à l'entrée : la place est gardée, le code part dans « Mes billets ». */
  function auGuichet() {
    startTransition(async () => {
      const result = await buyTicket(eventId, undefined, "guichet");
      if (!result.ok) {
        notify("Réservation impossible", { detail: result.error, tone: "warn" });
        return;
      }
      setOpen(false);
      setTaken(true);
      if (result.free) {
        notify("Place réservée", { detail: `À régler à l'entrée · code ${result.code}`, tone: "jade" });
      }
      router.push("/app/billets");
    });
  }

  function onPaid() {
    setOpen(false);
    setTaken(true);
    notify("Billet confirmé", { detail: `${eventTitle} · ${fcfa(price)}`, tone: "jade" });
    router.refresh();
  }

  // Une soirée close ne vend plus : le bouton le dit au lieu d'envoyer le
  // joueur payer une nuit déjà passée. Qui a son billet peut toujours le voir.
  const action = taken ? () => router.push("/app/billets") : price > 0 ? () => setOpen(true) : takeFree;
  const ferme = terminee && !taken;

  return (
    <>
      <div className="flex items-center gap-3.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-muted">{ferme ? "Billetterie close" : libelle}</span>
          <span className="text-xl font-bold tracking-[-0.03em]">{price > 0 ? fcfa(price) : "Gratuit"}</span>
        </div>
        <button
          onClick={action}
          disabled={pending || ferme}
          className={
            taken
              ? "pop press flex h-12 grow items-center justify-center gap-2 rounded-full border border-gold/45 bg-gold/15 text-sm font-semibold text-gold-text"
              : "press flex h-12 grow items-center justify-center gap-2 rounded-full bg-gold text-sm font-semibold text-gold-ink transition hover:brightness-105"
          }
        >
          {pending ? <Spinner size={17} /> : taken ? <CheckIcon size={18} /> : <TicketIcon size={18} />}
          {pending ? "Réservation…" : taken ? "Voir mon billet" : ferme ? "Soirée terminée" : "Prendre mon billet"}
        </button>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title={eventTitle}>
        <MomoCheckout
          amount={price}
          defaultPhone={phone}
          start={start}
          onPaid={onPaid}
          hint={`${libelle} · place gardée jusqu'au check-in`}
          label={`Payer mon billet · ${fcfa(price)}`}
        />
        <button
          onClick={auGuichet}
          disabled={pending}
          className="press mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-line text-[13px] font-semibold text-ink"
        >
          {pending ? <Spinner size={15} /> : null}
          Réserver et payer à l&apos;entrée
        </button>
      </Sheet>
    </>
  );
}
