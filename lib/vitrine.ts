/**
 * La vitrine d'un événement : ce que montre sa page publique au-delà de
 * l'affiche — une vidéo, une galerie, les artistes, la musique.
 *
 * Rangée dans une seule colonne JSON : ce sont des ornements, jamais des
 * critères de recherche, et chaque section absente disparaît simplement de
 * la page. Pas de `server-only` : le schéma en importe le type.
 */

export type Artiste = { nom: string; photo: string; bio: string };

export type Vitrine = {
  /** Le texte court, ligne à ligne, à côté de l'affiche. */
  manifeste?: string;
  /** YouTube, Vimeo, ou un fichier vidéo direct. */
  video?: string;
  galerie?: string[];
  artistes?: Artiste[];
  /** Un lien Spotify : artiste, album, titre ou playlist. */
  musique?: string;
  /** Le formulaire « Nous contacter » en bas de page. */
  contact?: boolean;
};

export const GALERIE_MAX = 8;
export const ARTISTES_MAX = 4;

const texte = (fd: FormData, cle: string, max = 2000) => String(fd.get(cle) ?? "").trim().slice(0, max);

/** Une adresse d'image acceptable : un chemin du site ou une URL https. */
const image = (v: string) => (v.startsWith("/") || /^https:\/\/\S+$/i.test(v) ? v : "");

export function lireVitrine(fd: FormData): Vitrine {
  const galerie = Array.from({ length: GALERIE_MAX }, (_, i) => image(texte(fd, `galerie_${i}`, 600))).filter(Boolean);
  const artistes = Array.from({ length: ARTISTES_MAX }, (_, i) => ({
    nom: texte(fd, `artiste_${i}_nom`, 60),
    photo: image(texte(fd, `artiste_${i}_photo`, 600)),
    bio: texte(fd, `artiste_${i}_bio`, 600),
  })).filter((a) => a.nom);
  return {
    manifeste: texte(fd, "manifeste"),
    video: texte(fd, "video", 600),
    galerie,
    artistes,
    musique: texte(fd, "musique", 600),
    contact: fd.get("contact") === "on",
  };
}

/** L'adresse à mettre dans un `<iframe>`, ou `null` pour un fichier vidéo direct. */
export function videoIntegree(url: string): string | null {
  try {
    const u = new URL(url);
    const hote = u.hostname.replace(/^www\.|^m\./, "");
    if (hote === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (hote === "youtube.com") {
      const id = u.searchParams.get("v") || u.pathname.match(/\/(?:shorts|embed|live)\/([^/?]+)/)?.[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (hote === "vimeo.com") {
      const id = u.pathname.match(/\/(\d+)/)?.[1];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

/** Un lien Spotify partagé, transformé en lecteur intégré. */
export function spotifyIntegre(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "open.spotify.com") return null;
    const m = u.pathname.match(/\/(artist|album|track|playlist|show|episode)\/([A-Za-z0-9]+)/);
    return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?theme=0` : null;
  } catch {
    return null;
  }
}
