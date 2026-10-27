"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gt, inArray } from "drizzle-orm";
import { db, invitations, presences, venues } from "@/db";
import { notify, uid } from "@/lib/domain";
import { requireRole, requireUser } from "@/lib/session";
import { joueursActifs } from "@/lib/presences";
import { DUREE_PRESENCE_H, INVITES_MAX, positionValide, verdictPresence } from "@/lib/salles-geo";

type Resultat = { ok: true } | { ok: false; error: string };

/**
 * Poser (ou corriger) la position GPS d'une salle.
 * L'administration pour toutes ; un gérant pour la sienne seulement.
 */
export async function definirPositionSalle(venueId: string, lat: number, lng: number): Promise<Resultat> {
  const moi = await requireRole("manager", "admin");
  if (moi.role !== "admin" && moi.venueId !== venueId) {
    return { ok: false, error: "Tu ne peux placer que ta propre salle." };
  }
  if (!positionValide(lat, lng)) return { ok: false, error: "Cette position n'est pas valable." };
  await db
    .update(venues)
    .set({ latitude: Number(lat), longitude: Number(lng) })
    .where(eq(venues.id, venueId));
  revalidatePath("/app/salles");
  revalidatePath("/admin/salles");
  revalidatePath("/gerant/salle");
  return { ok: true };
}

/** « Je suis à la salle. » Remplace une éventuelle présence ailleurs. */
export async function jeSuisLa(venueId: string, lat?: number | null, lng?: number | null): Promise<Resultat> {
  const moi = await requireUser();
  const salle = (await db.select().from(venues).where(eq(venues.id, venueId)).limit(1))[0];
  if (!salle || !salle.active) return { ok: false, error: "Salle introuvable." };
  const pos = positionValide(lat, lng) ? { lat: Number(lat), lng: Number(lng) } : null;
  const v = verdictPresence(salle, pos);
  if (!v.ok) return { ok: false, error: v.raison };

  await db.delete(presences).where(eq(presences.userId, moi.id));
  await db.insert(presences).values({
    id: uid(),
    userId: moi.id,
    venueId,
    distanceM: v.distance,
    expiresAt: new Date(Date.now() + DUREE_PRESENCE_H * 3600_000),
  });
  revalidatePath(`/app/salles/${salle.slug}`);
  revalidatePath("/app/salles");
  return { ok: true };
}

/** « Je pars. » */
export async function jePars(): Promise<Resultat> {
  const moi = await requireUser();
  await db.delete(presences).where(eq(presences.userId, moi.id));
  revalidatePath("/app/salles", "layout");
  return { ok: true };
}

/**
 * Inviter à jouer des joueurs actifs dans une salle.
 *
 * Seulement ceux qui y sont en ce moment, quelques-uns à la fois, et une
 * seule invitation en attente par personne et par heure : on propose une
 * partie, on ne fait pas de la réclame.
 */
export async function inviterPresents(venueId: string, ids: string[], message: string) {
  const moi = await requireUser();
  const salle = (await db.select().from(venues).where(eq(venues.id, venueId)).limit(1))[0];
  if (!salle) return { ok: false as const, error: "Salle introuvable." };

  const actifs = new Set((await joueursActifs(venueId)).map((a) => a.id));
  const voulus = [...new Set(ids)].filter((id) => id !== moi.id && actifs.has(id));
  if (voulus.length === 0) return { ok: false as const, error: "Choisis au moins un joueur présent dans la salle." };
  if (voulus.length > INVITES_MAX) {
    return { ok: false as const, error: `Pas plus de ${INVITES_MAX} joueurs à la fois.` };
  }

  // Une heure de répit : déjà invité par moi et sans réponse ? On n'insiste pas.
  const recentes = await db
    .select({ toId: invitations.toId })
    .from(invitations)
    .where(
      and(
        eq(invitations.fromId, moi.id),
        inArray(invitations.toId, voulus),
        eq(invitations.status, "envoyee"),
        gt(invitations.createdAt, new Date(Date.now() - 3600_000)),
      ),
    );
  const deja = new Set(recentes.map((r) => r.toId));
  const destinataires = voulus.filter((id) => !deja.has(id));
  if (destinataires.length === 0) {
    return { ok: false as const, error: "Tu les as déjà invités il y a moins d'une heure." };
  }

  const texte = message.trim().slice(0, 200) || `On fait une partie au ${salle.name} ?`;
  const batchId = uid();
  await db.insert(invitations).values(
    destinataires.map((toId) => ({
      id: uid(), batchId, fromId: moi.id, toId, venueId, message: texte, status: "envoyee",
    })),
  );
  for (const toId of destinataires) {
    await notify(toId, `${moi.name} t'invite à jouer`, texte, "system", "/app/amis");
  }
  revalidatePath("/app/amis");
  return { ok: true as const, envoyees: destinataires.length, ignores: deja.size };
}
