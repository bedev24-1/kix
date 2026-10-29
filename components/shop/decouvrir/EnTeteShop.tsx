"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Photo } from "@/components/ui/Photo";
import { BellIcon, CartIcon } from "@/components/icons";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/cn";

type Phase = "jetons" | "fusion" | "piece" | "tourne" | "panier";

/**
 * L'en-tête du Shop.
 *
 * En arrivant de l'accueil, la pastille de jetons qu'on y voyait — « M 12 » —
 * se transforme : le M rejoint le nombre, les deux deviennent une pièce
 * d'or, la pièce fait un tour et, sur sa tranche, devient le panier.
 */
export function EnTeteShop({
  user,
  unread,
  solde,
  depuisAccueil,
}: {
  user: { name: string; avatar: string | null };
  unread: number;
  solde: number;
  depuisAccueil: boolean;
}) {
  const { count } = useCart();
  const [phase, setPhase] = useState<Phase>(depuisAccueil ? "jetons" : "panier");

  useEffect(() => {
    if (!depuisAccueil) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = window.setTimeout(() => setPhase("panier"), 0);
      return () => window.clearTimeout(t);
    }
    const suite: [Phase, number][] = [
      ["fusion", 250],
      ["piece", 520],
      ["tourne", 800],
      ["panier", 1080],
    ];
    const minuteurs = suite.map(([p, ms]) => window.setTimeout(() => setPhase(p), ms));
    return () => minuteurs.forEach((t) => window.clearTimeout(t));
  }, [depuisAccueil]);

  return (
    <header className="flex items-center gap-2.5 pt-1 lg:hidden">
      <h1 className="mr-auto text-[30px] font-extrabold tracking-[-0.03em] italic">Le Shop</h1>
      <Link
        href="/app/notifications"
        aria-label={unread > 0 ? `${unread} notifications non lues` : "Notifications"}
        className="press relative grid h-[38px] w-[38px] place-items-center"
      >
        <BellIcon size={20} />
        {unread > 0 ? <span className="absolute top-[7px] right-2 h-[7px] w-[7px] rounded-full border-[1.5px] border-bg bg-gold" /> : null}
      </Link>

      <Link href="/app/panier" aria-label={`Panier · ${count} article${count > 1 ? "s" : ""}`} className="press relative grid h-[38px] min-w-[38px] place-items-center">
        {phase === "panier" ? (
          <span className="relative grid h-[38px] w-[38px] place-items-center rounded-full border border-ink/14 bg-ink/6 [animation:mb-panier_.3s_ease-out]">
            <CartIcon size={19} />
            {count > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full border-2 border-bg bg-gold px-0.5 text-[9px] font-extrabold text-gold-ink">
                {count}
              </span>
            ) : null}
          </span>
        ) : phase === "jetons" || phase === "fusion" ? (
          <span
            className={cn(
              "flex h-9 items-center rounded-full border border-ink/14 bg-ink/6 text-[13px] font-extrabold transition-all duration-300",
              phase === "jetons" ? "gap-1.5 pr-[11px] pl-1.5" : "gap-0 px-1",
            )}
          >
            <span
              className={cn(
                "grid h-5 w-5 place-items-center rounded-full bg-gold text-[9.5px] font-extrabold text-gold-ink transition-transform duration-300",
                phase === "fusion" && "translate-x-2.5",
              )}
            >
              M
            </span>
            <span className={cn("transition-opacity duration-300", phase === "fusion" && "opacity-30")}>{solde}</span>
          </span>
        ) : (
          <span
            className="grid h-9 w-9 place-items-center rounded-full bg-linear-160 from-[#e9bf55] to-[#d9a935] text-[10px] font-extrabold text-gold-ink shadow-[inset_0_0_0_1.5px_rgba(26,20,5,.15)] transition-transform duration-300 ease-in"
            style={{ transform: phase === "tourne" ? "scaleX(.08)" : "scaleX(1)" }}
          >
            M{solde}
          </span>
        )}
      </Link>

      <Link href="/app/rewards" aria-label="Mon profil" className="press shrink-0">
        {user.avatar ? (
          <Photo src={user.avatar} alt={user.name} width={38} height={38} className="h-[38px] w-[38px] rounded-full border-[1.5px] border-ink/25 object-cover" />
        ) : (
          <span className="grid h-[38px] w-[38px] place-items-center rounded-full border-[1.5px] border-ink/25 bg-surface text-[12px] font-semibold">
            {user.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </Link>
    </header>
  );
}
