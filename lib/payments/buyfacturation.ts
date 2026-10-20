import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  ChargeRequest,
  ChargeResult,
  PaymentMethod,
  PaymentProvider,
  PaymentSnapshot,
  PaymentStatus,
  VerifyResult,
  WebhookEvent,
} from "./types";

/**
 * Encaissement par buyfacturation (pay.buyticle.com).
 *
 * Un seul compte pawaPay pour toute la maison, et pawaPay n'accepte qu'une
 * adresse de rappel par compte : c'est donc buyfacturation qui lui parle, et
 * nous qui parlons à buyfacturation. Il nous prévient par une notification
 * signée avec notre clé ; on ne la croit pas pour autant — le webhook ne
 * retient que la référence, et le statut est redemandé avec la clé.
 */

const env = (key: string) => process.env[key]?.trim() ?? "";
const config = () => ({
  base: env("BUYFACT_URL").replace(/\/+$/, ""),
  cle: env("BUYFACT_API_KEY"),
  dialCode: env("PAWAPAY_DIAL_CODE") || "237",
});

export const buyfacturationConfigure = () => Boolean(config().base && config().cle);

const operateur: Record<PaymentMethod, "MTN" | "ORANGE"> = { momo: "MTN", om: "ORANGE" };

type Collecte = {
  reference?: string;
  statut?: string;
  raison?: string | null;
  error?: string;
};

const statut = (s: string | undefined): PaymentStatus =>
  s === "COMPLETED" ? "paid" : s === "FAILED" ? "failed" : s === "EXPIRED" ? "expired" : "pending";

async function appel(chemin: string, init: RequestInit = {}): Promise<{ http: number; corps: Collecte }> {
  const { base, cle } = config();
  const reponse = await fetch(base + chemin, {
    ...init,
    signal: AbortSignal.timeout(20_000),
    headers: { "content-type": "application/json", "x-api-key": cle, ...(init.headers ?? {}) },
  });
  const corps = (await reponse.json().catch(() => ({}))) as Collecte;
  return { http: reponse.status, corps };
}

export const buyfacturation: PaymentProvider = {
  name: "buyfacturation",
  get live() {
    return buyfacturationConfigure();
  },

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    try {
      const { http, corps } = await appel("/api/v1/collectes", {
        method: "POST",
        body: JSON.stringify({
          reference: request.reference,
          montant: request.amount,
          numero: `${config().dialCode}${request.phone}`,
          operateur: operateur[request.method],
          description: request.description,
          callbackUrl: request.callbackUrl,
        }),
      });
      if (http >= 400 || corps.statut === "FAILED") {
        return { ok: false, error: corps.raison || corps.error || `buyfacturation HTTP ${http}`, detail: corps };
      }
      return {
        ok: true,
        providerRef: corps.reference ?? request.reference,
        status: "pending",
        instruction:
          request.method === "om"
            ? "Compose #150*50# et valide la demande avec ton code Orange Money."
            : "Compose *126# et valide la demande avec ton code MoMo.",
        detail: corps,
      };
    } catch (error) {
      return { ok: false, error: `buyfacturation injoignable : ${(error as Error).message}` };
    }
  },

  async verify(payment: PaymentSnapshot): Promise<VerifyResult> {
    try {
      const { http, corps } = await appel(`/api/v1/collectes/${encodeURIComponent(payment.reference)}`);
      if (http === 404) return { ok: true, status: "pending" };
      if (http >= 400) return { ok: false, error: corps.error || `buyfacturation HTTP ${http}` };
      return {
        ok: true,
        status: statut(corps.statut),
        providerRef: payment.providerRef,
        failureReason: corps.raison ?? undefined,
        detail: corps,
      };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  },

  parseWebhook(rawBody: string, headers: Headers): WebhookEvent | null {
    const { cle } = config();
    const donnee = headers.get("x-buyticle-signature")?.replace(/^sha256=/, "") ?? "";
    const attendue = createHmac("sha256", cle).update(rawBody).digest("hex");
    if (!cle || donnee.length !== attendue.length) return null;
    if (!timingSafeEqual(Buffer.from(donnee), Buffer.from(attendue))) return null;

    try {
      const corps = JSON.parse(rawBody) as Collecte;
      if (!corps.reference) return null;
      return { reference: corps.reference, status: statut(corps.statut), failureReason: corps.raison ?? undefined };
    } catch {
      return null;
    }
  },
};
