import { signatureDuTableau } from "@/lib/tournoi-direct";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

/** L'empreinte des tableaux demandés : publique, elle ne dit rien d'autre qu'« il y a du nouveau ». */
export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get("ids") ?? "").split(",").filter((id) => UUID.test(id)).slice(0, 8);
  return Response.json({ signature: await signatureDuTableau(ids) }, { headers: { "cache-control": "no-store" } });
}
