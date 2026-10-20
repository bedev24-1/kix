import type { NextConfig } from "next";

/**
 * L'hôte de stockage, déclaré au moment de la construction.
 *
 * `next/image` refuse un domaine distant qu'on ne lui a pas annoncé — sans
 * cette entrée, une image téléversée sur Supabase ne s'afficherait nulle part.
 * La variable doit donc exister *à la construction*, pas seulement à
 * l'exécution.
 */
function hoteStockage(): { protocol: "http" | "https"; hostname: string; port?: string } | null {
  const brut = process.env.SUPABASE_URL?.trim();
  if (!brut) return null;
  try {
    const u = new URL(brut);
    // Le protocole suit l'URL : figé sur https, un Supabase servi en clair
    // derrière un proxy ne correspondrait à aucun motif, et ses images
    // seraient refusées sans que rien ne le dise.
    return {
      protocol: u.protocol === "http:" ? "http" : "https",
      hostname: u.hostname,
      ...(u.port ? { port: u.port } : {}),
    };
  } catch {
    console.warn(`[mb] SUPABASE_URL « ${brut} » n'est pas une URL : les images téléversées ne s'afficheront pas.`);
    return null;
  }
}

const hote = hoteStockage();

const nextConfig: NextConfig = {
  /**
   * Le dossier `.next/standalone` : l'application et ses seules dépendances
   * utiles, prêtes à être copiées dans une image sans `node_modules`.
   *
   * Il s'ajoute à la sortie habituelle sans la remplacer — `next start`
   * continue de fonctionner à l'identique.
   */
  output: "standalone",

  // Le driver libsql embarque des binaires natifs : il reste hors du bundle.
  serverExternalPackages: ["@libsql/client", "libsql"],

  images: {
    remotePatterns: hote ? [{ ...hote, pathname: "/storage/v1/object/public/**" }] : [],
  },

  /**
   * Le préfixe exact des images que l'optimiseur accepte.
   *
   * `<Photo>` s'en sert pour trancher : nos propres images passent par
   * l'optimiseur, une adresse collée à la main est servie telle quelle —
   * l'optimiseur n'accepte que ce qui est déclaré ci-dessus, et lui ouvrir un
   * hôte de plus ferait de lui un relais d'images public.
   *
   * C'est bien le préfixe entier qu'on compare, et non le seul nom d'hôte :
   * deux services sur la même machine ne diffèrent que par leur port, et une
   * comparaison de nom d'hôte les confondrait — ma première version le
   * faisait, et envoyait une image étrangère à l'optimiseur, qui l'aurait
   * refusée en production.
   *
   * Rien de secret ici : ce préfixe figure déjà dans l'adresse de chaque
   * image téléversée.
   */
  env: {
    NEXT_PUBLIC_MB_STORAGE_PREFIX: hote
      ? `${hote.protocol}://${hote.hostname}${hote.port ? `:${hote.port}` : ""}/storage/v1/object/public/`
      : "",
  },
};

export default nextConfig;
