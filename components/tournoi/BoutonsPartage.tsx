"use client";

import { useSnackbar } from "@/components/ui/Snackbar";

/** Copier le lien, ou l'envoyer tout fait sur WhatsApp. */
export function BoutonsPartage({ url, message }: { url: string; message: string }) {
  const { notify } = useSnackbar();
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(url);
      notify("Lien copié");
    } catch {
      notify("Copie impossible", { detail: url, tone: "warn" });
    }
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      <button onClick={copier} className="press h-8 rounded-full border border-line px-3 text-[11.5px] font-semibold">
        Copier le lien
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`}
        target="_blank"
        rel="noreferrer"
        className="press flex h-8 items-center rounded-full bg-gold px-3 text-[11.5px] font-semibold text-gold-ink"
      >
        WhatsApp
      </a>
    </div>
  );
}
