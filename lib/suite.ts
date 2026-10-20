/** Le cookie qui garde la destination d'un lien partagé pendant la connexion. */
export const SUITE_COOKIE = "mb_suite";

/**
 * Une destination acceptable : une page de l'application, rien d'autre.
 * Jamais une adresse externe — sinon la porte deviendrait un redirecteur
 * ouvert, prêt à servir n'importe quel hameçonnage.
 */
export function suiteValide(vers: string | null | undefined): string | null {
  const v = String(vers ?? "").trim();
  return /^\/app\/[a-z0-9][a-z0-9/_-]{0,180}$/i.test(v) && !v.includes("//") ? v : null;
}
