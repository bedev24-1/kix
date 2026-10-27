import { billetEcran, invitationEcran, lireEcran, toucherEcran } from "@/lib/screens";
import { eventStream } from "@/lib/sse";
import { hlsUrl, whepUrl } from "@/lib/stream";

export const dynamic = "force-dynamic";

/**
 * Le canal par lequel un écran reçoit ses ordres.
 *
 * Même mécanique que les scores : le serveur ne pousse que si la signature
 * change. Un écran qui montre la même chose depuis deux heures ne consomme
 * rien, et le SSE se reconnecte tout seul quand le wifi de la salle hoquette.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("t") ?? "";

  return eventStream({
    // Le billet est resigné à chaque passage : l'inclure dans la signature
    // ferait croire à un changement toutes les deux secondes, et rechargerait
    // le lecteur sans fin.
    signature: async () => {
      const lu = await lireEcran(token);
      if (!lu.ok) return "inconnu";
      return [
        lu.screen.venueId ?? "",
        lu.screen.name,
        lu.screen.pairingCode ?? "",
        lu.stream?.id ?? "",
        lu.stream?.status ?? "",
        lu.stream?.matchId ?? "",
      ].join("|");
    },

    payload: async () => {
      const lu = await lireEcran(token);
      if (!lu.ok) return { statut: "inconnu" as const };

      // Chaque passage vaut signe de vie : la présence affichée au gérant
      // reflète une connexion réellement ouverte, pas un ping qui peut mentir.
      await toucherEcran(lu.screen.id).catch(() => {});

      if (!lu.screen.venueId) {
        return { statut: "attente" as const, ...invitationEcran(lu.screen.pairingCode ?? "") };
      }
      if (!lu.stream) return { statut: "veille" as const, nom: lu.screen.name };

      const billet = billetEcran(lu.stream.id, lu.screen.id);
      return {
        statut: "diffuse" as const,
        nom: lu.screen.name,
        titre: lu.stream.title,
        direct: lu.stream.status === "live",
        // Le match suivi par ce direct : l'écran y branche la barre de score.
        matchId: lu.stream.matchId ?? null,
        whep: whepUrl(lu.stream, billet),
        hls: hlsUrl(lu.stream, billet),
      };
    },

    signal: request.signal,
  });
}
