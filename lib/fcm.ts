import { createPrivateKey, createSign } from "node:crypto";

/**
 * Envoi par Firebase Cloud Messaging, API HTTP v1.
 *
 * Deux requêtes, et aucune dépendance : on échange un JWT signé par le compte
 * de service contre un jeton d'accès Google, puis on poste le message. Le SDK
 * Admin de Firebase ne fait rien d'autre, avec une centaine de mégaoctets de
 * plus.
 *
 * Le compte de service, lui, est un vrai secret — contrairement à la clé d'API
 * web. Il vit dans l'environnement, jamais dans le dépôt.
 *
 * Le message part **sans contenu**, comme les envois standards : le service
 * worker vient lire la notification chez nous avec le cookie de session.
 * Google voit donc passer un signal vide, pas ce qu'il annonce.
 */

type CompteDeService = {
  client_email: string;
  private_key: string;
  project_id: string;
};

/**
 * Le compte de service, sous l'une des trois formes qu'on rencontre.
 *
 * Firebase le livre en fichier `.json` téléchargé, et une variable
 * d'environnement ne prend pas un fichier. Trois chemins, donc, du plus
 * commode au plus brut :
 *
 *  1. deux variables — `FIREBASE_CLIENT_EMAIL` et `FIREBASE_PRIVATE_KEY` —
 *     recopiées depuis le fichier. C'est le plus simple : deux champs à
 *     sélectionner, rien à encoder ;
 *  2. `FIREBASE_SERVICE_ACCOUNT` — ou `FIREBASE_SERVICE_ACCOUNT_JSON` — avec
 *     le JSON entier collé tel quel ;
 *  3. le même, encodé en base64, pour les hébergeurs qui abîment les
 *     retours à la ligne.
 *
 * Dans tous les cas, les « \n » littéraux de la clé privée sont remis en
 * vrais sauts de ligne : c'est ainsi que le JSON les stocke, et OpenSSL
 * refuse une clé qui les garde échappés.
 */
function compte(): CompteDeService | null {
  const separe = compteEnDeuxVariables();
  if (separe) return separe;

  // Deux noms pour la même chose : `FIREBASE_SERVICE_ACCOUNT_JSON` est celui
  // qu'emploient les autres services de la maison, et un déploiement se fait
  // en recopiant un bloc de variables d'un projet à l'autre. Refuser le nom
  // voisin ne protégerait rien, et coûterait une soirée de recherche.
  const brut =
    process.env.FIREBASE_SERVICE_ACCOUNT?.trim() || process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!brut) return null;

  const texte = brut.startsWith("{") ? brut : Buffer.from(brut, "base64").toString("utf8");
  try {
    const lu = JSON.parse(texte) as CompteDeService;
    if (!lu.client_email || !lu.private_key || !lu.project_id) return null;
    return { ...lu, private_key: remettreLesSauts(lu.private_key) };
  } catch {
    return null;
  }
}

/** La forme à deux variables, recopiée à la main depuis le fichier. */
function compteEnDeuxVariables(): CompteDeService | null {
  const client_email = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const brut = process.env.FIREBASE_PRIVATE_KEY?.trim();
  const project_id =
    process.env.FIREBASE_PROJECT_ID?.trim() || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!client_email || !brut || !project_id) return null;

  // Certaines interfaces ajoutent des guillemets autour de la valeur collée.
  const sansGuillemets = brut.replace(/^["']|["']$/g, "");
  return { client_email, private_key: remettreLesSauts(sansGuillemets), project_id };
}

/**
 * Remettre une clé privée en état de servir.
 *
 * Trois abîmes possibles entre le fichier et la variable d'environnement, et
 * on les répare tous les trois :
 *
 *  · les « \n » littéraux du JSON, qu'OpenSSL refuse tels quels ;
 *  · les « \r\n » de Windows, qui font échouer la lecture du PEM ;
 *  · les sauts de ligne purement et simplement mangés par l'interface, qui
 *    laissent une seule ligne interminable. Là, on recoupe le corps en
 *    lignes de 64 caractères, comme le veut le format.
 *
 * Sans cette dernière réparation, la clé reste illisible et l'envoi échoue
 * sans rien dire — c'est exactement le genre de panne qu'on met une soirée
 * à comprendre.
 */
function remettreLesSauts(cle: string): string {
  const propre = cle.replace(/\\r\\n|\\n/g, "\n").replace(/\r\n/g, "\n").trim();

  const entete = "-----BEGIN PRIVATE KEY-----";
  const pied = "-----END PRIVATE KEY-----";
  if (!propre.includes(entete)) return propre;
  if (propre.includes("\n")) return propre.endsWith("\n") ? propre : `${propre}\n`;

  // Une seule ligne : on la recompose.
  const corps = propre.slice(propre.indexOf(entete) + entete.length, propre.indexOf(pied)).replace(/\s+/g, "");
  const lignes = corps.match(/.{1,64}/g) ?? [];
  return `${entete}\n${lignes.join("\n")}\n${pied}\n`;
}

/**
 * La clé est-elle utilisable ?
 *
 * On le vérifie avant d'envoyer quoi que ce soit : sans cela, la signature
 * lève une exception au fond d'un `Promise.allSettled`, où elle est comptée
 * comme un envoi ignoré — et rien, nulle part, ne dit pourquoi.
 */
function cleLisible(pem: string): boolean {
  try {
    createPrivateKey(pem);
    return true;
  } catch {
    return false;
  }
}

export const fcmConfigure = () => compte() !== null;

const b64url = (v: string | Buffer) =>
  Buffer.from(v).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/**
 * Le jeton d'accès, gardé en mémoire jusqu'à son expiration.
 *
 * Google en délivre un valable une heure. Le redemander à chaque notification
 * ajouterait un aller-retour à chaque jeton crédité, pour rien.
 */
let cache: { jeton: string; expire: number } | null = null;

async function jetonAcces(sa: CompteDeService): Promise<string | null> {
  if (cache && cache.expire > Date.now() + 60_000) return cache.jeton;

  const maintenant = Math.floor(Date.now() / 1000);
  const entete = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const corps = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: maintenant,
      exp: maintenant + 3600,
    }),
  );
  const signature = b64url(
    createSign("RSA-SHA256").update(`${entete}.${corps}`).end().sign(sa.private_key),
  );

  const reponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${entete}.${corps}.${signature}`,
    }),
  });
  if (!reponse.ok) return null;

  const lu = (await reponse.json()) as { access_token?: string; expires_in?: number };
  if (!lu.access_token) return null;

  cache = { jeton: lu.access_token, expire: Date.now() + (lu.expires_in ?? 3600) * 1000 };
  return lu.access_token;
}

export type SortieFcm = "envoye" | "mort" | "ignore";

/** La raison du dernier refus, pour l'écran d'essai : sans elle, « ignoré » ne dit rien. */
export let derniereRaisonFcm = "";
const refus = (raison: string): SortieFcm => {
  derniereRaisonFcm = raison;
  return "ignore";
};

/**
 * Pousse un signal vers un jeton d'enregistrement.
 *
 * `mort` signale un jeton qu'il faut retirer : c'est ainsi que FCM annonce
 * une application désinstallée ou des données de navigateur effacées.
 */
export async function envoyerFcm(token: string, urgence: "normal" | "high" = "normal"): Promise<SortieFcm> {
  const sa = compte();
  if (!sa) return refus("compte de service Firebase absent du serveur");

  if (!cleLisible(sa.private_key)) {
    console.error(
      "[mb] La clé privée Firebase est illisible. Recopie la valeur de `private_key` telle qu'elle " +
        "figure dans le fichier .json — avec ses « \\n » — dans FIREBASE_PRIVATE_KEY, ou colle le " +
        "JSON entier dans FIREBASE_SERVICE_ACCOUNT_JSON. Aucune notification ne partira par Firebase d'ici là.",
    );
    return refus("FIREBASE_PRIVATE_KEY illisible");
  }

  const acces = await jetonAcces(sa);
  if (!acces) return refus("Google refuse le compte de service (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY)");

  const reponse = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${acces}`, "content-type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          // Aucun `notification` : c'est le service worker qui composera la
          // bulle après avoir lu la notification chez nous. Un bloc
          // `notification` ferait afficher le texte par le navigateur, et le
          // ferait donc transiter par Google.
          data: { mb: "1" },
          webpush: {
            headers: { TTL: "43200", Urgency: urgence },
          },
        },
      }),
    },
  );

  if (reponse.ok) return "envoye";

  // 404 : jeton inconnu. 400 avec INVALID_ARGUMENT sur le jeton : idem.
  if (reponse.status === 404) return "mort";
  const detail = await reponse.text().catch(() => "");
  if (reponse.status === 403 || detail.includes("UNREGISTERED") || detail.includes("registration-token-not-registered")) {
    if (reponse.status !== 403) return "mort";
  }
  // Le message de Google tel quel, raccourci : THIRD_PARTY_AUTH_ERROR,
  // SENDER_ID_MISMATCH… c'est lui qui dit quelle clé ne va pas.
  const message = (() => {
    try {
      const lu = JSON.parse(detail) as { error?: { status?: string; message?: string } };
      return [lu.error?.status, lu.error?.message].filter(Boolean).join(" : ");
    } catch {
      return detail;
    }
  })();
  return refus(`FCM ${reponse.status} ${message}`.slice(0, 240));
}

/** La clé telle qu'elle sera signée. Exposée pour que la suite l'éprouve. */
export const lireClePourTest = () => compte()?.private_key ?? null;

/** Le projet visé, pour les écrans de diagnostic. */
export const projetFcm = () => compte()?.project_id ?? null;
