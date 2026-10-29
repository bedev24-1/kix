"use client";

import Link from "next/link";
import { Photo } from "@/components/ui/Photo";
import { useSnackbar } from "@/components/ui/Snackbar";
import { FlameIcon, HeartIcon, PlusIcon } from "@/components/icons";
import { addToCart } from "@/lib/cart";
import { useFavori } from "@/lib/favoris";
import { cn } from "@/lib/cn";
import { f } from "@/lib/format";

export type ArticleVitrine = {
  slug: string;
  nom: string;
  detail: string;
  prix: number;
  image: string;
  badge: string | null;
  vendus?: number;
};

/** « Les plus vendus cette semaine » : petites vignettes carrées, à faire glisser. */
export function RangeeVendus({ articles }: { articles: ArticleVitrine[] }) {
  return (
    <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:-mx-7 md:px-7">
      {articles.map((a) => (
        <Link key={a.slug} href={`/app/shop/${a.slug}`} className="press w-28 shrink-0">
          <span className="relative block h-28 overflow-hidden rounded-[18px] bg-surface">
            <Photo src={a.image} alt={a.nom} fill sizes="112px" className="object-cover" />
            {a.badge ? (
              <span className="absolute top-[7px] left-[7px] rounded-full bg-[#0e1512] px-[7px] py-[3px] text-[8.5px] font-extrabold tracking-[0.06em] text-gold uppercase">
                {a.badge}
              </span>
            ) : null}
          </span>
          <span className="mt-2 block truncate text-[12px] font-bold">{a.nom}</span>
          <span className="mt-0.5 block text-[15px] font-extrabold tracking-[-0.02em]">{f(a.prix)}</span>
          {a.vendus ? (
            <span className="mt-px flex items-center gap-1 text-[10.5px] text-gold-text">
              <FlameIcon size={11} /> {a.vendus} vendu{a.vendus > 1 ? "s" : ""} · 7 j
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

/** La grille : grandes vignettes, favori en haut à gauche, « + » au panier en bas à droite. */
export function GrilleArticles({ articles }: { articles: ArticleVitrine[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
      {articles.map((a) => (
        <Carte key={a.slug} a={a} />
      ))}
    </div>
  );
}

function Carte({ a }: { a: ArticleVitrine }) {
  const [favori, basculer] = useFavori(a.slug);
  const { notify } = useSnackbar();
  return (
    <div className="flex flex-col">
      <div className="relative h-[150px] overflow-hidden rounded-[20px] bg-surface lg:h-56">
        <Link href={`/app/shop/${a.slug}`} aria-label={a.nom} className="absolute inset-0">
          <Photo src={a.image} alt={a.nom} fill sizes="(max-width: 1024px) 200px, 320px" className="object-cover" />
        </Link>
        <button
          type="button"
          onClick={basculer}
          aria-pressed={favori}
          aria-label={favori ? "Retirer des favoris" : "Ajouter aux favoris"}
          className={cn("press absolute top-2 left-2 grid h-[30px] w-[30px] place-items-center rounded-full bg-[#071a13]/55 backdrop-blur", favori ? "text-[#ff6b6b]" : "text-white")}
        >
          <HeartIcon size={15} plein={favori} />
        </button>
        <button
          type="button"
          aria-label={`Ajouter ${a.nom} au panier`}
          onClick={() => {
            addToCart(a.slug, 1, null);
            notify("Ajouté au panier", { detail: `${a.nom} · ${f(a.prix)}` });
          }}
          className="press absolute right-2 bottom-2 grid h-8 w-8 place-items-center rounded-full bg-[#f3eee2] text-[#0b1a12] shadow-[0_4px_10px_rgba(0,0,0,.25)]"
        >
          <PlusIcon size={15} strokeWidth={2.4} />
        </button>
      </div>
      <Link href={`/app/shop/${a.slug}`} className="mt-2 flex flex-col">
        <span className="truncate text-[13px] font-bold">{a.nom}</span>
        <span className="truncate text-[10.5px] text-muted">{a.detail}</span>
        <span className="mt-0.5 text-[15px] font-extrabold tracking-[-0.02em]">{f(a.prix)}</span>
      </Link>
    </div>
  );
}
