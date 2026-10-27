"use client";

import { useState } from "react";
import { useSnackbar } from "@/components/ui/Snackbar";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Partager l'image du tableau : sur téléphone, la feuille de partage
 * (WhatsApp, statut, Facebook) reçoit directement la photo ; ailleurs, elle
 * se télécharge.
 */
export function ImageTableau({ slug, titre, provisoire = false }: { slug: string; titre: string; provisoire?: boolean }) {
  const { notify } = useSnackbar();
  const [pending, setPending] = useState(false);
  // Le tirage préparé : l'image n'est servie qu'à l'organisateur.
  const url = `/t/${slug}/arbre.png${provisoire ? "?brouillon=1" : ""}`;

  async function partager() {
    setPending(true);
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const fichier = new File([blob], `${slug}-${provisoire ? "tirage" : "tableau"}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [fichier] })) {
        await navigator.share({ files: [fichier], title: titre, text: provisoire ? `${titre} · le tirage (provisoire) sur Master Break` : `${titre} · le tableau sur Master Break` }).catch(() => {});
      } else {
        const lien = document.createElement("a");
        lien.href = URL.createObjectURL(blob);
        lien.download = fichier.name;
        lien.click();
        setTimeout(() => URL.revokeObjectURL(lien.href), 4000);
        notify("Image téléchargée", { tone: "jade" });
      }
    } catch {
      notify("Impossible de préparer l'image", { tone: "warn" });
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={partager}
      disabled={pending}
      className="press flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-3 py-1.5 text-[12px] font-semibold text-gold-text disabled:opacity-60"
    >
      {pending ? <Spinner size={13} /> : null}
      {provisoire ? "Partager le tirage" : "Partager l\u2019image"}
    </button>
  );
}
