"use client";

import { useSyncExternalStore } from "react";
import { useSnackbar } from "@/components/ui/Snackbar";
import { ShareIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

const rien = () => () => {};

/**
 * Le lien d'un cours, à copier ou à partager : il mène à la page publique
 * `/c/<slug>`, celle qui s'ouvre sans compte et mène à l'inscription.
 */
export function LienCours({ slug, titre, className }: { slug: string; titre: string; className?: string }) {
  const { notify } = useSnackbar();
  const chemin = `/c/${slug}`;
  // L'adresse vue par le visiteur ; côté serveur, le chemin seul.
  const url = useSyncExternalStore(rien, () => `${window.location.origin}${chemin}`, () => chemin);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(url);
      notify("Lien du cours copié", { detail: "Colle-le dans WhatsApp, un statut ou un groupe." });
    } catch {
      notify("Copie impossible", { detail: url, tone: "warn" });
    }
  };

  const partager = async () => {
    if (!navigator.share) return copier();
    try {
      await navigator.share({ title: titre, text: `${titre} — inscris-toi sur Master Break`, url });
    } catch {
      /* partage annulé */
    }
  };

  return (
    <div className={cn("flex items-center gap-2 rounded-card border border-line bg-surface-2/60 p-1.5 pl-3", className)}>
      <span className="min-w-0 grow truncate font-mono text-[11.5px] text-dim" title={url}>
        {url.replace(/^https?:\/\//, "")}
      </span>
      <button
        type="button"
        onClick={copier}
        className="press h-8 shrink-0 rounded-full border border-line px-3 text-[12px] text-ink hover:bg-surface-2"
      >
        Copier
      </button>
      <button
        type="button"
        onClick={partager}
        className="press flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-gold px-3 text-[12px] font-semibold text-gold-ink"
      >
        <ShareIcon size={14} /> Partager
      </button>
    </div>
  );
}
