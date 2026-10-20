"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, popups } from "@/db";
import { uid } from "@/lib/domain";
import { requireRole } from "@/lib/session";

const texte = (fd: FormData, cle: string, max = 300) => String(fd.get(cle) ?? "").trim().slice(0, max);
const nombre = (fd: FormData, cle: string) => Number(fd.get(cle) ?? 0) || 0;
/** Un lien de bouton : interne (/app/…) ou https. Rien d'autre — pas de javascript:. */
const lien = (v: string) => (v.startsWith("/") || /^https:\/\/\S+$/i.test(v) ? v : "");

/**
 * Créer un pop-up. L'administration choisit sa durée (en heures ou en jours)
 * et combien de fois un même joueur peut le voir par jour.
 */
export async function creerPopup(formData: FormData) {
  await requireRole("admin");
  const titre = texte(formData, "titre", 80);
  if (!titre) return { ok: false as const, error: "Il faut un titre." };
  const brut = String(formData.get("debut") ?? "").trim();
  const debut = brut ? new Date(/T\d{2}:\d{2}$/.test(brut) ? `${brut}:00+01:00` : brut) : new Date();
  const heures = Math.min(24 * 90, Math.max(1, nombre(formData, "dureeHeures") || 24));
  await db.insert(popups).values({
    id: uid(),
    titre,
    texte: texte(formData, "texte", 400),
    image: texte(formData, "image", 600),
    bouton1Label: texte(formData, "bouton1Label", 40),
    bouton1Url: lien(texte(formData, "bouton1Url", 400)),
    bouton2Label: texte(formData, "bouton2Label", 40),
    bouton2Url: lien(texte(formData, "bouton2Url", 400)),
    pages: ["app", "site", "tous"].includes(texte(formData, "pages")) ? texte(formData, "pages") : "tous",
    parJour: Math.min(20, Math.max(1, nombre(formData, "parJour") || 1)),
    debut: Number.isNaN(debut.getTime()) ? new Date() : debut,
    fin: new Date((Number.isNaN(debut.getTime()) ? Date.now() : debut.getTime()) + heures * 3_600_000),
    priorite: Math.max(0, nombre(formData, "priorite")),
    actif: true,
  });
  revalidatePath("/admin/popups");
  return { ok: true as const };
}

/** Arrêter tout de suite, ou relancer. */
export async function basculerPopup(id: string, actif: boolean) {
  await requireRole("admin");
  await db.update(popups).set({ actif }).where(eq(popups.id, id));
  revalidatePath("/admin/popups");
  return { ok: true as const };
}

export async function supprimerPopup(id: string) {
  await requireRole("admin");
  await db.delete(popups).where(eq(popups.id, id));
  revalidatePath("/admin/popups");
  return { ok: true as const };
}
