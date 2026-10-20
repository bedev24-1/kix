/**
 * La certification : le « compte vérifié » de Master Break.
 *
 * Accordée par l'administration seule, jamais achetée — c'est ce qui la
 * distingue du badge PRO, qui se paie. Le motif dit pourquoi on peut faire
 * confiance à ce compte.
 */
export const MOTIFS = {
  arbitre_officiel: "Arbitre officiel",
  gerant: "Gérant de salle partenaire",
  coach: "Coach reconnu",
  pro_verifie: "Joueur pro vérifié",
  diffuseur: "Diffuseur officiel",
} as const;

export type Motif = keyof typeof MOTIFS;

export const lireMotif = (v: unknown): Motif | null => (typeof v === "string" && v in MOTIFS ? (v as Motif) : null);

export const libelleCertification = (motif: string | null | undefined) =>
  motif ? `Certifié Master Break · ${MOTIFS[motif as Motif] ?? "compte vérifié"}` : null;
