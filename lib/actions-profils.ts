"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, profilsSpeciaux, users, venues } from "@/db";
import { notify, uid } from "@/lib/domain";
import { requireRole, requireUser } from "@/lib/session";
import { normalizePhone } from "@/lib/phone";
import { lireType, PROFILS, prolongerProfil, type TypeProfil } from "@/lib/profils";
import { startPayment } from "@/lib/payments/service";
import { lireMotif, MOTIFS } from "@/lib/certification";
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

/* ------------------------------------------------------------ certification */

/** Certifier un compte, avec le motif qui justifie la confiance. */
export async function certifierCompte(formData: FormData) {
  await requireRole("admin");
  const motif = lireMotif(formData.get("motif"));
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!motif) return { ok: false as const, error: "Choisis le motif de la certification." };
  const compte = (await db.select().from(users).where(eq(users.phone, phone)).limit(1))[0];
  if (!compte) return { ok: false as const, error: "Aucun compte Master Break avec ce numéro." };
  await db.update(users).set({ certifie: motif, certifieLe: new Date() }).where(eq(users.id, compte.id));
  await notify(compte.id, "Compte certifié", `${MOTIFS[motif]} : le badge bleu apparaît désormais à côté de ton nom.`, "reward", "/app/rewards");
  revalidatePath("/", "layout");
  return { ok: true as const, nom: compte.name };
}

export async function retirerCertification(userId: string) {
  await requireRole("admin");
  await db.update(users).set({ certifie: null, certifieLe: null }).where(eq(users.id, userId));
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Certifier une salle partenaire (ou retirer sa certification). */
export async function certifierSalle(venueId: string, certifiee: boolean) {
  await requireRole("admin");
  await db.update(venues).set({ certifiee }).where(eq(venues.id, venueId));
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Le joueur demande le badge certifié : un motif, une justification. Gratuit, décidé par l'administration. */
export async function demanderCertification(motif: string, justification: string) {
  const moi = await requireUser();
  const m = lireMotif(motif);
  if (!m) return { ok: false as const, error: "Choisis le motif de ta demande." };
  if (moi.certifie) return { ok: false as const, error: "Ton compte est déjà certifié." };
  if (justification.trim().length < 10) return { ok: false as const, error: "Explique en quelques mots pourquoi (salle, titres, diffusion…)." };
  const actuel = await ligne(moi.id, "certification" as TypeProfil);
  if (actuel?.status === "demande") return { ok: false as const, error: "Ta demande est déjà en cours d'examen." };
  const champs = { status: "demande", motif: m, motivation: justification.trim().slice(0, 600), updatedAt: new Date() };
  if (actuel) await db.update(profilsSpeciaux).set(champs).where(eq(profilsSpeciaux.id, actuel.id));
  else await db.insert(profilsSpeciaux).values({ id: uid(), userId: moi.id, type: "certification", ...champs });
  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
  for (const a of admins) await notify(a.id, "Demande de certification", `${moi.name} · ${MOTIFS[m]}`, "system", "/admin/profils");
  revalider();
  return { ok: true as const };
}

/** L'administration certifie (avec le motif demandé) ou refuse. */
export async function deciderCertification(id: string, accepte: boolean) {
  const admin = await requireRole("admin");
  const p = (await db.select().from(profilsSpeciaux).where(eq(profilsSpeciaux.id, id)).limit(1))[0];
  if (!p || p.type !== "certification") return { ok: false as const, error: "Demande introuvable." };
  await db.update(profilsSpeciaux).set({ status: accepte ? "actif" : "refuse", decidePar: admin.id, updatedAt: new Date() }).where(eq(profilsSpeciaux.id, id));
  if (accepte && p.motif) await db.update(users).set({ certifie: p.motif, certifieLe: new Date() }).where(eq(users.id, p.userId));
  await notify(
    p.userId,
    accepte ? "Compte certifié" : "Certification non accordée",
    accepte ? "Le badge bleu apparaît désormais à côté de ton nom." : "L'administration n'a pas retenu ta demande pour l'instant.",
    "reward",
    "/app/rewards",
  );
  revalidatePath("/", "layout");
  return { ok: true as const };
}
