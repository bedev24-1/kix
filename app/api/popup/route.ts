import { and, desc, eq, gt, inArray, lte } from "drizzle-orm";
import { db, popups } from "@/db";

export const dynamic = "force-dynamic";

/**
 * Les pop-ups en cours pour une page. Le navigateur choisit le premier que le
 * joueur n'a pas encore vu son plafond de fois aujourd'hui — un seul par visite.
 */
export async function GET(request: Request) {
  const page = new URL(request.url).searchParams.get("page") === "site" ? "site" : "app";
  const maintenant = new Date();
  const lignes = await db
    .select({
      id: popups.id,
      titre: popups.titre,
      modele: popups.modele,
      etiquette: popups.etiquette,
      surtitre: popups.surtitre,
      accroche: popups.accroche,
      texte: popups.texte,
      image: popups.image,
      bouton1Label: popups.bouton1Label,
      bouton1Url: popups.bouton1Url,
      bouton2Label: popups.bouton2Label,
      bouton2Url: popups.bouton2Url,
      parJour: popups.parJour,
    })
    .from(popups)
    .where(and(eq(popups.actif, true), lte(popups.debut, maintenant), gt(popups.fin, maintenant), inArray(popups.pages, [page, "tous"])))
    .orderBy(desc(popups.priorite), desc(popups.createdAt))
    .limit(5);
  return Response.json({ popups: lignes }, { headers: { "cache-control": "no-store" } });
}
