import "server-only";
import { createHash } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db, pushSubscriptions } from "@/db";
import { cles, jeton, TTL } from "@/lib/vapid";
import { derniereRaisonFcm, envoyerFcm, fcmConfigure } from "@/lib/fcm";

export { pushConfigure } from "@/lib/vapid";
export { fcmConfigure, projetFcm } from "@/lib/fcm";

/** Un chemin d'envoi, quel qu'il soit, est-il ouvert ? */
export const envoiPossible = () => Boolean(cles()) || fcmConfigure();

/**
 * Web Push, sans dépendance et sans Firebase.
 *
 * Il n'y a pas besoin de FCM. Le navigateur — Chrome, Firefox, Safari, et
 * Safari iOS depuis la version 16.4 — expose la même API standard (W3C Push
 * + RFC 8030) et donne un `endpoint` qui pointe déjà vers le service de son
 * éditeur : FCM pour Chrome, Mozilla autopush pour Firefox, APNs pour Safari.
 * Le SDK Firebase n'est qu'une enveloppe autour de cette API : l'utiliser
 * obligerait à un compte Google, une clé de serveur et un second service
 * worker, pour envoyer exactement la même requête HTTP.
 *
 * On signe donc nos envois avec VAPID — une paire de clés à nous, qui
 * identifie l'expéditeur auprès de n'importe quel service de push.
 *
 * Le message part **sans contenu**. C'est délibéré : chiffrer une charge
 * utile (aes128gcm, ECDH, HKDF) est la seule partie vraiment difficile du
 * protocole, et elle n'apporte rien ici puisque le service worker peut aller
 * chercher la notification chez nous, avec le cookie de session. Le service
 * de push d'Apple ou de Google ne voit ainsi jamais le contenu — ce qui vaut
 * mieux que de le lui confier chiffré.
 */

export type Envoi = { envoyes: number; retires: number; ignores: number; raisons: string[] };

/**
 * Pousse un signal vers tous les navigateurs d'un compte.
 *
 * Un endpoint mort — 404 ou 410 — est supprimé : c'est la seule façon dont un
 * service de push nous dit qu'une installation a disparu, et garder ces
 * lignes ferait grossir la table sans fin.
 */
export async function pousser(userIds: string[], urgence: "normal" | "high" = "normal"): Promise<Envoi> {
  const cfg = cles();
  const vide: Envoi = { envoyes: 0, retires: 0, ignores: 0, raisons: [] };
  if (userIds.length === 0) return vide;
  // Aucun des deux chemins n'est configuré : il n'y a rien à tenter.
  if (!cfg && !fcmConfigure()) return vide;

  const abonnements = await db
    .select()
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, [...new Set(userIds)]));
  if (abonnements.length === 0) return vide;

  // Pourquoi un appareil n'a rien reçu : une ligne par cause, pour l'essai.
  const raisons = new Set<string>();

  const resultats = await Promise.allSettled(
    abonnements.map(async (a) => {
      // Un jeton Firebase passe par FCM, un endpoint par le protocole
      // standard. Les deux cohabitent : un compte peut avoir été enregistré
      // d'une façon puis de l'autre, selon ce qui était configuré ce jour-là.
      if (a.provider === "fcm") {
        const sortie = await envoyerFcm(a.endpoint, urgence);
        if (sortie === "mort") {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, a.id));
          return "retire" as const;
        }
        if (sortie === "ignore") {
          raisons.add(`Firebase : ${derniereRaisonFcm || "refus"}`);
          return "ignore" as const;
        }
        await db.update(pushSubscriptions).set({ lastSeenAt: new Date() }).where(eq(pushSubscriptions.id, a.id));
        return "envoye" as const;
      }

      if (!cfg) {
        raisons.add(
          "Push standard : VAPID_PRIVATE_KEY absente ou ne correspondant pas à NEXT_PUBLIC_VAPID_PUBLIC_KEY",
        );
        return "ignore" as const;
      }
      const origine = new URL(a.endpoint).origin;
      const reponse = await fetch(a.endpoint, {
        method: "POST",
        headers: {
          TTL: String(TTL),
          Urgency: urgence,
          "Content-Length": "0",
          Authorization: `vapid t=${jeton(origine, cfg)}, k=${cfg.publique}`,
        },
      });

      if (reponse.status === 404 || reponse.status === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, a.id));
        return "retire" as const;
      }
      if (!reponse.ok) {
        const detail = (await reponse.text().catch(() => "")).slice(0, 160);
        raisons.add(`Push standard ${new URL(a.endpoint).host} ${reponse.status} ${detail}`.trim());
        return "ignore" as const;
      }

      await db.update(pushSubscriptions).set({ lastSeenAt: new Date() }).where(eq(pushSubscriptions.id, a.id));
      return "envoye" as const;
    }),
  );

  const compte = (quoi: string) =>
    resultats.filter((r) => r.status === "fulfilled" && r.value === quoi).length;

  return {
    envoyes: compte("envoye"),
    retires: compte("retire"),
    ignores: compte("ignore") + resultats.filter((r) => r.status === "rejected").length,
    raisons: [
      ...raisons,
      ...resultats.flatMap((r) => (r.status === "rejected" ? [`Erreur : ${String(r.reason).slice(0, 160)}`] : [])),
    ],
  };
}

/** L'empreinte d'un endpoint, pour les journaux : jamais l'endpoint entier. */
export const empreinte = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex").slice(0, 12);

export { nouvellesCles } from "@/lib/vapid";
