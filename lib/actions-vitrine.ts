"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, or } from "drizzle-orm";
import { db, events, users } from "@/db";
import { notify } from "@/lib/domain";
import { requireRole } from "@/lib/session";
import { lireVitrine } from "@/lib/vitrine";

/** Enregistrer la vitrine d'un événement. Un gérant ne touche qu'aux siens. */
export async function saveVitrine(formData: FormData) {
  const auteur = await requireRole("admin", "manager");
  const id = String(formData.get("id") ?? "");
  const event = (await db.select().from(events).where(eq(events.id, id)).limit(1))[0];
  if (!event) redirect("/connexion?refus=1");
  if (auteur.role === "manager" && (!auteur.venueId || event.venueId !== auteur.venueId)) {
    redirect("/gerant/evenements?refus=1");
  }

  await db.update(events).set({ vitrine: lireVitrine(formData) }).where(eq(events.id, id));
  revalidatePath(`/e/${event.slug}`);
  revalidatePath("/admin/evenements");
  revalidatePath(`/gerant/evenements/${event.id}`);
}

export type EtatContact = { ok: boolean; message: string } | null;

/**
 * Le formulaire « Nous contacter » de la page publique.
 *
 * Ouvert à tous, donc gardé : un champ piège que seuls les robots
 * remplissent, des longueurs bornées, et une limite par adresse IP. La
 * demande arrive en notification chez les admins et les gérants de la salle.
 */
const derniersEnvois = new Map<string, number[]>();

export async function contacterOrganisateur(_avant: EtatContact, formData: FormData): Promise<EtatContact> {
  const champ = (cle: string, max: number) => String(formData.get(cle) ?? "").trim().slice(0, max);
  if (champ("site", 200)) return { ok: true, message: "Merci, ta demande est partie." };

  const nom = champ("nom", 80);
  const telephone = champ("telephone", 30);
  const ville = champ("ville", 80);
  const message = champ("message", 1200);
  if (!nom || !telephone || !message) {
    return { ok: false, message: "Nom, téléphone et message sont nécessaires." };
  }

  const entetes = await headers();
  const ip = (entetes.get("x-forwarded-for") ?? "").split(",")[0].trim() || "inconnue";
  const maintenant = Date.now();
  const recents = (derniersEnvois.get(ip) ?? []).filter((t) => maintenant - t < 60 * 60 * 1000);
  if (recents.length >= 5) return { ok: false, message: "Trop de demandes d'un coup. Réessaie dans une heure." };
  derniersEnvois.set(ip, [...recents, maintenant]);

  const event = (
    await db.select().from(events).where(eq(events.slug, champ("slug", 200))).limit(1)
  )[0];
  if (!event || !event.active || event.vitrine?.contact === false) {
    return { ok: false, message: "Cette page ne reçoit pas de demandes." };
  }

  const destinataires = await db
    .select({ id: users.id })
    .from(users)
    .where(
      event.venueId
        ? or(eq(users.role, "admin"), and(eq(users.role, "manager"), eq(users.venueId, event.venueId)))
        : eq(users.role, "admin"),
    );

  const corps = [`${nom} · ${telephone}${ville ? ` · ${ville}` : ""}`, message].join("\n");
  await Promise.all(
    destinataires.map((d) => notify(d.id, `Demande de contact : ${event.title}`, corps, "system")),
  );

  return { ok: true, message: "Merci, ta demande est partie. On te rappelle vite." };
}
