import "server-only";
import { headers } from "next/headers";

/**
 * L'adresse publique de l'application, telle que le visiteur la voit.
 *
 * Derrière le proxy de Coolify, le serveur Node écoute sur localhost : une
 * adresse construite à partir de la requête brute donnait des liens et des QR
 * en « http://localhost:3000/… ». On lit d'abord ce que le proxy transmet
 * (x-forwarded-host / proto), puis MB_PUBLIC_URL, jamais l'adresse interne.
 */
export async function urlPublique(): Promise<string> {
  const h = await headers();
  const hote = (h.get("x-forwarded-host") || h.get("host") || "").split(",")[0].trim();
  const proto = (h.get("x-forwarded-proto") || "https").split(",")[0].trim();
  if (hote && !/^(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(hote)) return `${proto}://${hote}`;
  return (process.env.MB_PUBLIC_URL?.trim() || "https://masterbreak.vps.buyticle.com").replace(/\/+$/, "");
}
