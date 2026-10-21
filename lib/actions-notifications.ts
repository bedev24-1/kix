"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db, notifications, users } from "@/db";
import { uid } from "@/lib/domain";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { requireRole } from "@/lib/session";

const texte = (fd: FormData, cle: string, max: number) => String(fd.get(cle) ?? "").trim().slice(0, max);
/** Un lien : interne (/app/…) ou https. Rien d'autre — pas de javascript:. */
const lien = (v: string) => (v.startsWith("/") && !v.startsWith("//") ? v : /^https:\/\/\S+$/i.test(v) ? v : "");

export type Cible = "tous" | "client" | "manager" | "seller" | "numero";
const ROLES: Record<Exclude<Cible, "tous" | "numero">, string> = { client: "client", manager: "manager", seller: "seller" };

/**
 * L'administration écrit une notification et l'envoie : à tout le monde, à
 * un public (joueurs, gérants, vendeurs) ou à un seul numéro. Elle arrive
 * dans la cloche de l'app et sonne sur les téléphones abonnés au push.
 */
export async function envoyerNotification(formData: FormData) {
  const admin = await requireRole("admin");
  const titre = texte(formData, "titre", 80);
  const corps = texte(formData, "texte", 400);
  const href = lien(texte(formData, "lien", 400));
  const cible = texte(formData, "cible", 10) as Cible;
  if (!titre) return { ok: false as const, error: "Il faut un titre." };
  if (texte(formData, "lien", 400) && !href) return { ok: false as const, error: "Lien : une page de l'app (/app/…) ou une adresse https." };

  let ids: string[];
  if (cible === "numero") {
    const phone = normalizePhone(texte(formData, "numero", 30));
    if (!isValidPhone(phone)) return { ok: false as const, error: "Numéro camerounais attendu." };
    ids = (await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1)).map((u) => u.id);
    if (!ids.length) return { ok: false as const, error: "Aucun compte avec ce numéro." };
  } else if (cible === "tous") {
    ids = (await db.select({ id: users.id }).from(users)).map((u) => u.id);
  } else if (cible in ROLES) {
    ids = (await db.select({ id: users.id }).from(users).where(eq(users.role, ROLES[cible as keyof typeof ROLES]))).map((u) => u.id);
  } else {
    return { ok: false as const, error: "Choisis à qui l'envoyer." };
  }
  if (!ids.length) return { ok: false as const, error: "Personne dans ce public pour l'instant." };

  // Par paquets : une insertion de dix mille lignes d'un coup dépasse la
  // limite de paramètres de Postgres.
  for (let i = 0; i < ids.length; i += 500) {
    await db.insert(notifications).values(
      ids.slice(i, i + 500).map((userId) => ({ id: uid(), userId, title: titre, body: corps, kind: "annonce", href: href || null, read: false })),
    );
  }
  console.log(`[mb] notification « ${titre} » envoyée par ${admin.name} à ${ids.length} compte(s) (${cible})`);

  // Le push, sans attendre : l'écrit en base fait foi, le téléphone suit.
  void import("@/lib/push")
    .then(async (m) => {
      for (let i = 0; i < ids.length; i += 200) await m.pousser(ids.slice(i, i + 200), "high");
    })
    .catch(() => {});

  revalidatePath("/admin/notifications");
  return { ok: true as const, destinataires: ids.length };
}

/** Retirer une annonce envoyée par erreur : elle disparaît de toutes les cloches. */
export async function retirerNotification(titre: string, envoyeeLe: string) {
  await requireRole("admin");
  const debut = new Date(envoyeeLe);
  if (Number.isNaN(debut.getTime())) return { ok: false as const };
  const lignes = await db
    .select({ id: notifications.id, createdAt: notifications.createdAt })
    .from(notifications)
    .where(and(eq(notifications.kind, "annonce"), eq(notifications.title, titre)));
  // Le même envoi : à la minute près (les paquets s'écrivent en quelques secondes).
  const memes = lignes.filter((l) => Math.abs(l.createdAt.getTime() - debut.getTime()) < 60_000).map((l) => l.id);
  for (let i = 0; i < memes.length; i += 500) {
    await db.delete(notifications).where(inArray(notifications.id, memes.slice(i, i + 500)));
  }
  revalidatePath("/admin/notifications");
  return { ok: true as const, retirees: memes.length };
}
