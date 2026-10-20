import { libelleCertification } from "@/lib/certification";

/**
 * Le badge de certification, comme le compte vérifié de Meta : une rosette
 * bleue à bords festonnés, une coche blanche. Il se pose juste après le nom.
 */
export function BadgeCertifie({ motif, taille = 14, className }: { motif: string | null | undefined; taille?: number; className?: string }) {
  const titre = libelleCertification(motif);
  if (!titre) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={taille}
      height={taille}
      role="img"
      aria-label={titre}
      className={`inline-block shrink-0 align-[-0.125em] ${className ?? ""}`}
    >
      <title>{titre}</title>
      <path
        fill="#0866FF"
        d="M12 1.5l2.39 1.74 2.95-.1.93 2.8 2.43 1.68-.9 2.82.9 2.82-2.43 1.68-.93 2.8-2.95-.1L12 22.5l-2.39-1.74-2.95.1-.93-2.8-2.43-1.68.9-2.82-.9-2.82 2.43-1.68.93-2.8 2.95.1z"
      />
      <path fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M7.6 12.2l3 3 5.8-6" />
    </svg>
  );
}
