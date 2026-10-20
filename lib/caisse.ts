import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, payouts, users, venues, type Payout } from "@/db";

/**
 * Ce qu'une salle a gagné, et ce qu'elle peut retirer.
 *
 * L'argent n'arrive jamais chez le gérant : un jeton, un billet, un droit
 * d'inscription se paient par Mobile Money sur le compte de la plateforme.
 * La salle, elle, encaisse au moment où le service est rendu — au scan du
 * jeton, à l'entrée du client. Sans cette page, cet argent n'avait aucun
 * chemin de retour, et c'est le genre d'oubli qui fait perdre une salle
 * partenaire.
 *
 * Quatre sources, toutes déjà en base, aucune inventée :
 *
 *  · les jetons scannés à ses tables — c'est le prix figé sur le jeton, pas
 *    le tarif du jour de la salle ;
 *  · les billets de ses événements, ceux qui ont été validés ou scannés ;
 *  · les droits d'inscription réglés pour ses tournois ;
 *  · les acomptes de réservation encaissés chez elle.
 *
 * Moins ce qui a déjà été versé, et moins ce qui est en cours de versement :
 * une demande déposée bloque son montant, sinon on la déposerait deux fois.
 */

export type Recette = {
  jetons: number;
  billets: number;
  tournois: number;
  reservations: number;
  brut: number;
  verse: number;
  enAttente: number;
  disponible: number;
};

const somme = (q: ReturnType<typeof sql<number>>) => q;

export async function getRecetteSalle(venueId: string): Promise<Recette> {
  const ligne = (
    await db
      .select({
        jetons: somme(sql<number>`(select coalesce(sum(s.amount), 0) from mb.scans s
                                    where s.venue_id = ${venueId} and s.kind = 'token')`),
        billets: somme(sql<number>`(select coalesce(sum(e.price), 0)
                                      from mb.tickets t join mb.events e on e.id = t.event_id
                                     where e.venue_id = ${venueId} and t.status in ('valid','used')
                                       and coalesce(t.reference, '') not like 'guichet:%')`),
        tournois: somme(sql<number>`(select coalesce(sum(p.fee), 0)
                                       from mb.tournament_players p join mb.tournaments tr on tr.id = p.tournament_id
                                      where tr.venue_id = ${venueId} and p.payment = 'paye'
                                        and coalesce(p.reference, '') not like 'guichet:%')`),
        reservations: somme(sql<number>`(select coalesce(sum(r.deposit), 0) from mb.reservations r
                                          where r.venue_id = ${venueId} and r.status in ('confirmed','seated','done'))`),
        verse: somme(sql<number>`(select coalesce(sum(o.amount), 0) from mb.payouts o
                                   where o.venue_id = ${venueId} and o.status = 'paye')`),
        attente: somme(sql<number>`(select coalesce(sum(o.amount), 0) from mb.payouts o
                                     where o.venue_id = ${venueId} and o.status = 'demande')`),
      })
      .from(venues)
      .where(eq(venues.id, venueId))
      .limit(1)
  )[0];

  const n = (v: unknown) => Number(v ?? 0);
  const jetons = n(ligne?.jetons);
  const billets = n(ligne?.billets);
  const tournois = n(ligne?.tournois);
  const reservations = n(ligne?.reservations);
  const brut = jetons + billets + tournois + reservations;
  const verse = n(ligne?.verse);
  const enAttente = n(ligne?.attente);

  return {
    jetons,
    billets,
    tournois,
    reservations,
    brut,
    verse,
    enAttente,
    disponible: Math.max(0, brut - verse - enAttente),
  };
}

/** Le même calcul pour un vendeur : son net, moins ce qui est déjà parti. */
export async function getSoldeRetirableVendeur(sellerId: string) {
  const { getSoldeVendeur } = await import("@/lib/seller");
  const solde = await getSoldeVendeur(sellerId);

  const ligne = (
    await db
      .select({
        verse: sql<number>`coalesce(sum(case when ${payouts.status} = 'paye' then ${payouts.amount} else 0 end), 0)`,
        attente: sql<number>`coalesce(sum(case when ${payouts.status} = 'demande' then ${payouts.amount} else 0 end), 0)`,
      })
      .from(payouts)
      .where(and(eq(payouts.userId, sellerId), sql`${payouts.venueId} is null`))
  )[0];

  const verse = Number(ligne?.verse ?? 0);
  const enAttente = Number(ligne?.attente ?? 0);
  return { ...solde, verse, enAttente, disponible: Math.max(0, solde.net - verse - enAttente) };
}

/** Le montant minimal d'une demande : au-dessous, les frais mangent tout. */
export const RETRAIT_MINIMUM = 5000;

export const ETATS_RETRAIT: Record<string, string> = {
  demande: "Demandé",
  paye: "Versé",
  refuse: "Refusé",
};

export const MOYENS: Record<string, string> = {
  momo: "MTN Mobile Money",
  om: "Orange Money",
  especes: "Espèces au comptoir",
  virement: "Virement bancaire",
};

/** Les demandes d'un bénéficiaire, la plus récente d'abord. */
export async function mesRetraits(userId: string): Promise<Payout[]> {
  return db.select().from(payouts).where(eq(payouts.userId, userId)).orderBy(desc(payouts.createdAt));
}

/** Toutes les demandes, pour l'administration, avec qui demande et pour quelle salle. */
export async function getRetraits() {
  return db
    .select({ payout: payouts, user: users, venue: venues })
    .from(payouts)
    .innerJoin(users, eq(users.id, payouts.userId))
    .leftJoin(venues, eq(venues.id, payouts.venueId))
    .orderBy(sql`case when ${payouts.status} = 'demande' then 0 else 1 end`, desc(payouts.createdAt));
}
