/** Numéros camerounais. Aucun import Node : ce module sert aussi au client. */

/** 6 77 45 12 08 · +237677451208 · 00237 677 451 208 → 677451208 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  return digits.replace(/^(00)?237/, "");
}

export function isValidPhone(phone: string): boolean {
  return /^6\d{8}$/.test(phone);
}

/** 677451208 → 6 77 45 12 08 */
export function displayPhone(phone: string): string {
  const d = normalizePhone(phone);
  if (!isValidPhone(d)) return phone;
  return `${d[0]} ${d.slice(1, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7)}`;
}

/**
 * L'opérateur d'un numéro, d'après son préfixe.
 * MTN : 67x, 650-654, 680-684. Orange : 69x, 655-659, 685-689.
 */
export function operateurDuNumero(phone: string): "momo" | "om" | null {
  const d = normalizePhone(phone);
  if (!isValidPhone(d)) return null;
  if (d.startsWith("67")) return "momo";
  if (d.startsWith("69")) return "om";
  const trois = Number(d.slice(0, 3));
  if ((trois >= 650 && trois <= 654) || (trois >= 680 && trois <= 684)) return "momo";
  if ((trois >= 655 && trois <= 659) || (trois >= 685 && trois <= 689)) return "om";
  return null;
}
