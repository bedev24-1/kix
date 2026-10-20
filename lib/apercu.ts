import "server-only";
import type { Metadata } from "next";
import { urlPublique } from "@/lib/url-publique";

/**
 * L'aperçu d'un lien partagé : ce que WhatsApp, Facebook ou Telegram montrent
 * avant même qu'on l'ouvre. Une image, un titre, une ligne qui donne envie —
 * le jour, le lieu, le prix. C'est souvent tout ce que le public lira.
 */
export async function metadonneesApercu({
  titre,
  description,
  image,
  chemin,
}: {
  titre: string;
  description: string;
  image: string;
  chemin: string;
}): Promise<Metadata> {
  const base = await urlPublique();
  // Une image interne (« /img/… ») n'est pas une adresse : les robots de
  // partage veulent une URL complète.
  const img = /^https?:\/\//i.test(image) ? image : `${base}${image.startsWith("/") ? "" : "/"}${image}`;
  const url = `${base}${chemin}`;
  const desc = description.replace(/\s+/g, " ").trim().slice(0, 200);
  return {
    title: titre,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: "Master Break",
      locale: "fr_FR",
      title: titre,
      description: desc,
      url,
      images: [{ url: img, width: 1200, height: 630, alt: titre }],
    },
    twitter: { card: "summary_large_image", title: titre, description: desc, images: [img] },
  };
}

/** « 3 000 F » ou « Entrée libre ». */
export const prixLisible = (n: number) => (n > 0 ? `${n.toLocaleString("fr-FR")} F` : "Entrée libre");
