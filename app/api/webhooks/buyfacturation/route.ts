import { buyfacturation } from "@/lib/payments/buyfacturation";
import { confirmFromProvider } from "@/lib/payments/service";

/**
 * Notification de buyfacturation : une collecte a changé de statut.
 *
 * La signature (HMAC de notre clé) écarte les inconnus ; et même signée, la
 * notification ne crédite rien par elle-même : on n'en garde que la
 * référence, puis on redemande le statut à buyfacturation.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const event = buyfacturation.parseWebhook(raw, request.headers);
  if (!event) return Response.json({ error: "notification non signée" }, { status: 401 });

  const payment = await confirmFromProvider(event.reference);
  if (!payment) return Response.json({ ok: true, unknown: true });
  return Response.json({ ok: true, status: payment.status });
}

export async function GET() {
  return Response.json({ ok: true, provider: "buyfacturation", live: buyfacturation.live });
}
