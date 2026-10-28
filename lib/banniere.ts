import "server-only";
import { and, asc, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { db, events, products, shopBanners, tournaments } from "@/db";
import { f } from "@/lib/format";

export type CartePromo = { id: string; titre: string; detail: string; image: string; bouton: string; lien: string };

export type GenreBanniere = "tournoi" | "evenement" | "produit" | "libre";

/** Ce qu'on peut mettre dans la bannière, prêt à recopier dans une carte. */
export type Promouvable = { kind: Exclude<GenreBanniere, "libre">; id: string; titre: string; detail: string; image: string; bouton: string; lien: string };

const IMAGE_TOURNOI = "/img/table-blue.jpg";

export async function elementsPromouvables(): Promise<Record<"tournoi" | "evenement" | "produit", Promouvable[]>> {
  const [ts, es, ps] = await Promise.all([
    db.select().from(tournaments).orderBy(desc(tournaments.createdAt)).limit(40),
    db.select().from(events).where(eq(events.active, true)).orderBy(desc(events.createdAt)).limit(40),
    db.select().from(products).where(eq(products.active, true)).orderBy(asc(products.category), asc(products.name)).limit(80),
  ]);
  return {
    tournoi: ts.map((t) => ({
      kind: "tournoi",
      id: t.id,
      titre: t.title,
      detail: `Tournoi ${t.discipline}`,
      image: IMAGE_TOURNOI,
      bouton: "S'inscrire",
      lien: `/app/tournois/${t.slug}`,
    })),
    evenement: es.map((e) => ({
      kind: "evenement",
      id: e.id,
      titre: e.title,
      detail: [e.day, e.hours].filter(Boolean).join(" · ") || e.subtitle,
      image: e.image,
      bouton: e.price > 0 ? "Réserver" : "Voir",
      lien: `/app/events/${e.slug}`,
    })),
    produit: ps.map((p) => ({
      kind: "produit",
      id: p.id,
      titre: p.name,
      detail: p.detail || f(p.price),
      image: p.image,
      bouton: "J'en profite",
      lien: `/app/shop/${p.slug}`,
    })),
  };
}

/** Toutes les cartes, pour l'administration. */
export async function toutesLesCartes() {
  return db.select().from(shopBanners).orderBy(asc(shopBanners.ordre), desc(shopBanners.createdAt));
}

/**
 * Les cartes affichées dans la bannière de la boutique : actives et dans leur
 * période. Sans aucune carte, deux cartes de service pour qu'elle ne soit
 * jamais vide.
 */
export async function cartesBanniere(): Promise<CartePromo[]> {
  const maintenant = new Date();
  const lignes = await db
    .select()
    .from(shopBanners)
    .where(
      and(
        eq(shopBanners.actif, true),
        or(isNull(shopBanners.debut), lte(shopBanners.debut, maintenant)),
        or(isNull(shopBanners.fin), gt(shopBanners.fin, maintenant)),
      ),
    )
    .orderBy(asc(shopBanners.ordre), desc(shopBanners.createdAt))
    .limit(8);
  if (lignes.length) {
    return lignes.map((b) => ({
      id: b.id,
      titre: b.titre,
      detail: b.detail,
      image: b.image || "/img/hall-neon.jpg",
      bouton: b.bouton || "Voir",
      lien: b.lien || "/app",
    }));
  }
  return [
    { id: "livraison", titre: "Livré ce soir", detail: "Commande avant 20 h · Douala", image: "/img/puffs.jpg", bouton: "Voir", lien: "/app/shop" },
    { id: "retrait", titre: "Retrait en 2 h", detail: "Au comptoir de ta salle", image: "/img/hall-neon.jpg", bouton: "Salles", lien: "/app/salles" },
  ];
}
