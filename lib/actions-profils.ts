"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, profilsSpeciaux, users } from "@/db";
import { notify, uid } from "@/lib/domain";
import { requireRole, requireUser } from "@/lib/session";
import { normalizePhone } from "@/lib/phone";
import { lireType, PROFILS, prolongerProfil, type TypeProfil } from "@/lib/profils";
import { startPayment } from "@/lib/payments/service";
import type { PaymentMethod } from "@/lib/payments";

const revalider = () => {
  revalidatePath("/app/rewards");
  revalidatePath("/admin/profils");
};

async function ligne(userId: string, type: TypeProfil) {
  return (await db.select().from(profilsSpeciaux).where(and(eq(profilsSpeciaux.userId, userId), eq(profilsSpeciaux.type, type))).limit(1))[0] ?? null;
}

/** Demander à devenir arbitre : la demande part à l'administration. */
export async function demanderProfil(type: string, motivation: string) {
  const moi = await requireUser();
  const t = lireType(type);
  if (!t) return { ok: false as const, error: "Profil inconnu." };
  const actuel = await ligne(moi.id, t);
  if (actuel && ["demande", "valide", "actif"].includes(actuel.status)) return { ok: false as const, error: "Ta demande est déjà en cours." };

  const champs = { status: PROFILS[t].validation ? "demande" : "valide", motivation: motivation.trim().slice(0, 500), updatedAt: new Date() };
  if (actuel) await db.update(profilsSpeciaux).set(champs).where(eq(profilsSpeciaux.id, actuel.id));
  else await db.insert(profilsSpeciaux).values({ id: uid(), userId: moi.id, type: t, ...champs });

  if (PROFILS[t].validation) {
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
    for (const a of admins) await notify(a.id, `Demande · ${PROFILS[t].nom}`, `${moi.name} demande à devenir ${PROFILS[t].nom.toLowerCase()}.`, "system", "/admin/profils");
  }
  revalider();
  return { ok: true as const };
}

/**
 * Payer son profil (ou le prolonger d'un mois). L'arbitre ne paie qu'une
 * fois validé : on n'encaisse pas pour un profil qu'on pourrait refuser.
 */
export async function payerProfil(type: string, method: PaymentMethod, phone: string) {
  const moi = await requireUser();
  const t = lireType(type);
  if (!t) return { ok: false as const, error: "Profil inconnu." };
  let actuel = await ligne(moi.id, t);
  if (PROFILS[t].validation && (!actuel || !["valide", "actif"].includes(actuel.status))) {
    return { ok: false as const, error: "L'administration doit d'abord valider ta demande." };
  }
  if (!actuel) {
    const id = uid();
    await db.insert(profilsSpeciaux).values({ id, userId: moi.id, type: t, status: "valide" });
    actuel = await ligne(moi.id, t);
  }
  return startPayment({
    kind: "profil",
    userId: moi.id,
    amount: PROFILS[t].prix,
    method,
    phone,
    description: `Profil ${PROFILS[t].nom}`,
    targetId: actuel!.id,
  });
}

/* ------------------------------------------------------------ administration */

/** Accorder ou prolonger un profil sans paiement. `mois` = 0 : sans limite. */
export async function accorderProfil(formData: FormData) {
  const admin = await requireRole("admin");
  const t = lireType(formData.get("type"));
  const mois = Math.max(0, Number(formData.get("mois") ?? 0) || 0);
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!t) return { ok: false as const, error: "Profil inconnu." };
  const compte = (await db.select().from(users).where(eq(users.phone, phone)).limit(1))[0];
  if (!compte) return { ok: false as const, error: "Aucun compte Master Break avec ce numéro." };

  const actuel = await ligne(compte.id, t);
  const fin = mois === 0 ? null : prolongerProfil(actuel?.status === "actif" ? actuel.actifJusqu : null, mois * 30);
  const champs = { status: "actif", actifJusqu: fin, source: "admin", decidePar: admin.id, updatedAt: new Date() };
  if (actuel) await db.update(profilsSpeciaux).set(champs).where(eq(profilsSpeciaux.id, actuel.id));
  else await db.insert(profilsSpeciaux).values({ id: uid(), userId: compte.id, type: t, ...champs });

  await notify(
    compte.id,
    `${PROFILS[t].nom} · profil accordé`,
    fin ? `Par l'administration, jusqu'au ${fin.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.` : "Par l'administration, sans limite de durée.",
    "reward",
    "/app/rewards",
  );
  revalider();
  return { ok: true as const, nom: compte.name };
}

/** Valider ou refuser une demande d'arbitre. Validée, elle attend le paiement — sauf si l'admin l'active aussitôt. */
export async function deciderProfil(id: string, decision: "valide" | "refuse" | "actif") {
  const admin = await requireRole("admin");
  const p = (await db.select().from(profilsSpeciaux).where(eq(profilsSpeciaux.id, id)).limit(1))[0];
  if (!p) return { ok: false as const, error: "Demande introuvable." };
  const t = p.type as TypeProfil;
  await db
    .update(profilsSpeciaux)
    .set({
      status: decision,
      decidePar: admin.id,
      updatedAt: new Date(),
      ...(decision === "actif" ? { source: "admin", actifJusqu: prolongerProfil(null, PROFILS[t].jours) } : {}),
    })
    .where(eq(profilsSpeciaux.id, id));
  await notify(
    p.userId,
    decision === "refuse" ? `${PROFILS[t].nom} · demande refusée` : `${PROFILS[t].nom} · demande validée`,
    decision === "valide"
      ? `Règle ton abonnement de ${PROFILS[t].prix.toLocaleString("fr-FR")} F pour l'activer.`
      : decision === "actif"
        ? "Ton profil est actif pour un mois, offert par l'administration."
        : "L'administration n'a pas retenu ta demande pour l'instant.",
    "reward",
    "/app/rewards",
  );
  revalider();
  return { ok: true as const };
}

/** Retirer un profil. */
export async function retirerProfil(id: string) {
  await requireRole("admin");
  await db.update(profilsSpeciaux).set({ status: "retire", updatedAt: new Date() }).where(eq(profilsSpeciaux.id, id));
  revalider();
  return { ok: true as const };
}
