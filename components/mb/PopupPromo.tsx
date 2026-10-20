"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Photo } from "@/components/ui/Photo";
import { cn } from "@/lib/cn";

type Popup = {
  id: string;
  titre: string;
  modele: string;
  etiquette: string;
  surtitre: string;
  accroche: string;
  texte: string;
  image: string;
  bouton1Label: string;
  bouton1Url: string;
  bouton2Label: string;
  bouton2Url: string;
  parJour: number;
};

const lire = (cle: string, stockage: Storage) => {
  try {
    return stockage.getItem(cle);
  } catch {
    return null;
  }
};
const ecrire = (cle: string, valeur: string, stockage: Storage) => {
  try {
    stockage.setItem(cle, valeur);
  } catch {
    /* navigation privée : on montre quand même, sans plafond */
  }
};
const aujourdhui = () => new Date().toLocaleDateString("fr-CA", { timeZone: "Africa/Douala" });
const stat = (id: string, quoi: "vue" | "clic" | "fermeture") =>
  void fetch("/api/popup/stat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, quoi }), keepalive: true }).catch(() => {});

/**
 * Le pop-up promotionnel : un seul par visite, jamais plus de fois par jour
 * que ce que l'administration a fixé, et toujours fermable.
 */
export function PopupPromo({ page }: { page: "app" | "site" }) {
  const [popup, setPopup] = useState<Popup | null>(null);

  useEffect(() => {
    if (lire("mb_popup_visite", sessionStorage)) return;
    const tic = setTimeout(async () => {
      try {
        const r = await fetch(`/api/popup?page=${page}`, { cache: "no-store" });
        const { popups } = (await r.json()) as { popups: Popup[] };
        const jour = aujourdhui();
        const choisi = popups.find((p) => Number(lire(`mb_popup_${p.id}_${jour}`, localStorage) ?? 0) < p.parJour);
        if (!choisi) return;
        const cle = `mb_popup_${choisi.id}_${jour}`;
        ecrire(cle, String(Number(lire(cle, localStorage) ?? 0) + 1), localStorage);
        ecrire("mb_popup_visite", "1", sessionStorage);
        setPopup(choisi);
        stat(choisi.id, "vue");
      } catch {
        /* pas de pop-up : rien de grave */
      }
    }, 1500);
    return () => clearTimeout(tic);
  }, [page]);

  if (!popup) return null;
  const fermer = () => {
    stat(popup.id, "fermeture");
    setPopup(null);
  };
  const boutons = [
    { label: popup.bouton1Label, url: popup.bouton1Url, principal: true },
    { label: popup.bouton2Label, url: popup.bouton2Url, principal: false },
  ].filter((b) => b.label && b.url);
  const neon = popup.modele === "neon";

  // Boutons : fond transparent, bordure et texte visibles — doré pour
  // l'action principale, blanc pour l'autre.
  const cta = (b: (typeof boutons)[number]) => (
    <Link
      key={b.label}
      href={b.url}
      onClick={() => {
        stat(popup.id, "clic");
        setPopup(null);
      }}
      className={cn(
        "press flex h-[50px] items-center justify-center rounded-full border-[1.5px] bg-transparent px-4 text-[14.5px] font-semibold transition hover:bg-white/10",
        b.principal ? "border-[#e8c86a] text-[#e8c86a]" : "border-white/85 text-white",
        neon && b.principal && "shadow-[0_0_18px_rgba(232,200,106,.35),inset_0_0_12px_rgba(232,200,106,.12)]",
      )}
    >
      {b.label}
    </Link>
  );
  const etiquette = popup.etiquette ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-black/25 px-3 py-1.5 text-[10.5px] font-semibold tracking-[0.1em] uppercase backdrop-blur">
      <i className="h-1.5 w-1.5 rounded-full bg-[#e8c86a]" />
      {popup.etiquette}
    </span>
  ) : null;
  const croix = (
    <button
      onClick={fermer}
      aria-label="Fermer"
      className="absolute top-[calc(0.875rem+var(--haut,0px))] right-3.5 z-10 grid h-[38px] w-[38px] place-items-center rounded-full border border-white/45 bg-black/35 text-[20px] leading-none text-white backdrop-blur"
    >
      ×
    </button>
  );
  const fond = popup.image ? <Photo src={popup.image} alt="" fill sizes="(max-width: 640px) 100vw, 480px" className="object-cover" priority /> : null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm" onClick={fermer} role="dialog" aria-modal="true" aria-label={popup.titre}>
      {neon ? (
        // Néon : une carte cadrée d'or, le grand chiffre en contour lumineux.
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-[18px] top-[calc(26px+env(safe-area-inset-top))] bottom-[calc(26px+env(safe-area-inset-bottom))] mx-auto max-w-md overflow-hidden rounded-[28px] border-[1.5px] border-[#e8c86a]/90 bg-[#071a13] text-white shadow-[0_0_0_4px_rgba(232,200,106,.12),0_0_40px_rgba(232,200,106,.35),0_30px_80px_rgba(0,0,0,.7)]"
        >
          {fond}
          <div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/20 to-black/90" />
          {croix}
          <div className="absolute inset-x-[22px] bottom-[26px] flex flex-col items-center gap-3 text-center">
            {etiquette}
            {popup.accroche ? (
              <span className="text-[64px] leading-[0.9] font-extrabold text-transparent [-webkit-text-stroke:1.5px_#e8c86a] [text-shadow:0_0_24px_rgba(232,200,106,.45)]">
                {popup.accroche}
              </span>
            ) : null}
            <h2 className="text-[24px] leading-[1.1] font-extrabold tracking-[0.02em] uppercase">{popup.titre}</h2>
            {popup.surtitre ? <p className="text-[13px] text-white/80">{popup.surtitre}</p> : null}
            {popup.texte ? <p className="text-[13px] leading-5 text-white/75">{popup.texte}</p> : null}
            {boutons.length ? <div className="mt-1 flex w-full flex-col gap-2.5">{boutons.map(cta)}</div> : null}
          </div>
        </div>
      ) : (
        // Cinéma : bord à bord, le titre géant au centre bas.
        <div onClick={(e) => e.stopPropagation()} className="absolute inset-0 mx-auto max-w-xl overflow-hidden bg-[#071a13] text-white [--haut:env(safe-area-inset-top)] sm:inset-y-6 sm:[--haut:0px] sm:rounded-[28px]">
          {fond}
          <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_35%,rgba(0,0,0,0)_0%,rgba(0,0,0,.55)_60%,rgba(0,0,0,.92)_100%)]" />
          {croix}
          <div className="absolute inset-0 flex flex-col items-center justify-end gap-3.5 px-7 pb-[calc(2.75rem+env(safe-area-inset-bottom))] text-center">
            {etiquette}
            {popup.surtitre ? (
              <span className="text-[12px] font-semibold tracking-[0.3em] text-[#e8c86a] uppercase">{popup.surtitre}</span>
            ) : null}
            <h2 className="text-[44px] leading-[0.95] font-extrabold tracking-[-0.04em] uppercase">{popup.titre}</h2>
            {popup.texte ? <p className="max-w-[300px] text-[14px] leading-6 text-white/80">{popup.texte}</p> : null}
            {boutons.length ? (
              <div className={cn("mt-2 grid w-full gap-2.5", boutons.length > 1 ? "grid-cols-2" : "grid-cols-1")}>{boutons.map(cta)}</div>
            ) : null}
            <span className="mt-2.5 h-1 w-[42px] rounded-full bg-white/50" />
          </div>
        </div>
      )}
    </div>
  );
}
