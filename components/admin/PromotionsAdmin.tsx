"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useSnackbar } from "@/components/ui/Snackbar";
import { VuePopup, type Popup } from "@/components/mb/PopupPromo";
import { deciderPromotion } from "@/lib/actions-promo";
import { cn } from "@/lib/cn";

export type ApercuPopup = Pick<Popup, "titre" | "etiquette" | "surtitre" | "accroche" | "texte" | "image" | "bouton1Label" | "bouton1Url" | "bouton2Label" | "bouton2Url">;

const MODELES = [
  { id: "cinema", nom: "Cinéma" },
  { id: "neon", nom: "Néon" },
] as const;

/** Un écran de téléphone réduit : le pop-up y est rendu à sa vraie taille, puis ramené à l'échelle. */
function Telephone({ popup, modele, choisi, onChoisir }: { popup: ApercuPopup; modele: string; choisi: boolean; onChoisir: () => void }) {
  return (
    <button
      type="button"
      onClick={onChoisir}
      aria-pressed={choisi}
      className={cn("press flex flex-col items-center gap-2 rounded-panel border-2 p-2 transition", choisi ? "border-gold bg-gold/10" : "border-transparent opacity-70 hover:opacity-100")}
    >
      <span className="relative block h-[351px] w-[180px] overflow-hidden rounded-[22px] border border-line bg-black">
        <span className="pointer-events-none absolute top-0 left-0 block h-[780px] w-[400px] origin-top-left scale-[0.45]">
          <VuePopup popup={{ ...popup, modele }} apercu />
        </span>
      </span>
      <span className={cn("text-[12px] font-semibold", choisi ? "text-gold-text" : "text-muted")}>
        {choisi ? "✓ " : ""}Pop-up {MODELES.find((m) => m.id === modele)?.nom}
      </span>
    </button>
  );
}

/** Valider (le gérant paie), offrir (programmée gratuitement) ou refuser une demande. */
export function DecisionsPromo({ id, apercu }: { id: string; apercu?: ApercuPopup | null }) {
  const [modele, setModele] = useState("cinema");
  const router = useRouter();
  const { notify } = useSnackbar();
  const [pending, start] = useTransition();
  const faire = (decision: "valide" | "offerte" | "refusee", succes: string) =>
    start(async () => {
      const motif = decision === "refusee" ? (window.prompt("Motif du refus (visible par le gérant)") ?? "") : "";
      const res = await deciderPromotion(id, decision, motif, modele);
      if (!res.ok) return notify("Impossible", { detail: res.error, tone: "warn" });
      notify(succes, { tone: "jade" });
      router.refresh();
    });
  const bouton = "rounded-full border border-line px-3 py-1.5 text-[11px] disabled:opacity-50";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Valider le pop-up, c'est valider son modèle : on choisit sur l'aperçu. */}
      {apercu ? (
        <div className="flex w-full flex-wrap gap-2 pb-1">
          {MODELES.map((m) => (
            <Telephone key={m.id} popup={apercu} modele={m.id} choisi={modele === m.id} onChoisir={() => setModele(m.id)} />
          ))}
        </div>
      ) : null}
      <button disabled={pending} className={`${bouton} border-gold/50 text-gold-text`} onClick={() => faire("valide", "Validée : le gérant peut payer")}>
        Valider (à payer)
      </button>
      <button disabled={pending} className={bouton} onClick={() => faire("offerte", "Programmée, offerte")}>
        Offrir
      </button>
      <button disabled={pending} className={`${bouton} text-warn`} onClick={() => faire("refusee", "Refusée")}>
        Refuser
      </button>
    </div>
  );
}
