"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type NavItem = {
  href: string;
  label: string;
  Icon: (props: { size?: number }) => React.ReactNode;
  /** Mise en avant : le geste qu'on fait cent fois par soirée. */
  primary?: boolean;
};

/**
 * La navigation des espaces de gestion.
 *
 * Elle tenait autant d'entrées qu'on lui en donnait, et finissait par les
 * couper : sept onglets chez le gérant, neuf pastilles empilées chez
 * l'administrateur. Ici le barreau n'en montre que quatre, choisies, et le
 * reste vit derrière « Plus ». Un téléphone n'a pas de place pour une liste,
 * il a de la place pour une décision.
 */
export function DashNav({
  items,
  mobile = false,
  title,
}: {
  items: NavItem[];
  mobile?: boolean;
  title?: string;
}) {
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const feuille = useRef<HTMLDivElement>(null);

  // Naviguer referme la feuille. Ajusté pendant le rendu plutôt que dans un
  // effet : un `setState` synchrone dans un effet déclenche un second rendu
  // pour rien, et l'utilisateur verrait la feuille survivre un instant à la
  // page qu'elle vient de quitter.
  const [vuA, setVuA] = useState(pathname);
  if (vuA !== pathname) {
    setVuA(pathname);
    setOuvert(false);
  }

  const racine = items[0]?.href ?? "/";
  const actif = (href: string) => (href === racine ? pathname === href : pathname.startsWith(href));

  // Quatre dans le barreau, le reste derrière « Plus ». Une entrée active qui
  // serait reléguée remonte : on doit toujours voir où l'on est.
  const barre = items.slice(0, 4);
  const reste = items.slice(4);
  const cacheActif = reste.find((i) => actif(i.href));
  const visibles = cacheActif ? [...barre.slice(0, 3), cacheActif] : barre;
  const caches = items.filter((i) => !visibles.includes(i));

  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (feuille.current && !feuille.current.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);

  if (!mobile) {
    return (
      <nav className="flex flex-col gap-1">
        {title ? (
          <span className="px-4 pb-2 text-[11px] tracking-[0.12em] text-muted uppercase">{title}</span>
        ) : null}
        {items.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={actif(href) ? "page" : undefined}
            className={cn(
              "press flex h-11 items-center gap-3 rounded-full px-4 text-sm transition",
              actif(href)
                ? "border border-gold/30 bg-gold/12 font-semibold text-gold-text"
                : "text-dim hover:bg-surface-2 hover:text-ink",
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <>
      {ouvert ? (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden" aria-hidden="true" />
      ) : null}

      {ouvert ? (
        <div
          ref={feuille}
          role="dialog"
          aria-label="Plus de pages"
          className="rise glass-strong fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col gap-1 rounded-panel p-2 lg:hidden"
        >
          {caches.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "press flex h-12 items-center gap-3 rounded-card px-3.5 text-[14px] transition",
                actif(href) ? "bg-gold/15 font-semibold text-gold-text" : "text-dim",
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </div>
      ) : null}

      <nav className="glass-strong fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 flex items-center gap-1 rounded-full p-1.5 lg:hidden">
        {visibles.map(({ href, label, Icon, primary }) => {
          const ici = actif(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={ici ? "page" : undefined}
              className={cn(
                "press flex h-12 min-w-0 grow flex-col items-center justify-center gap-0.5 rounded-full transition",
                ici ? "bg-gold text-gold-ink" : primary ? "text-gold-text" : "text-dim",
              )}
            >
              <Icon size={17} />
              <span className="max-w-full truncate px-1 text-[9.5px] leading-none">{label}</span>
            </Link>
          );
        })}

        {caches.length > 0 ? (
          <button
            onClick={() => setOuvert((v) => !v)}
            aria-expanded={ouvert}
            aria-label="Plus de pages"
            className={cn(
              "press flex h-12 min-w-0 grow flex-col items-center justify-center gap-0.5 rounded-full transition",
              ouvert ? "bg-surface-2 text-ink" : "text-dim",
            )}
          >
            <span className="flex h-[17px] items-center gap-[3px]" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <i key={i} className="h-[3px] w-[3px] rounded-full bg-current" />
              ))}
            </span>
            <span className="text-[9.5px] leading-none">Plus</span>
          </button>
        ) : null}
      </nav>
    </>
  );
}
