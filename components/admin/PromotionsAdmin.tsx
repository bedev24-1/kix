"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useSnackbar } from "@/components/ui/Snackbar";
import { deciderPromotion } from "@/lib/actions-promo";

/** Valider (le gérant paie), offrir (programmée gratuitement) ou refuser une demande. */
export function DecisionsPromo({ id, avecPopup = false }: { id: string; avecPopup?: boolean }) {
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
      {/* Valider le pop-up, c'est valider son modèle. */}
      {avecPopup ? (
        <select value={modele} onChange={(e) => setModele(e.target.value)} className="h-8 rounded-full border border-line bg-surface px-2.5 text-[11px] text-ink">
          <option value="cinema">Pop-up Cinéma</option>
          <option value="neon">Pop-up Néon</option>
        </select>
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
