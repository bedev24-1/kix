import type { MetadataRoute } from "next";

/**
 * Le manifeste de l'application installée.
 *
 * Il porte trois choses qui manquaient, et sans lesquelles rien ne
 * s'installait proprement :
 *
 *  · des icônes PNG. Une icône SVG suffit à Chrome, pas à iOS ni aux
 *    lanceurs Android, qui exigent du bitmap aux tailles attendues ;
 *  · une icône `maskable`, pour qu'Android la recadre dans sa forme plutôt
 *    que de poser un carré blanc autour ;
 *  · des raccourcis, qui apparaissent sur appui long de l'icône.
 *
 * `start_url` pointe sur `/app` : quelqu'un qui ouvre l'icône veut son Pass,
 * pas la page de présentation.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "Master Break — l'écosystème de l'excellence billard",
    short_name: "Master Break",
    description:
      "Jetons de billard, boutique, billetterie et tournois au Cameroun. Paiement Mobile Money.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#071a13",
    theme_color: "#071a13",
    lang: "fr",
    dir: "ltr",
    categories: ["sports", "entertainment", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Mon Master Pass", short_name: "Pass", url: "/app/pass" },
      { name: "Les directs", short_name: "Direct", url: "/direct" },
      { name: "Recharger", short_name: "Recharge", url: "/app/recharge" },
    ],
  };
}
