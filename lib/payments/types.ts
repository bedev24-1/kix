/** Contrat commun à tous les encaisseurs Mobile Money. */

export type PaymentMethod = "om" | "momo";
export type PaymentStatus = "pending" | "paid" | "failed" | "expired";

export const methodLabel: Record<PaymentMethod, string> = {
  om: "Orange Money",
  momo: "MTN MoMo",
};

export type ChargeRequest = {
  /** Notre référence, unique : c'est elle qui revient dans le webhook. */
  reference: string;
  /** Montant en francs CFA, entier. */
  amount: number;
  /** Numéro camerounais normalisé, 9 chiffres, sans indicatif. */
  phone: string;
  method: PaymentMethod;
  description: string;
  callbackUrl?: string;
};

export type ChargeResult =
  | {
      ok: true;
      providerRef: string | null;
      status: PaymentStatus;
      /** Ce que le client doit faire sur son téléphone, si l'opérateur le précise. */
      instruction?: string;
      detail?: unknown;
    }
  | { ok: false; error: string; detail?: unknown };

/** Ce dont un encaisseur a besoin pour retrouver une transaction. */
export type PaymentSnapshot = {
  reference: string;
  providerRef: string | null;
  phone: string;
  amount: number;
  method: PaymentMethod;
  createdAt: Date;
};

export type Outcome = {
  status: PaymentStatus;
  providerRef?: string | null;
  failureReason?: string;
  detail?: unknown;
};

export type VerifyResult = ({ ok: true } & Outcome) | { ok: false; error: string };

export type WebhookEvent = { reference: string } & Outcome;

export interface PaymentProvider {
  readonly name: string;
  /** L'opérateur est réellement joignable (clés présentes). */
  readonly live: boolean;
  /**
   * Les moyens que l'encaisseur accepte en ce moment. Absent : tous.
   * Un moyen absent est refusé avant tout débit, et grisé chez le client.
   */
  methodes?(): Promise<PaymentMethod[]>;
  charge(request: ChargeRequest): Promise<ChargeResult>;
  verify(payment: PaymentSnapshot): Promise<VerifyResult>;
  /**
   * Vérifie la signature de la notification et en extrait l'événement.
   * Renvoie `null` dès que la signature est absente, fausse ou illisible : le
   * webhook est public, rien d'autre ne le protège.
   */
  parseWebhook(rawBody: string, headers: Headers): WebhookEvent | null;
}

/** Vocabulaire des opérateurs → le nôtre. */
export function normalizeStatus(raw: unknown): PaymentStatus {
  const value = String(raw ?? "").toUpperCase();
  if (/SUCCESS|SUCCEED|COMPLET|PAID|CONFIRM|APPROV/.test(value)) return "paid";
  if (/EXPIR|TIMEOUT|TIMED_OUT/.test(value)) return "expired";
  if (/FAIL|CANCEL|REJECT|DECLIN|REFUS|ERROR|INSUFFICIENT/.test(value)) return "failed";
  return "pending";
}
