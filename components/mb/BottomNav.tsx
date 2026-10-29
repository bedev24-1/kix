"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { BoltIcon, CartIcon, HomeIcon, MasterMark, QrIcon, UserIcon } from "@/components/icons";
import { useCart } from "@/lib/cart";
import { noterDepart, poserBarre, useBarre } from "@/lib/barre-nav";

/**
 * Cinq places, pour cinq intentions.
 *
 * « Direct » n'y figurait pas : la barre latérale l'avait, mais elle est
 * masquée sous le format bureau — sur un téléphone, la section des matchs
 * filmés était donc inatteignable autrement qu'en tapant l'adresse. C'est la
 * vitrine de la plateforme, elle passe devant.
 *
 * Les salles, les événements et les scores se rejoignent depuis l'accueil,
 * qui porte une rangée de raccourcis : rien n'est à plus d'une touche.
 */
const left = [
  { href: "/app", label: "Accueil", Icon: HomeIcon },
  { href: "/direct", label: "Direct", Icon: BoltIcon },
];
const right = [
  { href: "/app/shop", label: "Shop", Icon: CartIcon },
  { href: "/app/rewards", label: "Profil", Icon: UserIcon },
];
const ONGLETS = [...left, ...right];
/** Où se pose la pastille sous chaque onglet : 8 px de marge, cases de 46 px, QR de 52, écarts de 6. */
const POSES = [8, 60, 170, 222];

/** Une fiche produit : la barre s'y efface au profit du tiroir d'achat et de sa bulle. */
export const estFicheProduit = (chemin: string) => /^\/app\/shop\/[^/]+$/.test(chemin);

export function BottomNav() {
  const pathname = usePathname();
  const { count } = useCart();
  // L'onglet visé se marque dès le toucher, sans attendre que la page
  // suivante arrive : la pastille part tout de suite.
  const [vise, setVise] = useState<string | null>(null);
  const [cheminVu, setCheminVu] = useState(pathname);
  if (cheminVu !== pathname) {
    setCheminVu(pathname);
    setVise(null);
  }
  const isActive = (href: string) =>
    vise ? vise === href : href === "/app" ? pathname === "/app" : pathname.startsWith(href);
  const rang = ONGLETS.findIndex((o) => isActive(o.href));
  // Sur une fiche, la barre se resserre et file vers la droite, où elle
  // devient la bulle posée sur le tiroir (components/shop/fiche) : le bouton
  // QR rentre dans la barre, la barre rétrécit, puis disparaît.
  const repliee = estFicheProduit(pathname);
  // L'écran immersif du Shop met la barre en scène : elle se rassemble en un
  // point au bout à droite, puis ce point monte se poser à côté du bouton
  // d'or. Le retour se fait plus vite que l'aller.
  const scene = useBarre();
  const bulle = scene !== "normale";
  const viser = (href: string) => {
    noterDepart(pathname);
    setVise(href);
  };

  return (
    <nav
      aria-hidden={repliee || undefined}
      inert={repliee}
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-[430px] justify-center px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:max-w-[34rem] lg:hidden"
    >
      {/* Une pastille flottante en verre sombre, icônes seules : l'onglet
          actif dans un rond ivoire, le QR en or, posé dans la barre. Elle
          reste sombre sur toutes les pages, claires comme sombres. */}
      <div
        className={cn(
          "relative flex h-[60px] w-[276px] origin-[92%_50%] items-center gap-1.5 overflow-hidden rounded-[32px] border border-[#f3eee2]/10 bg-[#0a1e16]/80 px-2 shadow-[0_10px_30px_rgba(0,0,0,.45)] backdrop-blur-[16px] transition-all duration-[350ms] ease-[cubic-bezier(.2,.7,.3,1)] motion-reduce:transition-none",
          repliee && "pointer-events-none translate-y-3 scale-x-[.16] scale-y-[.66] opacity-0",
          bulle && "gap-0 border-gold/70 px-0 ease-[cubic-bezier(.45,0,.25,1)]",
        )}
        style={
          bulle
            ? {
                width: 52,
                height: 52,
                translate: `calc((min(100vw, 430px) - 40px - 52px) / 2) ${scene === "montee" ? "-74px" : "0px"}`,
                transitionDuration: scene === "montee" ? "1100ms" : "900ms",
              }
            : undefined
        }
      >
        {bulle ? (
          <button
            type="button"
            onClick={() => poserBarre("normale")}
            aria-label="Rouvrir le menu"
            className="absolute inset-0 z-20 grid place-items-center [animation:mb-apparait_.5s_.6s_both]"
          >
            <MasterMark size={28} />
          </button>
        ) : null}
        {/* La pastille ivoire glisse d'un onglet à l'autre en s'étirant comme
            une goutte, passe sous le QR et se pose avec un petit rebond. */}
        <span
          aria-hidden
          className={cn(
            "absolute top-[6px] left-0 h-[46px] w-[46px] transition-[translate,opacity] duration-500 ease-[cubic-bezier(.65,0,.35,1)] motion-reduce:transition-none",
            (rang < 0 || bulle) && "opacity-0",
          )}
          style={{ translate: `${POSES[Math.max(rang, 0)]}px 0` }}
        >
          <span
            key={rang}
            className="block h-full w-full rounded-full bg-[#f3eee2] [animation:mb-goutte_.5s_cubic-bezier(.65,0,.35,1)] motion-reduce:animate-none"
          />
        </span>

        {left.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} cache={bulle} onPress={() => viser(item.href)} />
        ))}

        <Link
          href="/app/pass"
          aria-label="Mon Master Pass"
          onClick={() => viser("/app/pass")}
          className={cn(
            "press relative z-10 grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-gold text-gold-ink transition-all duration-300 hover:brightness-105",
            repliee && "scale-75",
            bulle && "scale-50 opacity-0",
          )}
        >
          <QrIcon size={22} />
        </Link>

        {right.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            active={isActive(item.href)}
            badge={item.href === "/app/shop" ? count : 0}
            cache={bulle}
            onPress={() => viser(item.href)}
          />
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  href,
  label,
  Icon,
  active,
  badge = 0,
  cache = false,
  onPress,
}: {
  href: string;
  label: string;
  Icon: (p: { size?: number }) => React.ReactElement;
  active: boolean;
  badge?: number;
  /** La barre est rassemblée en bulle : les onglets s'effacent. */
  cache?: boolean;
  onPress: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onPress}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "press relative z-10 grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full transition-[color,opacity,transform] duration-300",
        cache && "scale-50 opacity-0",
        active ? "text-[#06190f] delay-150" : "text-[#f3eee2]/55 hover:text-[#f3eee2]/85",
      )}
    >
      <span className={cn("grid", active && "[animation:mb-icone_.5s_cubic-bezier(.3,1.6,.5,1)_.15s_both] motion-reduce:animate-none")}>
        <Icon size={20} />
      </span>
      {badge > 0 ? (
        <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[9px] font-semibold text-gold-ink">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
