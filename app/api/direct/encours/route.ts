import { eventStream } from "@/lib/sse";
import { getDirectsEnCours } from "@/lib/stream";

export const dynamic = "force-dynamic";

/** Le flux qui tient la bande de l'accueil à jour. */
export async function GET(request: Request) {
  return eventStream({
    // La signature ignore le nombre de spectateurs : il bouge à chaque
    // arrivée, et repousser toute la bande pour un chiffre qui change seul
    // ferait clignoter l'accueil sans rien apprendre. Le score, lui, compte.
    signature: async () =>
      (await getDirectsEnCours()).directs
        .map((d) => `${d.id}:${d.match ? `${d.match.a.score}-${d.match.b.score}-${d.match.a.aLaTable ? "a" : d.match.b.aLaTable ? "b" : ""}` : ""}`)
        .join(","),
    payload: getDirectsEnCours,
    signal: request.signal,
    interval: 5000,
  });
}
