import "server-only";
import { and, eq, gt, gte, inArray, lte, sql } from "drizzle-orm";
import { db, events, notifications, popups, promotions, tournaments, users } from "@/db";
import { uid, type Executor } from "@/lib/domain";

/**
 * La file d'attente de la vitrine.
 *
 * Les emplacements sont rares, et c'est ce qui leur donne leur valeur : un
 * événement « À la une », trois « Sponsorisé » dans la liste, un pop-up à la
 * fois. Une promotion payée prend le premier créneau libre à partir de la
 * date souhaitée par le gérant ; s'il n'y en a pas, elle attend son tour.
 */
export type Emplacement = "une" | "sponsorise" | "popup";

export const CAPACITE: Record<Emplacement, number> = { une: 1, sponsorise: 3, popup: 1 };

export const EMPLACEMENTS: Record<string, Emplacement[]> = {
  sponsorise: ["sponsorise"],
  une: ["une"],
  popup: ["popup"],
  notification: [],
  pack: ["une", "sponsorise", "popup"],
};

/** Les formules qui envoient une notification aux joueurs. */
export const AVEC_NOTIFICATION = new Set(["notification", "pack"]);

/** Programmer une promotion payée (ou offerte) au premier créneau libre. */
export async function programmer(exec: Executor, promoId: string, source: "paiement" | "admin") {
  const p = (await exec.select().from(promotions).where(eq(promotions.id, promoId)).limit(1))[0];
  if (!p || p.status === "payee") return null;
  const places = EMPLACEMENTS[p.formule] ?? [];
  const duree = p.jours * 86_400_000;
  let debut = Math.max(Date.now(), p.debutSouhaite?.getTime() ?? 0);

  if (places.length) {
    const autres = await exec
      .select({ formule: promotions.formule, debut: promotions.debut, fin: promotions.fin })
      .from(promotions)
      .where(and(eq(promotions.status, "payee"), gt(promotions.fin, new Date(debut))));
    for (let essai = 0; essai < 200; essai++) {
      const fin = debut + duree;
      let repousse: number | null = null;
      for (const place of places) {
        const chevauche = autres.filter(
          (o) => o.debut && o.fin && (EMPLACEMENTS[o.formule] ?? []).includes(place) && o.debut.getTime() < fin && o.fin.getTime() > debut,
        );
        if (chevauche.length >= CAPACITE[place]) {
          const libre = Math.min(...chevauche.map((o) => o.fin!.getTime()));
          repousse = repousse === null ? libre : Math.max(repousse, libre);
        }
      }
      if (repousse === null) break;
      debut = repousse;
    }
  }

  const dateDebut = new Date(debut);
  const dateFin = new Date(debut + duree);
  let popupId: string | null = null;
  if (places.includes("popup")) {
    const e = (await exec.select().from(events).where(eq(events.id, p.eventId)).limit(1))[0];
    if (e) {
      popupId = uid();
      await exec.insert(popups).values({
        id: popupId,
        titre: e.title,
        texte: [e.subtitle, [e.day, e.hours].filter(Boolean).join(" · ")].filter(Boolean).join("\n"),
        image: e.image,
        bouton1Label: e.price > 0 ? "Prendre ma place" : "Réserver ma place",
        bouton1Url: `/e/${e.slug}`,
        bouton2Label: "Voir l'événement",
        bouton2Url: `/app/events/${e.slug}`,
        pages: "tous",
        parJour: 1,
        debut: dateDebut,
        fin: dateFin,
        priorite: 5,
        eventId: e.id,
      });
    }
  }
  await exec
    .update(promotions)
    .set({ status: "payee", source, debut: dateDebut, fin: dateFin, popupId, updatedAt: new Date() })
    .where(eq(promotions.id, promoId));
  return { debut: dateDebut, fin: dateFin };
}

/** Les événements promus en ce moment, par emplacement. */
export async function promotionsEnCours() {
  const maintenant = new Date();
  const lignes = await db
    .select({ eventId: promotions.eventId, formule: promotions.formule, debut: promotions.debut })
    .from(promotions)
    .where(and(eq(promotions.status, "payee"), lte(promotions.debut, maintenant), gt(promotions.fin, maintenant)));
  const tri = [...lignes].sort((a, b) => (a.debut?.getTime() ?? 0) - (b.debut?.getTime() ?? 0));
  return {
    une: tri.filter((l) => (EMPLACEMENTS[l.formule] ?? []).includes("une")).map((l) => l.eventId),
    sponsorises: new Set(tri.filter((l) => (EMPLACEMENTS[l.formule] ?? []).includes("sponsorise")).map((l) => l.eventId)),
  };
}

/**
 * Prévenir les joueurs d'une promotion — au plus une notification
 * promotionnelle par joueur et par jour ; les notifications utiles (billet,
 * tournoi, score) ne sont jamais concernées par ce plafond.
 */
async function prevenir(promo: typeof promotions.$inferSelect, rappel: boolean) {
  const e = (await db.select().from(events).where(eq(events.id, promo.eventId)).limit(1))[0];
  if (!e || !e.active) return 0;
  const minuit = new Date(new Date().toLocaleDateString("fr-CA", { timeZone: "Africa/Douala" }) + "T00:00:00+01:00");
  const dejaServis = await db
    .select({ id: notifications.userId })
    .from(notifications)
    .where(and(eq(notifications.kind, "promo"), gte(notifications.createdAt, minuit)));
  const exclus = new Set(dejaServis.map((d) => d.id));
  const joueurs = await db.select({ id: users.id }).from(users).where(eq(users.role, "client"));
  const cibles = joueurs.map((j) => j.id).filter((id) => !exclus.has(id));
  if (cibles.length === 0) return 0;

  const titre = rappel ? `C'est bientôt · ${e.title}` : e.title;
  const corps = [e.subtitle, [e.day, e.hours].filter(Boolean).join(" · "), e.price > 0 ? `${e.price.toLocaleString("fr-FR")} F` : "Entrée libre"]
    .filter(Boolean)
    .join(" · ");
  for (let i = 0; i < cibles.length; i += 500) {
    await db.insert(notifications).values(
      cibles.slice(i, i + 500).map((userId) => ({ id: uid(), userId, title: titre, body: corps, kind: "promo", href: `/app/events/${e.slug}`, read: false })),
    );
  }
  void import("@/lib/push").then((m) => m.pousser(cibles)).catch(() => {});
  return cibles.length;
}

/**
 * Le tour de garde, toutes les dix minutes : les notifications des
 * promotions qui commencent, et le rappel la veille d'un tournoi promu.
 */
export async function tourDeGarde() {
  const maintenant = new Date();
  const aEnvoyer = await db
    .select()
    .from(promotions)
    .where(and(eq(promotions.status, "payee"), eq(promotions.notifEnvoyee, false), lte(promotions.debut, maintenant), inArray(promotions.formule, [...AVEC_NOTIFICATION])));
  for (const p of aEnvoyer) {
    await db.update(promotions).set({ notifEnvoyee: true }).where(eq(promotions.id, p.id));
    await prevenir(p, false);
  }

  const dansUnJour = new Date(maintenant.getTime() + 86_400_000);
  const rappels = await db
    .select({ promo: promotions })
    .from(promotions)
    .innerJoin(tournaments, eq(tournaments.eventId, promotions.eventId))
    .where(
      and(
        eq(promotions.status, "payee"),
        eq(promotions.notifEnvoyee, true),
        eq(promotions.rappelEnvoye, false),
        inArray(promotions.formule, [...AVEC_NOTIFICATION]),
        gt(tournaments.startsAt, maintenant),
        lte(tournaments.startsAt, dansUnJour),
        sql`${tournaments.parentId} is null`,
      ),
    );
  for (const { promo } of rappels) {
    await db.update(promotions).set({ rappelEnvoye: true }).where(eq(promotions.id, promo.id));
    await prevenir(promo, true);
  }
}
