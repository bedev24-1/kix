import { buyfacturation, buyfacturationConfigure } from "./buyfacturation";
import { pawapay, pawapayConfigured } from "./pawapay";
import { simulated } from "./simulated";
import type { PaymentProvider } from "./types";

export * from "./types";

/**
 * buyfacturation dès que son adresse et sa clé sont là (le compte pawaPay de
 * la maison passe par lui), sinon pawaPay en direct, sinon l'encaisseur de
 * démonstration. `MB_PAYMENT_PROVIDER` force l'un d'eux (utile en recette).
 */
export function paymentProvider(): PaymentProvider {
  const forced = process.env.MB_PAYMENT_PROVIDER?.trim().toLowerCase();
  if (forced === "buyfacturation") return buyfacturation;
  if (forced === "pawapay") return pawapay;
  if (forced === "simulated") return simulated;
  if (buyfacturationConfigure()) return buyfacturation;
  return pawapayConfigured() ? pawapay : simulated;
}

/** L'encaisseur qui a lancé un paiement : c'est lui qu'il faut interroger, même si la configuration a changé depuis. */
export function providerNamed(name: string): PaymentProvider {
  return [buyfacturation, pawapay, simulated].find((p) => p.name === name) ?? paymentProvider();
}
