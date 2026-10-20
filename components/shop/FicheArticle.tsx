"use client";

import Link from "next/link";
import { useState } from "react";
import { Photo } from "@/components/ui/Photo";
import { AddToCartButton } from "@/components/shop/AddToCartButton";
import { Chip } from "@/components/ui/Chip";
import { useCart } from "@/lib/cart";
import { f } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Product, ProductImage, ProductVariant } from "@/db";

/**
 * La fiche d'un article : ses photos, ses déclinaisons, son bouton.
 *
 * Les trois vont ensemble et se répondent — choisir une saveur change le prix
 * affiché, le stock annoncé, et parfois la photo. Les séparer en trois
 * composants obligerait à faire remonter l'état jusqu'à la page, qui est
 * rendue sur le serveur.
 */
export function FicheArticle({
  produit,
  galerie,
  declinaisons,
}: {
  produit: Product;
  galerie: ProductImage[];
  declinaisons: ProductVariant[];
}) {
  const { count } = useCart();
  const [choisie, setChoisie] = useState<ProductVariant | null>(
    declinaisons.find((d) => d.stock > 0) ?? declinaisons[0] ?? null,
  );

  // La vignette de l'article ouvre toujours la galerie : c'est la photo que
  // le client a vue dans la liste, il doit la retrouver en premier.
  const photos = [produit.image, ...galerie.map((g) => g.url)].filter(
    (url, i, tout) => url && tout.indexOf(url) === i,
  );
  const [active, setActive] = useState(0);
  const affichee = choisie?.image ?? photos[active] ?? produit.image;

  const prix = choisie?.price ?? produit.price;
  const stock = choisie ? choisie.stock : produit.stock;

  return (
    <div className="grid gap-3.5 lg:grid-cols-2 lg:items-start lg:gap-10">
      <div className="flex flex-col gap-2.5 lg:sticky lg:top-8">
        <div className="relative h-64 overflow-hidden rounded-panel border border-line lg:h-125">
          <Photo
            key={affichee}
            src={affichee}
            alt={produit.name}
            fill
            sizes="430px"
            className="object-cover"
            priority
          />
          {produit.badgeLabel ? (
            <span
              className={cn(
                "absolute top-3 left-3 rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-[0.06em] uppercase",
                produit.badgeTone === "gold" ? "bg-gold text-gold-ink" : "bg-jade text-white",
              )}
            >
              {produit.badgeLabel}
            </span>
          ) : null}
        </div>

        {/* La galerie ne s'affiche qu'à partir de deux photos : une pastille
            seule sous une image ne dit rien et prend de la place. */}
        {photos.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((url, i) => (
              <button
                key={url}
                type="button"
                aria-label={`Photo ${i + 1}`}
                aria-pressed={active === i && !choisie?.image}
                onClick={() => {
                  setActive(i);
                  if (choisie?.image) setChoisie({ ...choisie, image: null });
                }}
                className={cn(
                  "relative h-16 w-16 shrink-0 overflow-hidden rounded-card border transition",
                  active === i && !choisie?.image ? "border-gold" : "border-line opacity-75 hover:opacity-100",
                )}
              >
                <Photo src={url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3.5 lg:gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-[26px] leading-7 lg:text-[34px] lg:leading-9">{produit.name}</h1>
            <span className="shrink-0 text-[22px] font-bold tracking-[-0.03em] text-gold-text lg:text-[28px]">
              {f(prix)}
            </span>
          </div>
          <p className="text-[13px] text-muted">{produit.detail}</p>
        </div>

        {declinaisons.length > 0 ? (
          <div className="flex flex-col gap-2">
            <span className="label-caps text-[10.5px] text-muted">Au choix</span>
            <div className="flex flex-wrap gap-2">
              {declinaisons.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  aria-pressed={choisie?.id === d.id}
                  disabled={d.stock <= 0}
                  onClick={() => {
                    setChoisie(d);
                    setActive(0);
                  }}
                  className={cn(
                    "press h-10 rounded-full border px-4 text-[12.5px] transition",
                    choisie?.id === d.id
                      ? "border-gold bg-gold/15 font-semibold text-gold-text"
                      : "border-line text-dim hover:text-ink",
                    d.stock <= 0 && "line-through opacity-45",
                  )}
                >
                  {d.name}
                  {d.price != null && d.price !== produit.price ? (
                    <span className="ml-1.5 text-[11px] text-muted">{f(d.price)}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Chip tone={stock > 0 ? "gold" : "warn"}>
            {stock > 0 ? `${stock} en stock` : "Rupture"}
            {choisie ? ` · ${choisie.name}` : ""}
          </Chip>
        </div>

        <p className="text-[14px] leading-6 text-pretty text-dim">{produit.description}</p>

        <div className="hidden lg:flex">
          <AddToCartButton
            slug={produit.slug}
            name={produit.name}
            price={prix}
            variantId={choisie?.id ?? null}
            variantLabel={choisie?.name ?? null}
            epuise={stock <= 0}
            full
          />
        </div>

        {/* Sur téléphone, le bouton vit au ras du pouce, sous la fiche — et il
            emporte l'accès au panier. Deux barres flottantes à la même hauteur,
            c'est la seconde qui recouvre la première : on ne pouvait plus
            ajouter un deuxième article sans passer par le panier. */}
        <div className="fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-20 mx-auto w-full max-w-[430px] px-5 lg:hidden">
          <div className="glass-strong flex items-center gap-2 rounded-full p-1.5">
            <AddToCartButton
              slug={produit.slug}
              name={produit.name}
              price={prix}
              variantId={choisie?.id ?? null}
              variantLabel={choisie?.name ?? null}
              epuise={stock <= 0}
              full
            />
            {count > 0 ? (
              <Link
                href="/app/panier"
                className="press flex h-14 shrink-0 flex-col items-center justify-center rounded-full border border-gold/40 px-4 text-[11px] text-gold-text"
              >
                <span className="text-[15px] font-bold">{count}</span>
                panier
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
