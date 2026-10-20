"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { useCart } from "@/lib/cart";

/** Barre panier flottante, au-dessus de la barre d'onglets. */
export function CartBar() {
  const { count } = useCart();
  if (count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-20 mx-auto w-full max-w-[430px] px-5 lg:inset-x-auto lg:right-10 lg:bottom-8 lg:mx-0 lg:w-80 lg:px-0">
      <Link
        href="/app/panier"
        className="glass-strong press rise flex h-16 items-center gap-3 rounded-full border-gold/35 px-5 shadow-[0_18px_40px_-24px_rgba(217,180,80,0.8)]"
      >
        <span className="flex grow flex-col gap-0.5">
          <span className="text-[11px] text-muted">Panier</span>
          <span className="text-[15px] font-semibold">
            {count} article{count > 1 ? "s" : ""}
          </span>
        </span>
        <span className="flex h-11 items-center gap-1.5 rounded-full bg-gold px-4 text-sm font-semibold text-gold-ink">
          Voir
          <ArrowRightIcon size={16} />
        </span>
      </Link>
    </div>
  );
}
