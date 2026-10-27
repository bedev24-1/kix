"use client";

import { Photo } from "@/components/ui/Photo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MomoCheckout, type Method } from "@/components/mb/MomoCheckout";
import { Card } from "@/components/ui/Card";
import { useSnackbar } from "@/components/ui/Snackbar";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { startPackPurchase } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { f, fcfa } from "@/lib/format";
import type { Pack, Venue } from "@/db";

export function RechargeForm({ packs, venues, phone }: { packs: Pack[]; venues: Venue[]; phone: string }) {
  const { notify } = useSnackbar();
  const router = useRouter();
  const [pack, setPack] = useState<Pack>(packs.find((p) => p.badge) ?? packs[0]);
  const [venue, setVenue] = useState<Venue>(venues[0]);
  const [method, setMethod] = useState<Method>("momo");
  const [done, setDone] = useState(false);

  const credited = pack.tokens + pack.bonus;

  const start = async (phoneNumber: string, chosen: Method) => {
    setMethod(chosen);
    return startPackPurchase(pack.id, venue.id, chosen, phoneNumber);
  };

  function onPaid() {
    setDone(true);
    notify(`${credited} jetons crédités`, { detail: `${fcfa(pack.price)} · ${venue.name}` });
    router.refresh();
  }

  if (done) {
    return (
      <Card tone="gold" shape="panel" className="mt-4 flex flex-col items-center gap-4 px-5 py-9 text-center lg:mx-auto lg:max-w-xl lg:py-14">
        <span className="pop grid h-16 w-16 place-items-center rounded-full bg-gold text-gold-ink shadow-[0_0_50px_rgba(217,180,80,0.45)]">
          <CheckIcon size={30} />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[22px]">{credited} jetons crédités</h2>
          <p className="text-[13px] text-dim">
            Payé {fcfa(pack.price)} par {method === "om" ? "Orange Money" : "MTN MoMo"} · {venue.name}
          </p>
        </div>
        <Link
          href="/app/pass"
          className="flex h-12 items-center gap-2 rounded-full bg-gold px-5 text-sm font-semibold text-gold-ink"
        >
          Ouvrir mon Master Pass
          <ArrowRightIcon size={16} />
        </Link>
      </Card>
    );
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3.5 lg:grid-cols-2 lg:items-start lg:gap-8">
      <div className="flex min-w-0 flex-col gap-3.5 lg:gap-6">
      <div className="flex flex-col gap-2.5">
        <h2 className="text-base">Où joues-tu ce soir ?</h2>
        <div className="-mx-5 flex md:-mx-7 gap-2.5 overflow-x-auto px-5 md:px-7 pb-1 lg:mx-0 lg:grid lg:grid-cols-2 lg:px-0">
          {venues.map((v) => (
            <button
              key={v.id}
              onClick={() => setVenue(v)}
              className={cn(
                "press flex w-52 shrink-0 items-center gap-2.5 rounded-card p-2.5 text-left transition lg:w-full lg:shrink",
                v.id === venue.id ? "glass-gold border-[1.5px] border-gold" : "glass hover:bg-surface-2",
              )}
            >
              <Photo
                src={v.image}
                alt={v.name}
                width={44}
                height={44}
                className="h-11 w-11 rounded-full object-cover"
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] font-semibold">{v.name}</span>
                <span className="text-[11px] text-muted">Jeton {f(v.tokenPrice)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <h2 className="text-base">Choisis ton pack</h2>
        {packs.map((p) => {
          const active = p.id === pack.id;
          return (
            <button
              key={p.id}
              onClick={() => setPack(p)}
              className={cn(
                "press relative flex items-center gap-3.5 rounded-card px-4 py-3.5 text-left transition",
                active
                  ? "glass-gold border-[1.5px] border-gold shadow-[0_0_26px_rgba(217,180,80,0.16)]"
                  : "glass hover:bg-surface-2",
              )}
            >
              <span
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full",
                  active ? "bg-gold text-gold-ink" : "border-[1.6px] border-line-strong",
                )}
              >
                {active ? <CheckIcon size={12} /> : null}
              </span>
              <span className="flex grow flex-col gap-0.5">
                <span className="text-[15px] font-semibold">
                  {p.tokens === 1 ? "1 jeton" : `Pack ${p.tokens} jetons`}
                </span>
                <span className={cn("text-xs", p.bonus > 0 ? "text-jade-text" : "text-muted")}>
                  {p.bonus > 0 ? `+ ${p.bonus} jetons offerts` : p.hint}
                </span>
              </span>
              <span className={cn("text-[17px] font-bold", active && "text-gold-text")}>{f(p.price)}</span>
              {p.badge ? (
                <span className="absolute -top-2 right-3.5 rounded-full bg-gold px-2.5 py-0.5 text-[9px] font-semibold tracking-[0.08em] text-gold-ink uppercase">
                  {p.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      </div>

      <div className="flex min-w-0 flex-col gap-3.5 lg:sticky lg:top-8 lg:gap-6">
      <MomoCheckout
        amount={pack.price}
        defaultPhone={phone}
        start={start}
        onPaid={onPaid}
        hint={`${credited} jetons · ${venue.name}`}
      />
      </div>
    </div>
  );
}
