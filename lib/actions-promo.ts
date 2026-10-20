"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, events, popups, promotions, tarifsPromo, users } from "@/db";
import { notify, uid } from "@/lib/domain";
import { startPayment } from "@/lib/payments/service";
import type { PaymentMethod } from "@/lib/payments";
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

/* --------------------------------------------------- promotion des gérants */

/** Le gérant de la salle de l'événement, ou l'admin. */
async function maitreDe(eventId: string) {
  const qui = await requireRole("admin", "manager");
  const e = (await db.select().from(events).where(eq(events.id, eventId)).limit(1))[0];
  if (!e) return null;
  if (qui.role === "manager" && (!qui.venueId || e.venueId !== qui.venueId)) return null;
  return { qui, e };
}

/** Le gérant demande une promotion : l'administration valide le contenu avant tout paiement. */
export async function demanderPromotion(eventId: string, formule: string, debutSouhaite: string) {
  const m = await maitreDe(eventId);
  if (!m) return { ok: false as const, error: "Cet événement n'est pas le tien." };
  const tarif = (await db.select().from(tarifsPromo).where(eq(tarifsPromo.formule, formule)).limit(1))[0];
  if (!tarif || !tarif.actif) return { ok: false as const, error: "Formule indisponible." };
  const souhait = debutSouhaite ? new Date(`${debutSouhaite}T00:00:00+01:00`) : null;
  await db.insert(promotions).values({
    id: uid(),
    eventId,
    demandeurId: m.qui.id,
    formule,
    prix: tarif.prix,
    jours: tarif.jours,
    status: "demande",
    debutSouhaite: souhait && !Number.isNaN(souhait.getTime()) ? souhait : null,
  });
  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
  for (const a of admins) await notify(a.id, `Promotion demandée · ${m.e.title}`, `${tarif.nom} · ${tarif.prix.toLocaleString("fr-FR")} F`, "system", "/admin/promotions");
  revalidatePath(`/gerant/evenements/${eventId}`);
  revalidatePath("/admin/promotions");
  return { ok: true as const };
}

/** Payer une promotion validée. */
export async function payerPromotion(promoId: string, method: PaymentMethod, phone: string) {
  const moi = await requireRole("admin", "manager");
  const p = (await db.select().from(promotions).where(eq(promotions.id, promoId)).limit(1))[0];
  if (!p) return { ok: false as const, error: "Promotion introuvable." };
  if (!(await maitreDe(p.eventId))) return { ok: false as const, error: "Cet événement n'est pas le tien." };
  if (p.status !== "valide") return { ok: false as const, error: "L'administration doit d'abord valider cette promotion." };
  return startPayment({ kind: "promotion", userId: moi.id, amount: p.prix, method, phone, description: "Promotion Master Break", targetId: p.id });
}

/** L'administration : valider (le gérant paie), offrir (programmée sans paiement) ou refuser. */
export async function deciderPromotion(id: string, decision: "valide" | "offerte" | "refusee", motif = "") {
  await requireRole("admin");
  const p = (await db.select().from(promotions).where(eq(promotions.id, id)).limit(1))[0];
  if (!p) return { ok: false as const, error: "Promotion introuvable." };
  const e = (await db.select().from(events).where(eq(events.id, p.eventId)).limit(1))[0];
  let detail = "";
  if (decision === "offerte") {
    const { programmer } = await import("@/lib/promotions");
    const c = await programmer(db, id, "admin");
    if (c) detail = `Programmée du ${c.debut.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} au ${c.fin.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}, offerte par l'administration.`;
  } else {
    await db.update(promotions).set({ status: decision, motifRefus: motif.slice(0, 300), updatedAt: new Date() }).where(eq(promotions.id, id));
    detail = decision === "valide" ? `Validée : règle ${p.prix.toLocaleString("fr-FR")} F pour la programmer.` : `Refusée${motif ? ` : ${motif}` : "."}`;
  }
  if (p.demandeurId) await notify(p.demandeurId, `Promotion · ${e?.title ?? "événement"}`, detail, "system", `/gerant/evenements/${p.eventId}`);
  revalidatePath("/admin/promotions");
  revalidatePath(`/gerant/evenements/${p.eventId}`);
  return { ok: true as const };
}

/** Modifier une formule : prix, durée, disponibilité. */
export async function modifierTarif(formData: FormData) {
  await requireRole("admin");
  const formule = String(formData.get("formule") ?? "");
  await db
    .update(tarifsPromo)
    .set({
      prix: Math.max(0, Number(formData.get("prix") ?? 0) || 0),
      jours: Math.max(1, Number(formData.get("jours") ?? 1) || 1),
      actif: formData.get("actif") === "on",
    })
    .where(eq(tarifsPromo.formule, formule));
  revalidatePath("/admin/promotions");
}
