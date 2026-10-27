"use client";

import { useState } from "react";
import { useSnackbar } from "@/components/ui/Snackbar";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Partager l'image du tableau : sur téléphone, la feuille de partage
 * (WhatsApp, statut, Facebook) reçoit directement la photo ; ailleurs, elle
 * se télécharge.
 */
export function ImageTableau({ slug, titre }: { slug: string; titre: string }) {
  const { notify } = useSnackbar();
  const [pending, setPending] = useState(false);
  const url = `/t/${slug}/arbre.png`;

  async function partager() {
    setPending(true);
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const fichier = new File([blob], `${slug}-tableau.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [fichier] })) {
        await navigator.share({ files: [fichier], title: titre, text: `${titre} · le tableau sur Master Break` }).catch(() => {});
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
      Partager l&apos;image
    </button>
  );
}
