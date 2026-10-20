"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Photo } from "@/components/ui/Photo";

type Popup = {
  id: string;
  titre: string;
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

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-5 backdrop-blur-sm" onClick={fermer} role="dialog" aria-modal="true" aria-label={popup.titre}>
      <div className="relative w-full max-w-sm overflow-hidden rounded-panel border border-line bg-bg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={fermer} aria-label="Fermer" className="absolute top-2.5 right-2.5 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-[18px] text-white">
          ×
        </button>
        {popup.image ? (
          <div className="relative aspect-[4/3] w-full">
            <Photo src={popup.image} alt="" fill sizes="384px" className="object-cover" />
          </div>
        ) : null}
        <div className="flex flex-col gap-3 p-5">
          <h2 className="text-[20px] leading-tight font-bold">{popup.titre}</h2>
          {popup.texte ? <p className="text-[13.5px] leading-6 whitespace-pre-line text-dim">{popup.texte}</p> : null}
          {boutons.length ? (
            <div className="flex flex-col gap-2 pt-1">
              {boutons.map((b) => (
                <Link
                  key={b.label}
                  href={b.url}
                  onClick={() => {
                    stat(popup.id, "clic");
                    setPopup(null);
                  }}
                  className={
                    b.principal
                      ? "press flex h-12 items-center justify-center rounded-full bg-gold text-[14px] font-semibold text-gold-ink"
                      : "press flex h-12 items-center justify-center rounded-full border border-line text-[14px] font-semibold"
                  }
                >
                  {b.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
