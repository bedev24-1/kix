"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Photo } from "@/components/ui/Photo";
import { BellIcon, MasterMark, PlusIcon } from "@/components/icons";
import { RechercheBulle } from "@/components/ui/RechercheBulle";
import { cn } from "@/lib/cn";
import type { User } from "@/db";

export type Annonce = { titre: string; href: string };

/**
 * La ligne du haut de l'accueil, posée sur sa recherche.
 *
 * Elle reste collée en haut pendant qu'on fait défiler : le vert de l'en-tête
 * se referme en arrondi sur la page, qui passe dessous. Sous le nom, les
 * prochains événements défilent un à un, dans la hauteur du logo.
 */
export function EnTeteAccueil({
  user,
  unread,
  solde,
  annonces,
}: {
  user: Pick<User, "name" | "avatar">;
  unread: number;
  solde: number;
  annonces: Annonce[];
}) {
  return (
    <header className="sticky top-[env(safe-area-inset-top)] z-20 rounded-b-[26px] border-b border-line bg-bg px-5 pt-3 pb-3.5 shadow-[0_10px_22px_rgba(0,0,0,.35)] md:px-7 lg:hidden">
      <div className="flex h-[52px] items-center gap-2">
        <Link href="/app" aria-label="Accueil Master Break" className="mr-auto flex min-w-0 items-center gap-2">
          <MasterMark size={26} />
          <span className="inline-grid h-[26px] content-center gap-0.5">
            <span className="text-[10px] leading-[11px] font-bold tracking-[0.28em] whitespace-nowrap">MASTER BREAK</span>
            <Defilant annonces={annonces} />
          </span>
        </Link>
        <Link
          href="/app/notifications"
          aria-label={unread > 0 ? `${unread} notifications non lues` : "Notifications"}
          className="press relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ink/18"
        >
          <BellIcon size={18} />
          {unread > 0 ? (
            <span className="absolute top-1.5 right-[7px] h-2 w-2 rounded-full border-2 border-bg bg-gold" />
          ) : null}
        </Link>
        <Jetons solde={solde} />
        <Link href="/app/rewards" aria-label="Mon profil" className="press shrink-0">
          {user.avatar ? (
            <Photo
              src={user.avatar}
              alt={user.name}
              width={36}
              height={36}
              className="h-9 w-9 rounded-full border-[1.5px] border-ink/25 object-cover"
            />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full border-[1.5px] border-ink/25 bg-surface text-[12px] font-semibold">
              {user.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </Link>
      </div>

      <RechercheBulle action="/app/recherche" placeholder="Salle, tournoi, puff…" className="mt-1" />
    </header>
  );
}

/**
 * Le solde, et la pièce « + » qu'il fait sortir.
 *
 * Toucher la pastille fait surgir la pièce à côté, qui fait un seul tour
 * avant de se poser : la toucher ouvre la recharge. Or uni, sans reflet.
 */
function Jetons({ solde }: { solde: number }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        aria-label={`${solde} jetons — recharger`}
        className={cn(
          "press flex h-9 shrink-0 items-center gap-1.5 rounded-full border pr-[11px] pl-1.5 text-[13px] font-extrabold transition-colors",
          ouvert ? "border-gold/60 bg-gold/8" : "border-ink/14 bg-ink/6",
        )}
      >
        <span className="grid h-5 w-5 place-items-center rounded-full bg-gold text-[9.5px] font-extrabold text-gold-ink shadow-[inset_0_0_0_1.5px_rgba(26,20,5,.18)]">
          M
        </span>
        {solde}
      </button>
      {ouvert ? (
        <Link
          href="/app/recharge"
          aria-label="Recharger mon Master Pass"
          className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-linear-160 from-[#e9bf55] to-[#d9a935] text-white shadow-[inset_0_0_0_1.5px_rgba(26,20,5,.15)] [animation:mb-piece_.4s_cubic-bezier(.2,.7,.3,1)_both] motion-reduce:animate-none"
        >
          <PlusIcon size={14} strokeWidth={2.6} />
        </Link>
      ) : null}
    </>
  );
}

/** Les prochains événements, un à la fois : toutes les 3 s, le texte monte et le suivant prend sa place. */
function Defilant({ annonces }: { annonces: Annonce[] }) {
  const [i, setI] = useState(0);
  const [glisse, setGlisse] = useState(true);
  const n = annonces.length;

  useEffect(() => {
    if (n < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => {
      setGlisse(true);
      setI((k) => k + 1);
    }, 3000);
    return () => window.clearInterval(t);
  }, [n]);

  if (n === 0) return null;
  // Une copie du premier ferme la boucle : arrivé dessus, on y revient sans transition.
  const liste = n > 1 ? [...annonces, annonces[0]] : annonces;
  return (
    <span className="block h-3 w-0 min-w-full overflow-hidden">
      <span
        className="block"
        style={{
          transform: `translateY(${-i * 12}px)`,
          transition: glisse ? "transform 450ms cubic-bezier(.2,.7,.3,1)" : "none",
        }}
        onTransitionEnd={() => {
          if (i >= n) {
            setGlisse(false);
            setI(0);
          }
        }}
      >
        {liste.map((a, k) => (
          <span key={k} className="block h-3 truncate text-[9px] leading-3 text-gold/85">
            {a.titre}
          </span>
        ))}
      </span>
    </span>
  );
}
