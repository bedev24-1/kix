"use client";

import QRCode from "qrcode";
import { useSnackbar } from "@/components/ui/Snackbar";

/** Le QR en image nette, assez grande pour une affiche A4. */
async function qrEnImage(url: string): Promise<string> {
  return QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 2, width: 1024 });
}

/**
 * Copier le lien, l'envoyer sur WhatsApp — et, pour l'organisateur, prendre
 * le QR en image : à imprimer sur l'affiche ou à poster en statut.
 */
export function BoutonsPartage({
  url,
  message,
  imprimable = false,
  nomFichier = "qr-master-break",
}: {
  url: string;
  message: string;
  imprimable?: boolean;
  nomFichier?: string;
}) {
  const { notify } = useSnackbar();

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(url);
      notify("Lien copié");
    } catch {
      notify("Copie impossible", { detail: url, tone: "warn" });
    }
  };

  const telecharger = async () => {
    const a = document.createElement("a");
    a.href = await qrEnImage(url);
    a.download = `${nomFichier}.png`;
    a.click();
  };

  // Sur téléphone : la feuille de partage du système, image jointe (WhatsApp,
  // statut, Facebook…). Sinon, on retombe sur le téléchargement.
  const partagerImage = async () => {
    try {
      const blob = await (await fetch(await qrEnImage(url))).blob();
      const fichier = new File([blob], `${nomFichier}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [fichier] })) {
        await navigator.share({ files: [fichier], text: `${message} ${url}` });
        return;
      }
    } catch {
      /* partage annulé ou indisponible : on télécharge */
    }
    await telecharger();
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
      {imprimable ? (
        <>
          <button onClick={telecharger} className="press h-8 rounded-full border border-line px-3 text-[11.5px] font-semibold">
            Télécharger le QR
          </button>
          <button onClick={partagerImage} className="press h-8 rounded-full border border-line px-3 text-[11.5px] font-semibold">
            Partager l&apos;image
          </button>
        </>
      ) : null}
    </div>
  );
}
