"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { BoltIcon, CartIcon, HomeIcon, QrIcon, UserIcon } from "@/components/icons";
import { useCart } from "@/lib/cart";

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

/** Une fiche produit : la barre s'y efface au profit du tiroir d'achat et de sa bulle. */
export const estFicheProduit = (chemin: string) => /^\/app\/shop\/[^/]+$/.test(chemin);

export function BottomNav() {
  const pathname = usePathname();
  const { count } = useCart();
  const isActive = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));
  // Sur une fiche, la barre se resserre et file vers la droite, où elle
  // devient la bulle posée sur le tiroir (components/shop/fiche) : le bouton
  // QR rentre dans la barre, la barre rétrécit, puis disparaît.
  const repliee = estFicheProduit(pathname);

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
          "relative flex h-[60px] origin-[92%_50%] items-center gap-1.5 rounded-[32px] border border-[#f3eee2]/10 bg-[#0a1e16]/80 px-2 shadow-[0_10px_30px_rgba(0,0,0,.45)] backdrop-blur-[16px] transition-all duration-[350ms] ease-[cubic-bezier(.2,.7,.3,1)] motion-reduce:transition-none",
          repliee && "pointer-events-none translate-y-3 scale-x-[.16] scale-y-[.66] opacity-0",
        )}
      >
        {left.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}

        <Link
          href="/app/pass"
          aria-label="Mon Master Pass"
          className={cn(
            "press grid h-[52px] w-[52px] place-items-center rounded-full bg-gold text-gold-ink transition-all duration-300 hover:brightness-105",
            repliee && "scale-75",
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
}: {
  href: string;
  label: string;
  Icon: (p: { size?: number }) => React.ReactElement;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "press relative grid h-[46px] w-[46px] place-items-center rounded-full transition-colors duration-300",
        active ? "bg-[#f3eee2] text-[#06190f]" : "text-[#f3eee2]/55 hover:text-[#f3eee2]/85",
      )}
    >
      <Icon size={20} />
      {badge > 0 ? (
        <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[9px] font-semibold text-gold-ink">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
