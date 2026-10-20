"use client";

import { useSnackbar } from "@/components/ui/Snackbar";
import { ShareIcon } from "@/components/icons";

/**
 * Le bouton « Partager » d'une page : la feuille de partage du téléphone
 * (WhatsApp, SMS…), sinon le lien copié. Il ne faisait rien jusqu'ici.
 */
export function PartagerBouton({ chemin, titre, className }: { chemin: string; titre: string; className?: string }) {
  const { notify } = useSnackbar();
  const partager = async () => {
    // L'adresse vue par le visiteur, pas celle du serveur derrière le proxy.
    const url = `${window.location.origin}/rejoindre?vers=${encodeURIComponent(chemin)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: titre, text: titre, url });
        return;
      }
    } catch {
      return; // partage annulé
    }
    try {
      await navigator.clipboard.writeText(url);
      notify("Lien copié", { detail: "Colle-le dans WhatsApp ou ailleurs." });
    } catch {
      notify("Copie impossible", { detail: url, tone: "warn" });
    }
  };
  return (
    <button aria-label="Partager" onClick={partager} className={className}>
      <ShareIcon size={17} />
    </button>
  );
}
