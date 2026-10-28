import "server-only";
import { and, asc, count, desc, eq, gt, gte, inArray, isNotNull, isNull, ne, sql, sum, type SQL } from "drizzle-orm";
import {
  db,
  events,
  notifications,
  orderItems,
  orders,
  packs,
  payments,
  productImages,
  products,
  productVariants,
  purchases,
  reservations,
  scans,
  tickets,
  tokens,
  users,
  venues,
  tournaments,
  tournamentPlayers,
  venueTables,
  type EventRow,
  type ProductVariant,
  type Reservation,
  type Venue,
  type VenueTable,
} from "@/db";

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

/* ---------------------------------------------------------------- catalogue */

export async function getVenues(): Promise<Venue[]> {
  return db.select().from(venues).where(eq(venues.active, true)).orderBy(venues.name);
}

export async function getVenue(slug: string) {
  const rows = await db.select().from(venues).where(eq(venues.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getPacks() {
  return db.select().from(packs).where(eq(packs.active, true)).orderBy(packs.sort);
}

export async function getProducts(category?: string, q?: string) {
  // Une recherche traverse les rayons : qui tape « queue » ne veut pas qu'on
  // lui réponde « rien dans les vapes ». Le rayon ne filtre qu'en l'absence
  // de recherche.
  const mots = (q ?? "").trim();
  const motif = `%${mots.replace(/[%_]/g, "")}%`;
  const where = mots
    ? and(
        eq(products.active, true),
        sql`(${products.name} ilike ${motif} or ${products.detail} ilike ${motif} or ${products.description} ilike ${motif})`,
      )
    : category
      ? and(eq(products.active, true), eq(products.category, category))
      : eq(products.active, true);
  return db.select().from(products).where(where).orderBy(products.category, products.name);
}

export async function getProduct(slug: string) {
  const rows = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  return rows[0] ?? null;
}

/**
 * La fiche complète d'un article : sa galerie et ses déclinaisons.
 *
 * `products.image` reste la vignette ; la galerie s'ouvre derrière elle. Les
 * déclinaisons épuisées restent affichées mais grisées — savoir que la mangue
 * existe et qu'elle est finie vaut mieux que de croire qu'elle n'existe pas.
 */
export async function getFicheProduit(slug: string) {
  const produit = await getProduct(slug);
  if (!produit) return null;

  const [galerie, declinaisons] = await Promise.all([
    db.select().from(productImages).where(eq(productImages.productId, produit.id)).orderBy(productImages.sort),
    db
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.productId, produit.id), eq(productVariants.active, true)))
      .orderBy(productVariants.sort, productVariants.name),
  ]);

  return { produit, galerie, declinaisons };
}

/** Toutes les déclinaisons actives, pour le panier qui en porte plusieurs. */
export async function getDeclinaisons(): Promise<ProductVariant[]> {
  return db
    .select()
    .from(productVariants)
    .where(eq(productVariants.active, true))
    .orderBy(productVariants.sort, productVariants.name);
}

export async function getEvents(): Promise<(EventRow & { sponsorise: boolean })[]> {
  // Les soirées passées restent à l'affiche — on y retrouve son billet, ses
  // photos, son classement — mais derrière celles qui arrivent.
  const [lignes, promus] = await Promise.all([
    db
      .select()
      .from(events)
      .where(eq(events.active, true))
      // L'événement « à la une » d'abord, tant qu'il n'est pas terminé.
      .orderBy(sql`${events.endedAt} is not null`, desc(events.featured), events.createdAt),
    import("@/lib/promotions").then((m) => m.promotionsEnCours()),
  ]);
  // Les promotions payées passent devant : la une d'abord, puis les
  // sponsorisés. Le reste garde son ordre.
  const rang = (e: EventRow) => {
    if (e.endedAt) return 3;
    if (promus.une.includes(e.id)) return 0;
    if (promus.sponsorises.has(e.id)) return 1;
    return 2;
  };
  return lignes
    .map((e, i) => ({ e, i }))
    .sort((a, b) => rang(a.e) - rang(b.e) || a.i - b.i)
    .map(({ e }) => ({ ...e, sponsorise: promus.une.includes(e.id) || promus.sponsorises.has(e.id) }));
}

export async function getEvent(slug: string) {
  const rows = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
  return rows[0] ?? null;
}

/* ------------------------------------------------------------------- client */

export async function getActiveTokens(userId: string) {
  return db
    .select()
    .from(tokens)
    .where(and(eq(tokens.userId, userId), eq(tokens.status, "active")))
    .orderBy(tokens.createdAt);
}

export async function getBalance(userId: string): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(tokens)
    .where(and(eq(tokens.userId, userId), eq(tokens.status, "active")));
  return rows[0]?.n ?? 0;
}

export type ActivityEntry = {
  id: string;
  label: string;
  detail: string;
  delta: string;
  kind: "in" | "out" | "xp";
  at: Date;
};

/** Fil « activité récente » : recharges, jetons scannés, billets. */
export async function getActivity(userId: string, limit = 6): Promise<ActivityEntry[]> {
  const [buys, used, myTickets] = await Promise.all([
    db.select().from(purchases).where(eq(purchases.userId, userId)).orderBy(desc(purchases.createdAt)).limit(limit),
    db
      .select({ scan: scans, venue: venues })
      .from(scans)
      .leftJoin(venues, eq(scans.venueId, venues.id))
      .where(and(eq(scans.userId, userId), eq(scans.kind, "token")))
      .orderBy(desc(scans.createdAt))
      .limit(limit),
    db
      .select({ ticket: tickets, event: events })
      .from(tickets)
      .leftJoin(events, eq(tickets.eventId, events.id))
      .where(and(eq(tickets.userId, userId), inArray(tickets.status, ["valid", "used", "guichet"])))
      .orderBy(desc(tickets.createdAt))
      .limit(limit),
  ]);

  const entries: ActivityEntry[] = [
    ...buys.map((p) => ({
      id: `p-${p.id}`,
      label: `Recharge ${p.tokens} jeton${p.tokens > 1 ? "s" : ""}`,
      detail: `${p.method === "om" ? "Orange Money" : "MTN MoMo"} · ${p.amount.toLocaleString("fr-FR")} F`,
      delta: `+${p.tokens}`,
      kind: "in" as const,
      at: p.createdAt,
    })),
    ...used.map(({ scan, venue }) => ({
      id: `s-${scan.id}`,
      label: "Jeton scanné",
      detail: `${venue?.name ?? "Salle partenaire"} · code ${scan.code}`,
      delta: "−1",
      kind: "out" as const,
      at: scan.createdAt,
    })),
    ...myTickets.map(({ ticket, event }) => ({
      id: `t-${ticket.id}`,
      label: `Billet · ${event?.title ?? "Événement"}`,
      detail: `${event?.day ?? ""} · code ${ticket.code}`,
      delta: "+1",
      kind: "xp" as const,
      at: ticket.createdAt,
    })),
  ];

  return entries.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}

export async function getNotifications(userId: string) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
}

export async function getUnreadCount(userId: string): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return rows[0]?.n ?? 0;
}

export async function getOrders(userId: string) {
  const rows = await db
    .select({ order: orders, venue: venues })
    .from(orders)
    .leftJoin(venues, eq(orders.venueId, venues.id))
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));

  if (rows.length === 0) return [];

  const items = await db
    .select({ item: orderItems, product: products })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(
      inArray(
        orderItems.orderId,
        rows.map((r) => r.order.id),
      ),
    );

  return rows.map(({ order, venue }) => ({
    ...order,
    venue,
    items: items.filter((i) => i.item.orderId === order.id),
  }));
}

export async function getTickets(userId: string) {
  // Une tentative de paiement échouée ou expirée n'est pas un billet : la
  // montrer, c'était afficher au client un second billet « utilisé ».
  return db
    .select({ ticket: tickets, event: events })
    .from(tickets)
    .innerJoin(events, eq(tickets.eventId, events.id))
    .where(and(eq(tickets.userId, userId), inArray(tickets.status, ["valid", "used", "guichet", "pending"])))
    .orderBy(desc(tickets.createdAt));
}

export async function getLeaderboard(limit = 5) {
  return db
    .select({ id: users.id, name: users.name, avatar: users.avatar, points: users.points, certifie: users.certifie })
    .from(users)
    .where(eq(users.role, "client"))
    .orderBy(desc(users.points))
    .limit(limit);
}

export async function getRank(userId: string): Promise<number> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "client"))
    .orderBy(desc(users.points));
  return rows.findIndex((r) => r.id === userId) + 1;
}

/* ------------------------------------------------------------------- gérant */

export async function getVenueStats(venueId: string) {
  const since = startOfToday();
  const mois = daysAgo(30);
  const [jetons, tables, billets, duMois] = await Promise.all([
    db
      .select({ n: count(), total: sum(scans.amount) })
      .from(scans)
      .where(and(eq(scans.venueId, venueId), eq(scans.kind, "token"), gte(scans.createdAt, since))),
    db.select().from(venues).where(eq(venues.id, venueId)).limit(1),
    db
      .select({ n: count(), total: sum(scans.amount) })
      .from(scans)
      .where(and(eq(scans.venueId, venueId), eq(scans.kind, "ticket"), gte(scans.createdAt, since))),
    // Le bloc « ce mois » affichait la recette du jour : deux chiffres
    // différents portant le même nombre, dans la même vue.
    db
      .select({ total: sum(scans.amount) })
      .from(scans)
      .where(and(eq(scans.venueId, venueId), gte(scans.createdAt, mois))),
  ]);

  const venue = tables[0];
  const debited = jetons[0]?.n ?? 0;
  // La recette du jour, c'est tout ce qui est passé au comptoir : les jetons
  // débités aux tables ET les billets scannés à l'entrée.
  const recetteJetons = Number(jetons[0]?.total ?? 0);
  const recetteBillets = Number(billets[0]?.total ?? 0);
  const revenue = recetteJetons + recetteBillets;

  return {
    venue,
    debited,
    revenue,
    recetteJetons,
    recetteBillets,
    revenueMois: Number(duMois[0]?.total ?? 0),
    commission: Math.round(revenue * 0.1),
    tickets: billets[0]?.n ?? 0,
    tablesBusy: venue ? venue.tables - venue.freeTables : 0,
    tablesTotal: venue?.tables ?? 0,
  };
}

export async function getRecentScans(venueId: string | null, limit = 6) {
  const base = db
    .select({ scan: scans, user: users, venue: venues })
    .from(scans)
    .leftJoin(users, eq(scans.userId, users.id))
    .leftJoin(venues, eq(scans.venueId, venues.id))
    .orderBy(desc(scans.createdAt))
    .limit(limit);

  return venueId ? base.where(eq(scans.venueId, venueId)) : base;
}

/* -------------------------------------------------------------------- admin */

export async function getAdminStats() {
  const since = startOfToday();
  const month = daysAgo(30);

  const [tokenRevenueToday, tokenRevenueMonth, tokensSold, ordersMonth, ticketsSold, clientCount, activeTokens] =
    await Promise.all([
      db.select({ total: sum(scans.amount) }).from(scans).where(gte(scans.createdAt, since)),
      db.select({ total: sum(purchases.amount) }).from(purchases).where(gte(purchases.createdAt, month)),
      db.select({ n: count() }).from(tokens).where(gte(tokens.createdAt, month)),
      db.select({ n: count(), total: sum(orders.total) }).from(orders).where(gte(orders.createdAt, month)),
      db.select({ n: count() }).from(tickets).where(inArray(tickets.status, ["valid", "used"])),
      db.select({ n: count() }).from(users).where(eq(users.role, "client")),
      db.select({ n: count() }).from(tokens).where(eq(tokens.status, "active")),
    ]);

  return {
    revenueToday: Number(tokenRevenueToday[0]?.total ?? 0),
    revenueMonth: Number(tokenRevenueMonth[0]?.total ?? 0),
    tokensSold: tokensSold[0]?.n ?? 0,
    ordersCount: ordersMonth[0]?.n ?? 0,
    ordersTotal: Number(ordersMonth[0]?.total ?? 0),
    ticketsSold: ticketsSold[0]?.n ?? 0,
    clients: clientCount[0]?.n ?? 0,
    activeTokens: activeTokens[0]?.n ?? 0,
  };
}

/** Jetons débités et recette par salle, sur les 7 derniers jours. */
export async function getVenueBreakdown() {
  return db
    .select({
      id: venues.id,
      name: venues.name,
      city: venues.city,
      tables: venues.tables,
      tokenPrice: venues.tokenPrice,
      debited: count(scans.id),
      revenue: sql<number>`coalesce(sum(${scans.amount}), 0)`,
    })
    .from(venues)
    .leftJoin(scans, and(eq(scans.venueId, venues.id), gte(scans.createdAt, daysAgo(7))))
    .groupBy(venues.id)
    .orderBy(desc(sql`coalesce(sum(${scans.amount}), 0)`));
}

export async function getAllOrders() {
  const rows = await db
    .select({ order: orders, user: users, venue: venues })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .leftJoin(venues, eq(orders.venueId, venues.id))
    .orderBy(desc(orders.createdAt))
    .limit(50);
  return rows;
}

export type FiltresUtilisateurs = {
  q?: string;
  role?: string;
  periode?: string;
  du?: string;
  au?: string;
  salle?: string;
  sexe?: string;
  statut?: string;
  tri?: string;
  page?: number;
};

const PAR_PAGE = 50;

/** Les filtres de la page admin des utilisateurs, traduits en conditions SQL. */
function conditionsUtilisateurs(f: FiltresUtilisateurs) {
  const c: SQL[] = [];
  const q = (f.q ?? "").trim();
  if (q) {
    const motif = `%${q.replace(/[%_\\]/g, "")}%`;
    c.push(sql`(${users.name} ilike ${motif} or ${users.phone} ilike ${motif} or ${users.code} ilike ${motif})`);
  }
  if (f.role && ["client", "manager", "seller", "admin"].includes(f.role)) c.push(eq(users.role, f.role));
  const jours = { "24h": 1, "7j": 7, "30j": 30, "90j": 90 }[f.periode ?? ""];
  if (jours) c.push(gte(users.createdAt, new Date(Date.now() - jours * 86_400_000)));
  if (f.du && /^\d{4}-\d{2}-\d{2}$/.test(f.du)) c.push(gte(users.createdAt, new Date(`${f.du}T00:00:00+01:00`)));
  if (f.au && /^\d{4}-\d{2}-\d{2}$/.test(f.au)) c.push(sql`${users.createdAt} < ${`${f.au}T00:00:00+01:00`}::timestamptz + interval '1 day'`);
  if (f.salle === "aucune") c.push(isNull(users.venueId));
  else if (f.salle) c.push(eq(users.venueId, f.salle));
  if (f.sexe === "homme" || f.sexe === "femme") c.push(eq(users.sexe, f.sexe));
  else if (f.sexe === "inconnu") c.push(isNull(users.sexe));
  if (f.statut === "membre") c.push(gt(users.memberUntil, new Date()));
  if (f.statut === "certifie") c.push(isNotNull(users.certifie));
  if (f.statut === "avatar") c.push(isNotNull(users.avatar));
  if (f.statut === "sans-avatar") c.push(isNull(users.avatar));
  return c.length ? and(...c) : undefined;
}

/** La liste filtrée, paginée, et son total. */
export async function chercherUtilisateurs(f: FiltresUtilisateurs) {
  const ou = conditionsUtilisateurs(f);
  const ordre =
    f.tri === "anciens"
      ? [asc(users.createdAt)]
      : f.tri === "points"
        ? [desc(users.points), desc(users.createdAt)]
        : f.tri === "nom"
          ? [asc(users.name)]
          : [desc(users.createdAt)];
  const page = Math.max(1, f.page ?? 1);
  const [lignes, total] = await Promise.all([
    db.select().from(users).where(ou).orderBy(...ordre).limit(PAR_PAGE).offset((page - 1) * PAR_PAGE),
    db.select({ n: count() }).from(users).where(ou),
  ]);
  return { lignes, total: total[0]?.n ?? 0, page, pages: Math.max(1, Math.ceil((total[0]?.n ?? 0) / PAR_PAGE)) };
}

/** Les chiffres d'ensemble : total, inscriptions récentes, répartition par rôle. */
export async function chiffresUtilisateurs() {
  const maintenant = Date.now();
  const depuis = (j: number) => new Date(maintenant - j * 86_400_000).toISOString();
  const [ligne] = await db
    .select({
      total: count(),
      jour: sql<number>`count(*) filter (where ${users.createdAt} >= ${depuis(1)}::timestamptz)::int`,
      semaine: sql<number>`count(*) filter (where ${users.createdAt} >= ${depuis(7)}::timestamptz)::int`,
      mois: sql<number>`count(*) filter (where ${users.createdAt} >= ${depuis(30)}::timestamptz)::int`,
      membres: sql<number>`count(*) filter (where ${users.memberUntil} > now())::int`,
      clients: sql<number>`count(*) filter (where ${users.role} = 'client')::int`,
      gerants: sql<number>`count(*) filter (where ${users.role} = 'manager')::int`,
      vendeurs: sql<number>`count(*) filter (where ${users.role} = 'seller')::int`,
      admins: sql<number>`count(*) filter (where ${users.role} = 'admin')::int`,
    })
    .from(users);
  const derniers = await db.select().from(users).orderBy(desc(users.createdAt)).limit(10);
  return { ...ligne, derniers };
}

export async function getAllUsers() {
  return db.select().from(users).orderBy(users.role, desc(users.points));
}

export async function getAllPurchases(limit = 30) {
  return db
    .select({ purchase: purchases, user: users, venue: venues })
    .from(purchases)
    .innerJoin(users, eq(purchases.userId, users.id))
    .leftJoin(venues, eq(purchases.venueId, venues.id))
    .orderBy(desc(purchases.createdAt))
    .limit(limit);
}

export async function getAllProducts() {
  return db.select().from(products).orderBy(products.category, products.name);
}

export async function getAllVenues() {
  return db.select().from(venues).orderBy(venues.city, venues.name);
}

export async function getAllEvents() {
  return db
    .select({ event: events, venue: venues, sold: count(tickets.id) })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    // Vendus = payés (valides ou déjà scannés), comme chez le gérant : les
    // tentatives échouées et les places « à payer à l'entrée » n'en sont pas.
    .leftJoin(tickets, and(eq(tickets.eventId, events.id), inArray(tickets.status, ["valid", "used"])))
    // Grouper par `events.id` suffit pour les colonnes d'`events` — Postgres
    // suit la dépendance fonctionnelle depuis une clé primaire. Elle ne
    // traverse pas la jointure : `venues` a besoin de sa propre clé, sans quoi
    // Postgres refuse la requête (42803). SQLite, lui, l'acceptait.
    .groupBy(events.id, venues.id)
    .orderBy(desc(events.createdAt));
}

/* ---------------------------------------------------- événements d'une salle */

/**
 * Les événements d'une salle, avec ce qu'ils ont rapporté.
 *
 * Les compteurs sont des sous-requêtes plutôt que des jointures : trois
 * jointures sur la même table multiplieraient les lignes entre elles, et la
 * recette afficherait le double ou le triple de la réalité.
 *
 * La recette vient des paiements encaissés, pas du prix affiché multiplié par
 * le nombre de billets : un tarif changé en cours de route ne doit pas
 * réécrire ce qui a été payé — c'est exactement l'erreur qu'on a faite sur les
 * jetons.
 */
export async function getVenueEvents(venueId: string) {
  return db
    .select({
      event: events,
      // `mb.events.id` est écrit en toutes lettres : interpolé par Drizzle, il
      // sort en `"id"` nu, et `mb.tickets` en a un aussi — Postgres refuse la
      // référence ambiguë (42702).
      vendus: sql<number>`(select count(*) from mb.tickets t
                            where t.event_id = mb.events.id and t.status in ('valid','used'))`,
      entres: sql<number>`(select count(*) from mb.tickets t
                            where t.event_id = mb.events.id and t.status = 'used')`,
      attente: sql<number>`(select count(*) from mb.tickets t
                             where t.event_id = mb.events.id and t.status = 'pending')`,
      recette: sql<number>`(select coalesce(sum(p.amount), 0)
                              from mb.tickets t
                              join mb.payments p on p.reference = t.reference
                             where t.event_id = mb.events.id
                               and t.status in ('valid','used')
                               and p.status = 'paid')`,
    })
    .from(events)
    .where(eq(events.venueId, venueId))
    .orderBy(desc(events.createdAt));
}

/**
 * Le tournoi dont cet événement est le jumeau, s'il y en a un.
 *
 * Le récapitulatif d'une soirée de tournoi ne montrait que la billetterie
 * spectateurs : les joueurs inscrits et leurs droits d'entrée, qui sont
 * l'essentiel de la recette, n'apparaissaient nulle part.
 */
export async function getTournoiDeLEvenement(eventId: string) {
  const t = (await db.select().from(tournaments).where(eq(tournaments.eventId, eventId)).limit(1))[0];
  if (!t) return null;

  const ligne = (
    await db
      .select({
        inscrits: sql<number>`count(*) filter (where ${tournamentPlayers.status} = 'accepte')`,
        candidats: sql<number>`count(*) filter (where ${tournamentPlayers.status} = 'candidat')`,
        droits: sql<number>`coalesce(sum(case when ${tournamentPlayers.payment} = 'paye' then ${tournamentPlayers.fee} else 0 end), 0)`,
      })
      .from(tournamentPlayers)
      .where(eq(tournamentPlayers.tournamentId, t.id))
  )[0];

  return {
    tournoi: t,
    inscrits: Number(ligne?.inscrits ?? 0),
    candidats: Number(ligne?.candidats ?? 0),
    droits: Number(ligne?.droits ?? 0),
  };
}

/** La liste des participants d'un événement, et ce que chacun a payé. */
export async function getEventAttendees(eventId: string) {
  return db
    .select({
      ticket: tickets,
      user: users,
      paye: payments.amount,
    })
    .from(tickets)
    .innerJoin(users, eq(tickets.userId, users.id))
    .leftJoin(payments, and(eq(payments.reference, tickets.reference), eq(payments.status, "paid")))
    .where(eq(tickets.eventId, eventId))
    .orderBy(desc(tickets.createdAt));
}

export async function getManagers() {
  return db.select().from(users).where(ne(users.role, "client"));
}

/* ------------------------------------------------------------------ Venue OS */

/** Créneaux considérés comme « en cours » pour l'affichage du plan de salle. */
const LIVE_STATUSES = ["confirmed", "seated"];

export type FloorTable = {
  table: VenueTable;
  /** Réservation qui occupe la table maintenant, s'il y en a une. */
  now: { reservation: Reservation; client: string } | null;
  /** Prochaine réservation de la journée. */
  next: { reservation: Reservation; client: string } | null;
};

/**
 * Plan de salle : chaque table avec ce qui s'y passe maintenant et ce qui
 * arrive ensuite. Une seule requête sur les réservations du jour, recoupée en
 * mémoire — une salle a une dizaine de tables, pas mille.
 */
export async function getFloor(venueId: string): Promise<FloorTable[]> {
  const [tables, bookings] = await Promise.all([
    db
      .select()
      .from(venueTables)
      .where(and(eq(venueTables.venueId, venueId), eq(venueTables.active, true)))
      .orderBy(venueTables.sort, venueTables.label),
    db
      .select({ reservation: reservations, client: users.name })
      .from(reservations)
      .innerJoin(users, eq(reservations.userId, users.id))
      .where(
        and(
          eq(reservations.venueId, venueId),
          inArray(reservations.status, LIVE_STATUSES),
          gte(reservations.startsAt, startOfToday()),
        ),
      )
      .orderBy(reservations.startsAt),
  ]);

  const now = Date.now();
  return tables.map((table) => {
    const mine = bookings.filter((b) => b.reservation.tableId === table.id);
    const ends = (r: Reservation) => r.startsAt.getTime() + r.minutes * 60_000;
    return {
      table,
      now: mine.find((b) => b.reservation.startsAt.getTime() <= now && ends(b.reservation) > now) ?? null,
      next: mine.find((b) => b.reservation.startsAt.getTime() > now) ?? null,
    };
  });
}

/** Réservations à venir et passées d'un joueur. */
export async function getReservations(userId: string) {
  return db
    .select({ reservation: reservations, venue: venues, table: venueTables })
    .from(reservations)
    .innerJoin(venues, eq(reservations.venueId, venues.id))
    .leftJoin(venueTables, eq(reservations.tableId, venueTables.id))
    .where(and(eq(reservations.userId, userId), ne(reservations.status, "failed")))
    .orderBy(desc(reservations.startsAt))
    .limit(30);
}

/** Le cahier de réservations du gérant, pour la journée en cours. */
export async function getVenueReservations(venueId: string) {
  return db
    .select({ reservation: reservations, client: users, table: venueTables })
    .from(reservations)
    .innerJoin(users, eq(reservations.userId, users.id))
    .leftJoin(venueTables, eq(reservations.tableId, venueTables.id))
    .where(
      and(
        eq(reservations.venueId, venueId),
        gte(reservations.startsAt, startOfToday()),
        ne(reservations.status, "failed"),
        ne(reservations.status, "pending"),
      ),
    )
    .orderBy(reservations.startsAt);
}

export async function getVenueTables(venueId: string) {
  return db
    .select()
    .from(venueTables)
    .where(eq(venueTables.venueId, venueId))
    .orderBy(venueTables.sort, venueTables.label);
}

export type ShiftHour = { hour: number; revenue: number; scans: number };

/**
 * Le service, heure par heure : recette encaissée au comptoir et passages.
 * C'est la lecture dont un gérant a besoin en fin de soirée.
 */
export async function getShift(venueId: string): Promise<{
  hours: ShiftHour[];
  tokens: number;
  revenue: number;
  deposits: number;
  reserved: number;
  seated: number;
  noShow: number;
  occupancy: number;
  best: { name: string; scans: number } | null;
}> {
  const since = startOfToday();

  const [rows, deposit, bookings, tables, top] = await Promise.all([
    db
      .select({
        hour: sql<number>`extract(hour from ${scans.createdAt})`,
        revenue: sql<number>`coalesce(sum(${scans.amount}), 0)`,
        scans: count(scans.id),
      })
      .from(scans)
      .where(and(eq(scans.venueId, venueId), gte(scans.createdAt, since)))
      .groupBy(sql`extract(hour from ${scans.createdAt})`),
    db
      .select({ total: sql<number>`coalesce(sum(${reservations.deposit}), 0)` })
      .from(reservations)
      .where(
        and(
          eq(reservations.venueId, venueId),
          gte(reservations.startsAt, since),
          inArray(reservations.status, ["confirmed", "seated", "done", "no_show"]),
        ),
      ),
    db
      .select({ status: reservations.status, n: count(reservations.id), minutes: sql<number>`coalesce(sum(${reservations.minutes}), 0)` })
      .from(reservations)
      .where(and(eq(reservations.venueId, venueId), gte(reservations.startsAt, since)))
      .groupBy(reservations.status),
    db
      .select({ n: count(venueTables.id) })
      .from(venueTables)
      .where(and(eq(venueTables.venueId, venueId), eq(venueTables.active, true))),
    db
      .select({ name: users.name, scans: count(scans.id) })
      .from(scans)
      .innerJoin(users, eq(scans.userId, users.id))
      .where(and(eq(scans.venueId, venueId), gte(scans.createdAt, since)))
      .groupBy(users.name)
      .orderBy(desc(count(scans.id)))
      .limit(1),
  ]);

  const hours: ShiftHour[] = Array.from({ length: 24 }, (_, hour) => {
    const found = rows.find((r) => Number(r.hour) === hour);
    return { hour, revenue: Number(found?.revenue ?? 0), scans: Number(found?.scans ?? 0) };
  });

  const byStatus = (name: string) => Number(bookings.find((b) => b.status === name)?.n ?? 0);
  const bookedMinutes = bookings
    .filter((b) => ["confirmed", "seated", "done"].includes(b.status))
    .reduce((sum, b) => sum + Number(b.minutes), 0);

  // Une soirée, c'est douze heures de service : la base du taux d'occupation.
  const capacityMinutes = Math.max(1, Number(tables[0]?.n ?? 0)) * 12 * 60;

  return {
    hours,
    tokens: hours.reduce((sum, h) => sum + h.scans, 0),
    revenue: hours.reduce((sum, h) => sum + h.revenue, 0),
    deposits: Number(deposit[0]?.total ?? 0),
    reserved: byStatus("confirmed"),
    seated: byStatus("seated"),
    noShow: byStatus("no_show"),
    occupancy: Math.min(100, Math.round((bookedMinutes / capacityMinutes) * 100)),
    best: top[0] ? { name: top[0].name, scans: Number(top[0].scans) } : null,
  };
}

/** Le public d'une soirée : quelques visages et le compte des places payées ou gardées. */
export async function getSpectateurs(eventId: string, limite = 4) {
  const filtre = and(eq(tickets.eventId, eventId), inArray(tickets.status, ["valid", "used", "guichet"]));
  const [visages, total] = await Promise.all([
    db
      .selectDistinctOn([users.id], { id: users.id, name: users.name, avatar: users.avatar })
      .from(tickets)
      .innerJoin(users, eq(users.id, tickets.userId))
      .where(filtre)
      .orderBy(users.id)
      .limit(limite),
    db.select({ n: count() }).from(tickets).where(filtre),
  ]);
  return { visages, total: Number(total[0]?.n ?? 0) };
}

/** Les joueurs retenus d'un tableau, en visages. */
export async function getJoueursRetenus(tournamentId: string, limite = 4) {
  return db
    .select({ id: users.id, name: users.name, avatar: users.avatar })
    .from(tournamentPlayers)
    .innerJoin(users, eq(users.id, tournamentPlayers.userId))
    .where(and(eq(tournamentPlayers.tournamentId, tournamentId), eq(tournamentPlayers.status, "accepte")))
    .orderBy(tournamentPlayers.seed, tournamentPlayers.createdAt)
    .limit(limite);
}
