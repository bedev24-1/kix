import "server-only";
import { randomBytes } from "node:crypto";

/**
 * Dépôt d'images sur Supabase Storage.
 *
 * Les fiches — salles, produits, événements, cours — ne portaient que des
 * chemins vers `public/img`, livrés avec le code : ajouter une salle
 * supposait un déploiement. On téléverse maintenant, et l'adresse publique
 * part en base.
 *
 * On parle à l'API REST directement plutôt que d'ajouter une dépendance : un
 * `POST` et un `GET`, autant les écrire.
 *
 * La clé de service ne vit que dans l'environnement — jamais dans le dépôt,
 * jamais renvoyée au navigateur. Tout passe par le serveur.
 */

const BUCKET = process.env.SUPABASE_BUCKET?.trim() || "mb-public";

/** Ce qu'on accepte, et jusqu'où. Le reste est refusé avant d'être lu. */
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};
const TAILLE_MAX = 5 * 1024 * 1024;

type Config = { url: string; key: string };

function config(): Config | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return url && key ? { url, key } : null;
}

/** Le téléversement est-il disponible ? L'interface s'adapte plutôt que d'échouer. */
export const stockageConfigure = () => config() !== null;

export type Depot =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Le seau, créé à la demande et public en lecture.
 *
 * Les images de fiches sont affichées à tout le monde : les servir derrière
 * une URL signée qui expire obligerait à re-signer à chaque rendu, pour
 * protéger une photo de salle que la salle elle-même affiche sur sa vitrine.
 */
async function assurerSeau({ url, key }: Config) {
  const commun = { apikey: key, authorization: `Bearer ${key}` };

  const existe = await fetch(`${url}/storage/v1/bucket/${BUCKET}`, { headers: commun });
  if (existe.ok) return;

  await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...commun, "content-type": "application/json" },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: true,
      file_size_limit: TAILLE_MAX,
      allowed_mime_types: Object.keys(TYPES),
    }),
  });
}

/**
 * Téléverse un fichier et renvoie son adresse publique.
 *
 * Le nom est tiré au sort plutôt que repris du fichier : un nom d'origine
 * peut contenir n'importe quoi, et deux gérants qui envoient tous deux
 * « photo.jpg » écraseraient l'image l'un de l'autre.
 */
export async function deposerImage(fichier: File, dossier = "divers"): Promise<Depot> {
  const cfg = config();
  if (!cfg) return { ok: false, error: "Le stockage n'est pas configuré sur ce serveur." };

  const ext = TYPES[fichier.type];
  if (!ext) return { ok: false, error: "Format refusé. Envoie un JPEG, PNG, WebP, AVIF ou GIF." };
  if (fichier.size === 0) return { ok: false, error: "Fichier vide." };
  if (fichier.size > TAILLE_MAX) {
    return { ok: false, error: `Image trop lourde (${Math.round(fichier.size / 1024 / 1024)} Mo). Maximum 5 Mo.` };
  }

  await assurerSeau(cfg).catch(() => {
    /* le seau existe peut-être déjà, ou nous manquons de droits : le dépôt
       qui suit dira lequel, avec un message de Supabase plutôt qu'un nôtre */
  });

  const nom = `${dossier.replace(/[^a-z0-9-]/gi, "") || "divers"}/${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;

  const reponse = await fetch(`${cfg.url}/storage/v1/object/${BUCKET}/${nom}`, {
    method: "POST",
    headers: {
      apikey: cfg.key,
      authorization: `Bearer ${cfg.key}`,
      "content-type": fichier.type,
      "cache-control": "31536000",
    },
    body: new Uint8Array(await fichier.arrayBuffer()),
  });

  if (!reponse.ok) return { ok: false, error: await expliquer(reponse, cfg) };

  return { ok: true, url: `${cfg.url}/storage/v1/object/public/${BUCKET}/${nom}` };
}

/**
 * Pourquoi le dépôt a échoué, en une phrase qu'on peut suivre.
 *
 * On renvoyait les cent soixante premiers caractères de la réponse : quand
 * l'adresse configurée n'est pas un Supabase, cela veut dire une page HTML
 * déversée dans l'interface, et personne n'y lit la cause. Une page de
 * navigateur à cet endroit ne dit qu'une chose, et il faut la dire.
 */
async function expliquer(reponse: Response, cfg: Config): Promise<string> {
  const type = reponse.headers.get("content-type") ?? "";
  const corps = await reponse.text().catch(() => "");
  const html = type.includes("text/html") || corps.trimStart().startsWith("<");

  if (html) {
    return (
      `L'adresse ${cfg.url} répond une page web, pas un Supabase Storage. ` +
      `Vérifie SUPABASE_URL sur le serveur : elle doit pointer sur ton Supabase, ` +
      `pas sur le site. En attendant, colle l'adresse d'une image dans le champ.`
    );
  }

  // Supabase répond du JSON : son message est bien plus utile que le nôtre.
  const message = (() => {
    try {
      const j = JSON.parse(corps) as { message?: string; error?: string };
      return j.message || j.error || "";
    } catch {
      return corps.slice(0, 140);
    }
  })();

  if (reponse.status === 401 || reponse.status === 403) {
    return `Dépôt refusé (${reponse.status}) : la clé de service est absente ou périmée. ${message}`.trim();
  }
  if (reponse.status === 404) {
    // Sur le Supabase du VPS, la base (rest.…) et les fichiers (storage.…)
    // ont chacun leur adresse : pointer SUPABASE_URL sur la base donnait ce
    // 404, alors que le seau existait bel et bien.
    return (
      `Le seau « ${BUCKET} » est introuvable à ${cfg.url}. Si le seau existe, SUPABASE_URL ` +
      `pointe sans doute sur la base plutôt que sur le stockage (storage.…). ${message}`
    ).trim();
  }
  return `Dépôt refusé (${reponse.status})${message ? ` — ${message}` : ""}`;
}

/** L'hôte de stockage, pour que `next/image` accepte d'en servir les images. */
export function hoteStockage(): string | null {
  const url = process.env.SUPABASE_URL?.trim();
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
