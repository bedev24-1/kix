"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, productReviews, products } from "@/db";
import { achatDuClient } from "@/lib/avis";
import { requireUser } from "@/lib/session";

/**
 * Noter un article. Réservé à qui l'a acheté : c'est ce qui rend vrai le
 * « Achat vérifié » de la fiche. Un second envoi remplace le premier avis.
 */
export async function noterArticle(
  productId: string,
  note: number,
  texte: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const n = Math.round(Number(note));
  if (!(n >= 1 && n <= 5)) return { ok: false, error: "Choisis une note de 1 à 5 étoiles." };
  const produit = (await db.select({ slug: products.slug }).from(products).where(eq(products.id, productId)).limit(1))[0];
  if (!produit) return { ok: false, error: "Article introuvable." };
  const achat = await achatDuClient(user.id, productId);
  if (!achat) return { ok: false, error: "Seuls les clients qui l'ont acheté peuvent le noter." };

  const valeurs = { note: n, texte: texte.trim().slice(0, 600), variantLabel: achat.variante, createdAt: new Date() };
  await db
    .insert(productReviews)
    .values({ productId, userId: user.id, ...valeurs })
    .onConflictDoUpdate({ target: [productReviews.productId, productReviews.userId], set: valeurs });

  revalidatePath(`/app/shop/${produit.slug}`);
  return { ok: true };
}
