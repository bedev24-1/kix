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

export function BottomNav() {
  const pathname = usePathname();
  const { count } = useCart();
  const isActive = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));

  return (
    <nav className="pointer-events-auto fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[430px] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] md:max-w-[34rem] lg:hidden">
      <div className="glass-strong relative flex h-17 items-center justify-between rounded-full px-6">
        {left.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}

        <Link
          href="/app/pass"
          aria-label="Mon Master Pass"
          className="press -mt-11 grid h-14 w-14 place-items-center rounded-full bg-gold text-gold-ink shadow-[0_10px_28px_rgba(217,180,80,0.35)] transition hover:scale-105 hover:brightness-105"
        >
          <QrIcon size={25} />
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
      className={cn(
        "press relative flex w-12 flex-col items-center gap-1 py-2 text-[9px] transition",
        active ? "text-gold-text" : "text-faint hover:text-dim",
      )}
    >
      <span className={cn("transition-transform duration-300", active && "-translate-y-0.5 scale-110")}>
        <Icon size={21} />
      </span>
      {label}
      {badge > 0 ? (
        <span className="absolute top-0.5 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[9px] font-semibold text-gold-ink">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
