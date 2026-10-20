/**
 * Les cagnottes d'un tournoi : plusieurs enveloppes, chacune pour quelqu'un.
 *
 * « 100 000 F au vainqueur », « 30 000 F à la meilleure dame », « 10 000 F
 * au plus beau break » : une dotation unique ne savait pas le dire. La
 * dotation totale devient la somme des cagnottes.
 */
export type Cagnotte = { nom: string; pour: string; montant: number };

export const CAGNOTTES_MAX = 6;

export function lireCagnottes(fd: FormData): Cagnotte[] {
  return Array.from({ length: CAGNOTTES_MAX }, (_, i) => ({
    nom: String(fd.get(`cagnotte_${i}_nom`) ?? "").trim().slice(0, 60),
    pour: String(fd.get(`cagnotte_${i}_pour`) ?? "").trim().slice(0, 80),
    montant: Math.max(0, Math.round(Number(fd.get(`cagnotte_${i}_montant`) ?? 0) || 0)),
  })).filter((c) => c.nom || c.montant > 0);
}

export const totalCagnottes = (cagnottes: Cagnotte[] | null | undefined) =>
  (cagnottes ?? []).reduce((n, c) => n + c.montant, 0);
