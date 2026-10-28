"use server";

import { revalidatePath } from "next/cache";
import { asc, eq, sql } from "drizzle-orm";
import { db, shopBanners } from "@/db";
import { elementsPromouvables, type GenreBanniere } from "@/lib/banniere";
import { requireRole } from "@/lib/session";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const date = (fd: FormData, k: string) => {
  const v = str(fd, k);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00+01:00`) : null;
};

function rafraichir() {
  revalidatePath("/admin/promotions");
  revalidatePath("/app/shop", "layout");
}

/**
 * Ajouter une carte : l'élément choisi (« tournoi:<id> », « produit:<id> »…)
 * donne titre, détail, image et lien ; ce que l'admin a saisi l'emporte.
 */
export async function ajouterCarte(fd: FormData) {
  await requireRole("admin");
  const [genre, ref] = str(fd, "element").split(":") as [GenreBanniere | "", string | undefined];
  let base = { kind: "libre" as GenreBanniere, refId: null as string | null, titre: "", detail: "", image: "", bouton: "Voir", lien: "/app" };
  if (genre && genre !== "libre" && ref) {
    const tous = await elementsPromouvables();
    const el = tous[genre]?.find((e) => e.id === ref);
    if (el) base = { kind: genre, refId: el.id, titre: el.titre, detail: el.detail, image: el.image, bouton: el.bouton, lien: el.lien };
  }
  const titre = str(fd, "titre") || base.titre;
  if (!titre) return;
  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${shopBanners.ordre}), -1)::int` }).from(shopBanners);
  await db.insert(shopBanners).values({
    ...base,
    titre: titre.slice(0, 60),
    detail: (str(fd, "detail") || base.detail).slice(0, 80),
    image: str(fd, "image") || base.image,
    bouton: (str(fd, "bouton") || base.bouton).slice(0, 18),
    lien: str(fd, "lien") || base.lien,
    ordre: max + 1,
    debut: date(fd, "debut"),
    fin: date(fd, "fin"),
  });
  rafraichir();
}

export async function modifierCarte(fd: FormData) {
  await requireRole("admin");
  const id = str(fd, "id");
  if (!id) return;
  await db
    .update(shopBanners)
    .set({
      titre: str(fd, "titre").slice(0, 60) || "Promotion",
      detail: str(fd, "detail").slice(0, 80),
      image: str(fd, "image"),
      bouton: str(fd, "bouton").slice(0, 18) || "Voir",
      lien: str(fd, "lien") || "/app",
      actif: fd.get("actif") === "on",
      debut: date(fd, "debut"),
      fin: date(fd, "fin"),
    })
    .where(eq(shopBanners.id, id));
  rafraichir();
}

/** Monter ou descendre une carte d'un cran dans l'ordre de passage. */
export async function deplacerCarte(fd: FormData) {
  await requireRole("admin");
  const id = str(fd, "id");
  const sens = str(fd, "sens") === "haut" ? -1 : 1;
  const toutes = await db.select({ id: shopBanners.id }).from(shopBanners).orderBy(asc(shopBanners.ordre), asc(shopBanners.createdAt));
  const i = toutes.findIndex((c) => c.id === id);
  const j = i + sens;
  if (i < 0 || j < 0 || j >= toutes.length) return;
  [toutes[i], toutes[j]] = [toutes[j], toutes[i]];
  await Promise.all(toutes.map((c, k) => db.update(shopBanners).set({ ordre: k }).where(eq(shopBanners.id, c.id))));
  rafraichir();
}

export async function retirerCarte(fd: FormData) {
  await requireRole("admin");
  const id = str(fd, "id");
  if (id) await db.delete(shopBanners).where(eq(shopBanners.id, id));
  rafraichir();
}
