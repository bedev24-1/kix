import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, orderItems, orders, productReviews, products, users } from "@/db";

/** Une commande compte comme un achat dès qu'elle est payée. */
const ACHETEES = ["paid", "ready", "done"];

export type AvisVue = {
  id: string;
  note: number;
  texte: string;
  variante: string;
  date: string;
  nom: string;
  avatar: string | null;
};

export type ResumeAvis = {
  moyenne: number;
  total: number;
  /** Nombre d'avis par note, de 5 à 1. */
  repartition: [number, number, number, number, number];
  liste: AvisVue[];
};

export async function avisDuProduit(productId: string): Promise<ResumeAvis> {
  const [stats, liste] = await Promise.all([
    db
      .select({ note: productReviews.note, n: sql<number>`count(*)::int` })
      .from(productReviews)
      .where(eq(productReviews.productId, productId))
      .groupBy(productReviews.note),
    db
      .select({
        id: productReviews.id,
        note: productReviews.note,
        texte: productReviews.texte,
        variante: productReviews.variantLabel,
        date: productReviews.createdAt,
        nom: users.name,
        avatar: users.avatar,
      })
      .from(productReviews)
      .innerJoin(users, eq(users.id, productReviews.userId))
      .where(eq(productReviews.productId, productId))
      .orderBy(desc(productReviews.createdAt))
      .limit(20),
  ]);
  const repartition: ResumeAvis["repartition"] = [0, 0, 0, 0, 0];
  let total = 0;
  let somme = 0;
  for (const s of stats) {
    if (s.note < 1 || s.note > 5) continue;
    repartition[5 - s.note] = s.n;
    total += s.n;
    somme += s.note * s.n;
  }
  return {
    moyenne: total ? Math.round((somme / total) * 10) / 10 : 0,
    total,
    repartition,
    liste: liste.map((a) => ({ ...a, date: a.date.toISOString() })),
  };
}

/** Ce que ce client a acheté de cet article (la dernière déclinaison), ou null. */
export async function achatDuClient(userId: string, productId: string) {
  return (
    (
      await db
        .select({ variante: orderItems.variantLabel })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(and(eq(orders.userId, userId), eq(orderItems.productId, productId), inArray(orders.status, ACHETEES)))
        .orderBy(desc(orders.createdAt))
        .limit(1)
    )[0] ?? null
  );
}

export async function avisDuClient(userId: string, productId: string) {
  return (
    (
      await db
        .select()
        .from(productReviews)
        .where(and(eq(productReviews.userId, userId), eq(productReviews.productId, productId)))
        .limit(1)
    )[0] ?? null
  );
}

export type VendeurVue = { nom: string; avatar: string | null; maison: boolean; ventes: number; note: number; avis: number };

/**
 * Qui vend cet article : un vendeur de la place de marché, ou Master Shop
 * (les articles sans vendeur). Ses ventes et sa note portent sur tous ses
 * articles, pas seulement celui-ci.
 */
export async function vendeurDe(sellerId: string | null): Promise<VendeurVue> {
  const siens = sellerId ? eq(products.sellerId, sellerId) : isNull(products.sellerId);
  const [vendeur, ventes, notes] = await Promise.all([
    sellerId
      ? db.select({ nom: users.name, avatar: users.avatar }).from(users).where(eq(users.id, sellerId)).limit(1)
      : Promise.resolve([]),
    db
      .select({ n: sql<number>`coalesce(sum(${orderItems.qty}), 0)::int` })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .innerJoin(products, eq(products.id, orderItems.productId))
      .where(and(siens, inArray(orders.status, ACHETEES))),
    db
      .select({ moyenne: sql<number>`coalesce(avg(${productReviews.note}), 0)::float`, n: sql<number>`count(*)::int` })
      .from(productReviews)
      .innerJoin(products, eq(products.id, productReviews.productId))
      .where(siens),
  ]);
  const v = vendeur[0];
  return {
    nom: v?.nom ?? "Master Shop",
    avatar: v?.avatar ?? null,
    maison: !v,
    ventes: ventes[0]?.n ?? 0,
    note: Math.round((notes[0]?.moyenne ?? 0) * 10) / 10,
    avis: notes[0]?.n ?? 0,
  };
}
