"use server";

import { lireCagnottes, totalCagnottes } from "@/lib/cagnottes";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray, lt, ne, or, sql } from "drizzle-orm";
import type { Match, User } from "@/db";
import {
  db,
  courses,
  enrollments,
  challenges,
  crewMembers,
  crews,
  events,
  friendships,
  invitations,
  notifications,
  matchEvents,
  matchOfficials,
  matches,
  memberPlans,
  memberships,
  orderItems,
  orders,
  packs,
  payments,
  payouts,
  productImages,
  products,
  productVariants,
  purchases,
  reservations,
  scans,
  screens,
  streamPasses,
  streams,
  tickets,
  tokens,
  tournaments,
  tournamentMatches,
  tournamentPlayers,
  users,
  venues,
  venueTables,
} from "@/db";
import { COMMISSION_RATE, POINTS_PER_FREE_TOKEN, XP_PER_TOKEN } from "@/lib/constants";
import { freshCode, freshUserCode, notify, uid } from "@/lib/domain";
import { INVITE_TTL, looksLikePass, passUrl, signPass, verifyPass } from "@/lib/pass";
import { SUITE_COOKIE, suiteValide } from "@/lib/suite";
import { qrShape, type QrShape } from "@/lib/qr";
import { canScore, getMatch } from "@/lib/live";
import {
  canWatch,
  hlsUrl,
  newStreamKey,
  newStreamPath,
  watchTicket,
  whepUrl,
} from "@/lib/stream";
import { refreshPayment, startPayment, type PaymentKind } from "@/lib/payments/service";
import { CATEGORIES, DISCIPLINES as DISCIPLINES_LABELS, TAILLE_MAX } from "@/lib/tournois";
import {
  createSession,
  destroySession,
  hashPassword,
  isValidPhone,
  normalizePhone,
  SESSION_MAX_AGE,
  verifyPassword,
} from "@/lib/auth";
import { getCurrentUser, homeFor, requireRole, requireUser, SESSION_COOKIE } from "@/lib/session";

/* ------------------------------------------------------------------ session */

/**
 * React réinitialise les champs d'un formulaire après une action : on renvoie
 * donc ce qui a été saisi (jamais le mot de passe) pour le réafficher.
 */
export type AuthState = {
  error: string;
  field?: "phone" | "password" | "name";
  values?: { name?: string; phone?: string };
} | null;

/** Empreinte factice : on la vérifie quand le numéro est inconnu, pour que la
 * réponse prenne le même temps qu'un mot de passe erroné (pas d'énumération). */
const DECOY_HASH =
  "scrypt$0000000000000000000000000000000000000000000000000000000000000000$" + "0".repeat(128);

async function openSession(userId: string, role: string) {
  const token = await createSession(userId, (await headers()).get("user-agent"));
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  // Arrivé par un lien partagé (QR d'un tournoi…) : on le ramène là où il allait.
  const suite = suiteValide(jar.get(SUITE_COOKIE)?.value);
  if (suite) {
    jar.delete(SUITE_COOKIE);
    redirect(suite);
  }
  redirect(homeFor(role));
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const typed = String(formData.get("phone") ?? "");
  const phone = normalizePhone(typed);
  const password = String(formData.get("password") ?? "");
  const values = { phone: typed };

  if (!isValidPhone(phone)) return { error: "Numéro camerounais attendu, par exemple 6 77 45 12 08.", field: "phone", values };
  if (!password) return { error: "Entre ton mot de passe.", field: "password", values };

  const found = (await db.select().from(users).where(eq(users.phone, phone)).limit(1))[0];
  const ok = await verifyPassword(password, found?.passwordHash ?? DECOY_HASH);
  if (!found || !ok) return { error: "Numéro ou mot de passe incorrect.", field: "password", values };

  await openSession(found.id, found.role);
  return null;
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const typed = String(formData.get("phone") ?? "");
  const phone = normalizePhone(typed);
  const password = String(formData.get("password") ?? "");
  const values = { name, phone: typed };

  if (name.length < 2) return { error: "Dis-nous comment t'appeler.", field: "name", values };
  if (!isValidPhone(phone)) return { error: "Numéro camerounais attendu, par exemple 6 77 45 12 08.", field: "phone", values };
  if (password.length < 6) return { error: "Six caractères au minimum pour le mot de passe.", field: "password", values };

  const taken = (await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1))[0];
  if (taken) return { error: "Ce numéro a déjà un compte. Connecte-toi.", field: "phone", values };

  const id = uid();
  await db.insert(users).values({
    id,
    name,
    code: await freshUserCode(),
    phone,
    passwordHash: await hashPassword(password),
    role: "client",
  });
  await notify(
    id,
    "Bienvenue chez MASTER BREAK",
    "Recharge ton Pass et présente ton QR au comptoir pour lancer ta première partie.",
    "compte",
    "/app/recharge",
  );

  await openSession(id, "client");
  return null;
}

export async function signOut() {
  const jar = await cookies();
  await destroySession(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  redirect("/connexion");
}

/* ------------------------------------------------------------------- jetons */

export type StartResult =
  | { ok: true; reference: string; instruction?: string; amount: number }
  | { ok: false; error: string };

/**
 * Recharge du Master Pass. La ligne d'achat est créée en attente et rien n'est
 * crédité ici : les jetons n'apparaissent qu'à la confirmation de l'opérateur
 * (webhook PowerPay, ou interrogation depuis l'app).
 */
export async function startPackPurchase(
  packId: string,
  venueId: string,
  method: "om" | "momo",
  phone: string,
): Promise<StartResult> {
  const user = await requireUser();
  const pack = (await db.select().from(packs).where(eq(packs.id, packId)).limit(1))[0];
  if (!pack) return { ok: false, error: "Pack introuvable" };

  const credited = pack.tokens + pack.bonus;
  const purchaseId = uid();

  await db.insert(purchases).values({
    id: purchaseId,
    userId: user.id,
    packId: pack.id,
    venueId,
    tokens: credited,
    amount: pack.price,
    method,
    status: "pending",
  });

  const started = await startPayment({
    kind: "pack",
    userId: user.id,
    amount: pack.price,
    method,
    phone,
    description: `Recharge ${credited} jetons`,
    targetId: purchaseId,
  });

  if (!started.ok) return started;

  await db.update(purchases).set({ reference: started.reference }).where(eq(purchases.id, purchaseId));
  return { ok: true, reference: started.reference, instruction: started.instruction, amount: pack.price };
}

export type PaymentState = {
  status: "pending" | "paid" | "failed" | "expired";
  failureReason: string | null;
  kind: PaymentKind;
  targetId: string | null;
};

/**
 * Interrogé par l'écran d'attente toutes les deux secondes. Le webhook reste la
 * source d'autorité ; ceci couvre le cas où il se perd ou arrive en retard.
 */
export async function pollPayment(reference: string): Promise<PaymentState | null> {
  const user = await requireUser();
  const payment = await refreshPayment(reference, user.id);
  if (!payment) return null;

  if (payment.status === "paid") {
    revalidatePath("/app");
    revalidatePath("/app/pass");
    revalidatePath("/app/commandes");
    revalidatePath("/app/billets");
    revalidatePath("/app/reservations");
    revalidatePath("/app/notifications");
    revalidatePath("/admin/commandes");
    revalidatePath("/gerant/salle");
  }

  return {
    status: payment.status,
    failureReason: payment.failureReason,
    kind: payment.kind,
    targetId: payment.targetId,
  };
}

export type ScanResult =
  | { ok: true; kind: "token"; client: string; venue: string; remaining: number; table: number | null }
  | { ok: true; kind: "ticket"; client: string; event: string; aEncaisser?: number }
  | { ok: false; error: string };

/**
 * Débit d'un jeton (ou validation d'un billet) depuis Master Scan.
 *
 * Deux entrées possibles : le laissez-passer signé du QR, qui expire au bout de
 * 90 secondes, ou le code à quatre chiffres tapé à la main quand le réseau du
 * client lâche. Dans les deux cas on finit sur le même code, et c'est le
 * passage du jeton en « utilisé » qui empêche de le rejouer.
 */
export async function scanCode(raw: string, method: "qr" | "code" = "code"): Promise<ScanResult> {
  const manager = await requireRole("manager", "admin");
  let code = raw.trim();

  if (looksLikePass(code)) {
    const check = verifyPass(code);
    if (!check.ok) {
      return {
        ok: false,
        error:
          check.reason === "expired"
            ? "QR périmé — demande au client de rafraîchir son Master Pass"
            : "QR invalide — ce n'est pas un Master Pass",
      };
    }
    code = check.claims.c;
    method = "qr";
  }

  if (!/^\d{4}$/.test(code)) return { ok: false, error: "Code à 4 chiffres attendu" };

  const token = (
    await db
      .select()
      .from(tokens)
      .where(and(eq(tokens.code, code), eq(tokens.status, "active")))
      .limit(1)
  )[0];

  if (token) {
    const venueId = manager.venueId ?? token.venueId;
    const venue = venueId ? (await db.select().from(venues).where(eq(venues.id, venueId)).limit(1))[0] : null;
    const client = (await db.select().from(users).where(eq(users.id, token.userId)).limit(1))[0];

    await db.update(tokens).set({ status: "used", usedAt: new Date(), venueId }).where(eq(tokens.id, token.id));
    await db.insert(scans).values({
      id: uid(),
      kind: "token",
      refId: token.id,
      code,
      userId: token.userId,
      venueId,
      managerId: manager.id,
      method,
      // Ce que le client a réellement payé pour CE jeton, figé à l'achat. Le
      // tarif de la salle ne sert plus que de repli pour les jetons d'avant
      // cette colonne — et pour ceux offerts à la main, qui n'ont pas de prix.
      amount: token.unitPrice ?? venue?.tokenPrice ?? 0,
    });
    await db
      .update(users)
      .set({ points: sql`${users.points} + ${XP_PER_TOKEN}` })
      .where(eq(users.id, token.userId));
    await notify(
      token.userId,
      "Jeton débité",
      `${venue?.name ?? "Salle partenaire"} · +${XP_PER_TOKEN} XP`,
      "token",
      "/app/pass",
    );

    // Ses amis apprennent qu'il joue, et où. C'est le ressort d'une salle de
    // quartier : on ne décide pas d'aller jouer, on apprend qu'un ami y est.
    const { prevenirLesAmisQuIlJoue } = await import("@/lib/annonces");
    await prevenirLesAmisQuIlJoue(
      token.userId,
      venue ? { name: venue.name, slug: venue.slug } : null,
      "Il vient de poser un jeton sur la table.",
    );

    const rest = await db
      .select({ n: sql<number>`count(*)` })
      .from(tokens)
      .where(and(eq(tokens.userId, token.userId), eq(tokens.status, "active")));

    revalidatePath("/gerant");
    revalidatePath("/app");
    revalidatePath("/app/pass");
    revalidatePath("/admin");
    return {
      ok: true,
      kind: "token",
      client: client?.name ?? "Client MASTER BREAK",
      venue: venue?.name ?? "Salle partenaire",
      remaining: Number(rest[0]?.n ?? 0),
      table: token.tableNumber,
    };
  }

  const ticket = (
    await db
      .select({ ticket: tickets, event: events, user: users })
      .from(tickets)
      .innerJoin(events, eq(tickets.eventId, events.id))
      .innerJoin(users, eq(tickets.userId, users.id))
      .where(and(eq(tickets.code, code), inArray(tickets.status, ["valid", "guichet"])))
      .limit(1)
  )[0];

  // Un billet réservé « à payer au guichet » : on l'encaisse à l'entrée. Le
  // contrôleur voit le montant à demander, le billet passe utilisé, et la
  // référence « guichet: » le sort de la recette en ligne — cet argent-là est
  // déjà dans la caisse de la salle.
  if (ticket && ticket.ticket.status === "guichet") {
    await db
      .update(tickets)
      .set({ status: "used", usedAt: new Date(), reference: `guichet:${ticket.ticket.id}` })
      .where(eq(tickets.id, ticket.ticket.id));
    await db.insert(scans).values({
      id: uid(),
      kind: "ticket",
      refId: ticket.ticket.id,
      code,
      userId: ticket.user.id,
      venueId: manager.venueId ?? ticket.event.venueId,
      managerId: manager.id,
      method,
      amount: ticket.event.price,
    });
    revalidatePath("/gerant");
    revalidatePath("/gerant/evenements");
    revalidatePath("/admin");
    return { ok: true, kind: "ticket", client: ticket.user.name, event: ticket.event.title, aEncaisser: ticket.event.price };
  }

  if (ticket) {
    // Ce que le billet a rapporté, figé au scan : sans lui, la recette du jour
    // d'une salle ignorait purement et simplement ses soirées — le gérant
    // encaissait des entrées et son tableau de bord affichait zéro.
    const regle = ticket.ticket.reference
      ? (
          await db
            .select({ amount: payments.amount })
            .from(payments)
            .where(and(eq(payments.reference, ticket.ticket.reference), eq(payments.status, "paid")))
            .limit(1)
        )[0]?.amount
      : undefined;

    await db.update(tickets).set({ status: "used", usedAt: new Date() }).where(eq(tickets.id, ticket.ticket.id));
    await db.insert(scans).values({
      id: uid(),
      kind: "ticket",
      refId: ticket.ticket.id,
      code,
      userId: ticket.user.id,
      venueId: manager.venueId ?? ticket.event.venueId,
      managerId: manager.id,
      method,
      amount: regle ?? ticket.event.price,
    });
    revalidatePath("/gerant");
    revalidatePath("/gerant/evenements");
    revalidatePath("/admin");
    return { ok: true, kind: "ticket", client: ticket.user.name, event: ticket.event.title };
  }

  return { ok: false, error: `Code ${code} inconnu ou déjà utilisé` };
}

/**
 * Renouvelle les laissez-passer du Master Pass. L'écran appelle cette action à
 * chaque fin de cycle : le QR affiché n'est jamais valable plus de 90 secondes.
 */
export async function rotatePass(): Promise<{ id: string; code: string; shape: QrShape }[]> {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(tokens)
    .where(and(eq(tokens.userId, user.id), eq(tokens.status, "active")))
    .orderBy(tokens.createdAt);

  return rows.map((token) => ({
    id: token.id,
    code: token.code,
    shape: qrShape(passUrl({ k: "token", i: token.id, c: token.code, u: user.id })),
  }));
}

/* ---------------------------------------------------------------- boutique */

export type CheckoutItem = { slug: string; qty: number; variantId?: string | null };
export type CheckoutResult =
  | { ok: true; reference: string; orderId: string; total: number; instruction?: string }
  | { ok: false; error: string };

/** La commande naît en attente ; le stock n'est décompté qu'au paiement. */
export async function checkout(
  items: CheckoutItem[],
  fulfillment: "pickup" | "delivery",
  method: "om" | "momo",
  phone: string,
  venueId?: string,
): Promise<CheckoutResult> {
  const user = await requireUser();
  if (items.length === 0) return { ok: false, error: "Panier vide" };

  const rows = await db
    .select()
    .from(products)
    .where(
      inArray(
        products.slug,
        items.map((i) => i.slug),
      ),
    );

  // Les déclinaisons commandées, relues en base : le prix d'une saveur ne se
  // prend jamais dans le navigateur, qui peut dire n'importe quoi.
  const idsVariantes = items.map((i) => i.variantId).filter((v): v is string => Boolean(v));
  const variantes = idsVariantes.length
    ? await db.select().from(productVariants).where(inArray(productVariants.id, idsVariantes))
    : [];

  let total = fulfillment === "delivery" ? 1000 : 0;
  const lines = items
    .map((item) => {
      const product = rows.find((p) => p.slug === item.slug);
      if (!product) return null;
      const variante = item.variantId ? variantes.find((v) => v.id === item.variantId) : undefined;
      // Une déclinaison demandée mais introuvable, retirée du catalogue ou
      // rattachée à un autre article : on ne devine pas, on refuse la ligne.
      if (item.variantId && (!variante || !variante.active || variante.productId !== product.id)) return null;

      const prix = variante?.price ?? product.price;
      const ligne = prix * item.qty;
      total += ligne;
      // Le vendeur et la commission sont figés ici, avec le prix : un article
      // repris par un autre vendeur, ou un taux revu l'an prochain, ne doivent
      // pas réécrire ce qu'on doit pour une vente d'aujourd'hui. Le nom de la
      // déclinaison aussi : une saveur renommée ne réécrit pas la commande.
      return {
        id: uid(),
        productId: product.id,
        variantId: variante?.id ?? null,
        variantLabel: variante?.name ?? "",
        qty: item.qty,
        unitPrice: prix,
        sellerId: product.sellerId,
        commission: product.sellerId ? Math.round(ligne * COMMISSION_RATE) : ligne,
      };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);

  if (lines.length === 0) return { ok: false, error: "Produits introuvables" };

  const orderId = uid();
  await db.insert(orders).values({
    id: orderId,
    userId: user.id,
    venueId: venueId ?? null,
    total,
    method,
    fulfillment,
    status: "pending",
  });
  await db.insert(orderItems).values(lines.map((l) => ({ ...l, orderId })));

  const started = await startPayment({
    kind: "order",
    userId: user.id,
    amount: total,
    method,
    phone,
    description: `Commande ${lines.length} article${lines.length > 1 ? "s" : ""}`,
    targetId: orderId,
  });

  if (!started.ok) {
    revalidatePath("/app/commandes");
    return started;
  }

  await db.update(orders).set({ reference: started.reference }).where(eq(orders.id, orderId));
  revalidatePath("/app/commandes");
  return { ok: true, reference: started.reference, orderId, total, instruction: started.instruction };
}

/* ------------------------------------------------------------------ billets */

export type TicketResult =
  | { ok: true; free: true; code: string; guichet?: boolean }
  | { ok: true; free: false; reference: string; instruction?: string; amount: number }
  | { ok: false; error: string };

/** Billet gratuit : émis tout de suite. Billet payant : émis à la confirmation. */
export async function buyTicket(
  eventId: string,
  phone?: string,
  method: "om" | "momo" | "guichet" = "momo",
): Promise<TicketResult> {
  const user = await requireUser();
  const event = (await db.select().from(events).where(eq(events.id, eventId)).limit(1))[0];
  if (!event) return { ok: false, error: "Événement introuvable" };
  // Une soirée close ne vend plus rien : le tournoi jumeau qui restait ouvert
  // après sa finale encaissait des billets pour une soirée déjà passée.
  const { billetterieOuverte } = await import("@/lib/soirees");
  if (!billetterieOuverte(event)) return { ok: false, error: "Cette soirée est terminée" };
  if (event.attendees >= event.capacity) return { ok: false, error: "Complet" };

  const code = await freshCode();
  const ticketId = uid();

  if (event.price <= 0) {
    await db.insert(tickets).values({ id: ticketId, eventId, userId: user.id, code, status: "valid" });
    await db
      .update(events)
      .set({ attendees: sql`${events.attendees} + 1` })
      .where(eq(events.id, eventId));
    await notify(user.id, `Billet · ${event.title}`, `${event.day} · code ${code}`, "event", "/app/billets");

    revalidatePath(`/app/events/${event.slug}`);
    revalidatePath("/app/billets");
    return { ok: true, free: true, code };
  }

  // Payer à l'entrée : la place est gardée, le billet porte son code, et le
  // contrôleur encaisse en le scannant. Un seul billet en attente par personne
  // et par soirée : sinon on bloquerait la salle à coups de réservations.
  if (method === "guichet") {
    const deja = (
      await db
        .select({ code: tickets.code })
        .from(tickets)
        .where(and(eq(tickets.eventId, eventId), eq(tickets.userId, user.id), eq(tickets.status, "guichet")))
        .limit(1)
    )[0];
    if (deja) return { ok: true, free: true, code: deja.code, guichet: true };
    await db.insert(tickets).values({ id: ticketId, eventId, userId: user.id, code, status: "guichet" });
    await db
      .update(events)
      .set({ attendees: sql`${events.attendees} + 1` })
      .where(eq(events.id, eventId));
    await notify(
      user.id,
      `Place réservée · ${event.title}`,
      `${event.day} · à régler à l'entrée (${event.price.toLocaleString("fr-FR")} F) · code ${code}`,
      "event",
      "/app/billets",
    );
    revalidatePath(`/app/events/${event.slug}`);
    revalidatePath("/app/billets");
    return { ok: true, free: true, code, guichet: true };
  }

  if (!phone) return { ok: false, error: "Numéro Mobile Money requis" };

  await db.insert(tickets).values({ id: ticketId, eventId, userId: user.id, code, status: "pending" });

  const started = await startPayment({
    kind: "ticket",
    userId: user.id,
    amount: event.price,
    method,
    phone,
    description: `Billet ${event.title}`,
    targetId: ticketId,
  });

  if (!started.ok) return started;

  await db.update(tickets).set({ reference: started.reference }).where(eq(tickets.id, ticketId));
  return { ok: true, free: false, reference: started.reference, instruction: started.instruction, amount: event.price };
}

/* ------------------------------------------------------------------ rewards */

export type ConvertResult = { ok: true; points: number } | { ok: false; error: string };

export async function convertPoints(): Promise<ConvertResult> {
  const user = await requireUser();
  if (user.points < POINTS_PER_FREE_TOKEN) return { ok: false, error: "Il te faut 500 points" };

  await db
    .update(users)
    .set({ points: user.points - POINTS_PER_FREE_TOKEN })
    .where(eq(users.id, user.id));
  await db.insert(tokens).values({
    id: uid(),
    code: await freshCode(),
    userId: user.id,
    venueId: null,
    status: "active",
  });
  await notify(user.id, "Jeton offert", "500 points convertis en 1 jeton de partie.", "reward", "/app/pass");

  revalidatePath("/app/rewards");
  revalidatePath("/app/pass");
  revalidatePath("/app");
  return { ok: true, points: user.points - POINTS_PER_FREE_TOKEN };
}

export type PhotoResult = { ok: true; avatar: string | null } | { ok: false; error: string };

/**
 * Sa propre photo de profil.
 *
 * Un joueur n'avait aucun moyen de changer son avatar : il gardait la lettre
 * de ses initiales, ou la photo posée à la main par le semis. Il choisit
 * maintenant la sienne — déposée depuis son téléphone, ou collée en adresse,
 * comme partout ailleurs dans l'application.
 */
export async function changerMaPhoto(formData: FormData): Promise<PhotoResult> {
  const moi = await requireUser();
  const valeur = str(formData, "avatar").slice(0, 500);

  // Vide : on retire la photo, et les initiales reprennent leur place.
  if (!valeur) {
    await db.update(users).set({ avatar: null }).where(eq(users.id, moi.id));
    revalidatePath("/app");
    revalidatePath("/app/rewards");
    revalidatePath(`/app/joueurs/${moi.id}`);
    return { ok: true, avatar: null };
  }

  // Une image interne ou une adresse http : rien d'autre. Un `javascript:`
  // ou un `data:` n'a rien à faire dans un attribut `src` rendu à tous.
  const propre = /^\/[\w./-]*$/.test(valeur) || /^https?:\/\/\S+$/i.test(valeur);
  if (!propre) return { ok: false, error: "Donne une adresse d'image, ou dépose un fichier." };

  await db.update(users).set({ avatar: valeur }).where(eq(users.id, moi.id));
  revalidatePath("/app");
  revalidatePath("/app/rewards");
  revalidatePath(`/app/joueurs/${moi.id}`);
  revalidatePath("/app/classement");
  return { ok: true, avatar: valeur };
}

export async function markNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;
  await db.update(notifications).set({ read: true }).where(eq(notifications.userId, user.id));
  revalidatePath("/app/notifications");
  revalidatePath("/app");
}

/* -------------------------------------------------------------------- admin */

/**
 * Le même formulaire envoyé deux fois de suite.
 *
 * Un pouce qui hésite sur un téléphone, un réseau qui traîne, un rechargement
 * de page : le second envoi arrive avant que le premier n'ait rendu la main,
 * et deux soirées identiques apparaissent à l'affiche. Le bouton se désarme
 * déjà côté navigateur, mais un bouton ne protège que ceux qui passent par
 * lui — la garde qui compte est ici.
 *
 * Trente secondes : au-delà, deux créations du même nom sont volontaires, et
 * rien ne doit empêcher une salle d'avoir deux « Nuit Néon ».
 */
const RATTRAPAGE_MS = 30_000;
const dejaCree = (quand?: Date | null) => Boolean(quand && Date.now() - quand.getTime() < RATTRAPAGE_MS);

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const num = (fd: FormData, key: string) => Number(fd.get(key) ?? 0) || 0;
const bool = (fd: FormData, key: string) => fd.get(key) === "on" || fd.get(key) === "true";

/** Un `<input type="datetime-local">` vide vaut `null`, pas « 1970 ». */
const date = (fd: FormData, key: string) => {
  const brut = String(fd.get(key) ?? "").trim();
  if (!brut) return null;
  const d = new Date(brut);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Une adresse lisible : accents ôtés, espaces en tirets, rien d'autre. */
const slugify = (texte: string) =>
  texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/**
 * Une adresse libre, quitte à numéroter.
 *
 * `slug` est unique en base : deux soirées appelées « Nuit Néon » faisaient
 * échouer la seconde avec une erreur Postgres au visage du gérant. Et un titre
 * accentué donnait une adresse accentuée, qui ne se retrouvait plus.
 *
 * À la modification, la ligne ne se compte pas elle-même : sinon une soirée
 * enregistrée deux fois changerait d'adresse à chaque fois, et les liens déjà
 * partagés tomberaient dans le vide.
 */
async function slugLibre(
  base: string,
  existe: (slug: string) => Promise<boolean>,
  repli: string,
): Promise<string> {
  const racine = slugify(base) || repli;
  if (!(await existe(racine))) return racine;
  for (let n = 2; n < 60; n++) {
    const essai = `${racine}-${n}`;
    if (!(await existe(essai))) return essai;
  }
  return `${racine}-${Date.now().toString(36)}`;
}

export async function saveVenue(formData: FormData) {
  await requireRole("admin");
  const id = str(formData, "id");
  const nom = str(formData, "name");
  const slug =
    str(formData, "slug") ||
    (await slugLibre(
      nom,
      async (essai) =>
        ((await db
          .select({ id: venues.id })
          .from(venues)
          .where(and(eq(venues.slug, essai), id ? ne(venues.id, id) : undefined))
          .limit(1))[0]?.id ?? null) !== null,
      "salle",
    ));

  const values = {
    slug,
    name: nom,
    area: str(formData, "area"),
    city: str(formData, "city"),
    address: str(formData, "address"),
    tables: num(formData, "tables"),
    freeTables: num(formData, "freeTables"),
    tokenPrice: num(formData, "tokenPrice"),
    distanceKm: num(formData, "distanceKm"),
    image: str(formData, "image") || "/img/hall-dark.jpg",
    active: bool(formData, "active"),
  };

  if (id) await db.update(venues).set(values).where(eq(venues.id, id));
  else {
    const recent = (
      await db.select().from(venues).where(eq(venues.name, values.name)).orderBy(desc(venues.createdAt)).limit(1)
    )[0];
    if (!dejaCree(recent?.createdAt)) await db.insert(venues).values({ id: uid(), ...values });
  }

  revalidatePath("/admin/salles");
  revalidatePath("/app/salles");
  revalidatePath("/");
}

export async function deleteVenue(formData: FormData) {
  await requireRole("admin");
  await db.update(venues).set({ active: false }).where(eq(venues.id, str(formData, "id")));
  revalidatePath("/admin/salles");
}

export async function saveProduct(formData: FormData) {
  // Un vendeur tient ses articles ; un gérant vend aussi au comptoir de sa
  // salle, et n'avait aucun moyen de mettre une puff en ligne. L'administrateur
  // tient ceux de la maison et peut corriger n'importe lesquels.
  const auteur = await requireRole("admin", "seller", "manager");
  const id = str(formData, "id");
  const proprietaire = auteur.role !== "admin";

  if (proprietaire && id) {
    const actuel = (await db.select().from(products).where(eq(products.id, id)).limit(1))[0];
    if (!actuel || actuel.sellerId !== auteur.id) redirect("/vendeur?refus=1");
  }

  const nom = str(formData, "name");
  const slug =
    str(formData, "slug") ||
    (await slugLibre(
      nom,
      async (essai) =>
        ((await db
          .select({ id: products.id })
          .from(products)
          .where(and(eq(products.slug, essai), id ? ne(products.id, id) : undefined))
          .limit(1))[0]?.id ?? null) !== null,
      "article",
    ));

  const values = {
    slug,
    name: nom,
    detail: str(formData, "detail"),
    description: str(formData, "description"),
    price: num(formData, "price"),
    image: str(formData, "image") || "/img/puffs.jpg",
    category: str(formData, "category") || "vapes",
    badgeLabel: str(formData, "badgeLabel") || null,
    badgeTone: str(formData, "badgeTone") || null,
    stock: num(formData, "stock"),
    active: bool(formData, "active"),
  };

  // Le vendeur ne se choisit pas dans un formulaire : à la création, c'est
  // l'auteur ; à la modification, on n'y touche pas — un article ne change
  // pas de mains par un champ caché.
  if (id) await db.update(products).set(values).where(eq(products.id, id));
  else {
    const recent = (
      await db
        .select()
        .from(products)
        .where(and(eq(products.name, values.name), proprietaire ? eq(products.sellerId, auteur.id) : sql`true`))
        .orderBy(desc(products.createdAt))
        .limit(1)
    )[0];
    if (!dejaCree(recent?.createdAt)) {
      await db.insert(products).values({
        id: uid(),
        ...values,
        sellerId: proprietaire ? auteur.id : null,
      });
    }
  }

  revalidatePath("/vendeur");
  revalidatePath("/admin/produits");
  revalidatePath("/app/shop");
}

export async function deleteProduct(formData: FormData) {
  const auteur = await requireRole("admin", "seller", "manager");
  const id = str(formData, "id");

  // Retirer un article le masque plutôt que de le supprimer : des commandes
  // passées y renvoient, et une ligne de vente sans produit est une ligne
  // qu'on ne sait plus expliquer.
  const ou =
    auteur.role === "admin"
      ? eq(products.id, id)
      : and(eq(products.id, id), eq(products.sellerId, auteur.id));

  await db.update(products).set({ active: false }).where(ou);
  revalidatePath("/vendeur");
  revalidatePath("/admin/produits");
  revalidatePath("/app/shop");
}

/**
 * Qui a le droit de toucher à cet article.
 *
 * Un vendeur et un gérant ne touchent qu'aux leurs ; l'administration touche
 * à tout. La galerie et les déclinaisons passent par la même porte que la
 * fiche — sinon on protégerait le prix et pas le stock d'une saveur.
 */
async function monArticle(productId: string) {
  const auteur = await requireRole("admin", "seller", "manager");
  const article = (await db.select().from(products).where(eq(products.id, productId)).limit(1))[0];
  if (!article) redirect("/vendeur?refus=1");
  if (auteur.role !== "admin" && article.sellerId !== auteur.id) redirect("/vendeur?refus=1");
  return article;
}

function rafraichirArticle(slug: string) {
  revalidatePath("/vendeur/articles");
  revalidatePath("/admin/produits");
  revalidatePath("/app/shop");
  revalidatePath(`/app/shop/${slug}`);
}

/** Une photo de plus dans la galerie d'un article. */
export async function ajouterImageProduit(formData: FormData) {
  const article = await monArticle(str(formData, "productId"));
  const url = str(formData, "url").slice(0, 500);
  if (!url) return;
  // Même garde que pour une photo de profil : une adresse d'image, rien d'autre.
  if (!/^\/[\w./-]*$/.test(url) && !/^https?:\/\/\S+$/i.test(url)) return;

  const dernier = (
    await db
      .select({ n: sql<number>`coalesce(max(${productImages.sort}), 0)` })
      .from(productImages)
      .where(eq(productImages.productId, article.id))
  )[0];

  await db.insert(productImages).values({
    id: uid(),
    productId: article.id,
    url,
    sort: Number(dernier?.n ?? 0) + 1,
  });
  rafraichirArticle(article.slug);
}

export async function retirerImageProduit(formData: FormData) {
  const article = await monArticle(str(formData, "productId"));
  await db
    .delete(productImages)
    .where(and(eq(productImages.id, str(formData, "id")), eq(productImages.productId, article.id)));
  rafraichirArticle(article.slug);
}

/**
 * Une déclinaison : une saveur, une contenance, une couleur.
 *
 * Le prix laissé vide reprend celui de l'article — c'est le cas courant, et
 * demander de retaper le même nombre pour dix saveurs est le meilleur moyen
 * d'en avoir une à 200 F par faute de frappe.
 */
export async function enregistrerVariante(formData: FormData) {
  const article = await monArticle(str(formData, "productId"));
  const id = str(formData, "id");
  const nom = str(formData, "name").slice(0, 80);
  if (!nom) return;

  const prixBrut = str(formData, "price");
  const values = {
    name: nom,
    price: prixBrut === "" ? null : Math.max(0, num(formData, "price")),
    stock: Math.max(0, num(formData, "stock")),
    image: str(formData, "image").slice(0, 500) || null,
    active: !formData.has("active") || bool(formData, "active"),
  };

  if (id) {
    await db
      .update(productVariants)
      .set(values)
      .where(and(eq(productVariants.id, id), eq(productVariants.productId, article.id)));
  } else {
    const dernier = (
      await db
        .select({ n: sql<number>`coalesce(max(${productVariants.sort}), 0)` })
        .from(productVariants)
        .where(eq(productVariants.productId, article.id))
    )[0];
    await db.insert(productVariants).values({
      id: uid(),
      productId: article.id,
      sort: Number(dernier?.n ?? 0) + 1,
      ...values,
    });
  }
  rafraichirArticle(article.slug);
}

/**
 * Retirer une déclinaison.
 *
 * On la désactive plutôt que de l'effacer : des commandes passées y renvoient,
 * et une ligne de vente sans déclinaison est une ligne qu'on ne sait plus
 * expliquer — la même règle que pour un article retiré de la vente.
 */
export async function retirerVariante(formData: FormData) {
  const article = await monArticle(str(formData, "productId"));
  await db
    .update(productVariants)
    .set({ active: false })
    .where(and(eq(productVariants.id, str(formData, "id")), eq(productVariants.productId, article.id)));
  rafraichirArticle(article.slug);
}

export async function savePack(formData: FormData) {
  await requireRole("admin");
  const id = str(formData, "id");
  const { JETONS_MIN_PACK } = await import("@/lib/tokens");
  const values = {
    // On ne vend que des packs : en dessous de trois jetons, il n'y a pas de
    // pack, il y a une partie à l'unité — et le modèle n'en veut pas.
    tokens: Math.max(JETONS_MIN_PACK, num(formData, "tokens")),
    price: num(formData, "price"),
    bonus: num(formData, "bonus"),
    hint: str(formData, "hint"),
    badge: str(formData, "badge") || null,
    sort: num(formData, "sort"),
    active: bool(formData, "active"),
  };

  if (id) await db.update(packs).set(values).where(eq(packs.id, id));
  else await db.insert(packs).values({ id: uid(), ...values });

  revalidatePath("/admin/packs");
  revalidatePath("/app/recharge");
}

export async function deletePack(formData: FormData) {
  await requireRole("admin");
  await db.update(packs).set({ active: false }).where(eq(packs.id, str(formData, "id")));
  revalidatePath("/admin/packs");
}

/**
 * Mettre un événement à la une : c'est lui, et son image, qui ouvrent l'accueil
 * du site et de l'application. Un seul à la fois — le choisir retire l'ancien.
 * Réservé à l'administration : la une est celle de tout Master Break.
 */
export async function mettreALaUne(formData: FormData) {
  await requireRole("admin");
  const id = str(formData, "id");
  const retirer = str(formData, "retirer") === "on";
  await db.update(events).set({ featured: false }).where(eq(events.featured, true));
  if (id && !retirer) await db.update(events).set({ featured: true }).where(eq(events.id, id));
  revalidatePath("/");
  revalidatePath("/app");
  revalidatePath("/app/events");
  revalidatePath("/admin/evenements");
}

export async function saveEvent(formData: FormData) {
  // Un gérant tient l'agenda de sa salle : c'est lui qui sait quel soir la
  // finale se joue. Il n'écrit que chez lui — la salle est imposée plus bas,
  // et une modification ne prend que si l'événement est déjà le sien.
  const auteur = await requireRole("admin", "manager");
  const id = str(formData, "id");

  if (auteur.role === "manager") {
    if (!auteur.venueId) redirect("/gerant?refus=1");
    if (id) {
      const actuel = (await db.select().from(events).where(eq(events.id, id)).limit(1))[0];
      if (!actuel || actuel.venueId !== auteur.venueId) redirect("/gerant/evenements?refus=1");
    }
  }

  const titre = str(formData, "title");
  const slug =
    str(formData, "slug") ||
    (await slugLibre(
      titre,
      async (essai) =>
        ((await db
          .select({ id: events.id })
          .from(events)
          .where(and(eq(events.slug, essai), id ? ne(events.id, id) : undefined))
          .limit(1))[0]?.id ?? null) !== null,
      "soiree",
    ));

  const values = {
    slug,
    title: titre,
    subtitle: str(formData, "subtitle"),
    day: str(formData, "day"),
    hours: str(formData, "hours"),
    checkin: str(formData, "checkin"),
    // Un gérant ne choisit pas la salle : c'est la sienne.
    venueId: auteur.role === "manager" ? auteur.venueId : str(formData, "venueId") || null,
    address: str(formData, "address"),
    price: num(formData, "price"),
    image: str(formData, "image") || "/img/crowd-lights.jpg",
    capacity: num(formData, "capacity"),
    description: str(formData, "description"),
    tags: str(formData, "tags"),
    active: bool(formData, "active"),
  };

  let cree = true;
  if (id) await db.update(events).set(values).where(eq(events.id, id));
  else {
    const recent = (
      await db.select().from(events).where(eq(events.title, values.title)).orderBy(desc(events.createdAt)).limit(1)
    )[0];
    cree = !dejaCree(recent?.createdAt);
    if (cree) await db.insert(events).values({ id: uid(), ...values, attendees: 0 });
  }

  // Une soirée à l'affiche se dit à toute la salle — une fois, à sa
  // publication. Un brouillon masqué, non : on n'annonce pas ce qu'on ne peut
  // pas encore ouvrir.
  if (values.active && cree) {
    const { annoncerATous } = await import("@/lib/annonces");
    await annoncerATous({
      titre: values.title,
      corps: [values.day, values.hours, values.price > 0 ? `${values.price.toLocaleString("fr-FR")} F` : "entrée libre"]
        .filter(Boolean)
        .join(" · "),
      kind: "event",
      href: `/app/events/${slug}`,
      sauf: auteur.id,
    });
  }

  revalidatePath("/admin/evenements");
  revalidatePath("/gerant/evenements");
  revalidatePath("/app/events");
  revalidatePath("/");
}

/**
 * Clore une soirée, ou la rouvrir.
 *
 * `day` est du texte libre : rien dans la base ne savait dire qu'une soirée
 * était passée, et l'affiche restait « en cours » des semaines après. Le
 * gérant la referme d'un geste, et le tournoi jumeau la referme tout seul
 * quand sa finale tombe.
 */
export async function cloreEvenement(formData: FormData) {
  const auteur = await requireRole("admin", "manager");
  const id = str(formData, "id");
  const event = (await db.select().from(events).where(eq(events.id, id)).limit(1))[0];
  if (!event) return;
  if (auteur.role === "manager" && event.venueId !== auteur.venueId) redirect("/gerant/evenements?refus=1");

  const rouvrir = bool(formData, "rouvrir");
  await db.update(events).set({ endedAt: rouvrir ? null : new Date() }).where(eq(events.id, id));

  revalidatePath("/gerant/evenements");
  revalidatePath(`/gerant/evenements/${id}`);
  revalidatePath("/admin/evenements");
  revalidatePath("/app/events");
  revalidatePath(`/app/events/${event.slug}`);
  revalidatePath("/");
}

export async function deleteEvent(formData: FormData) {
  await requireRole("admin");
  await db.update(events).set({ active: false }).where(eq(events.id, str(formData, "id")));
  revalidatePath("/admin/evenements");
  revalidatePath("/app/events");
  revalidatePath("/");
}

export async function setUserRole(formData: FormData) {
  await requireRole("admin");
  const role = str(formData, "role");
  const venueId = str(formData, "venueId") || null;
  await db
    .update(users)
    .set({ role, venueId: role === "manager" ? venueId : null })
    .where(eq(users.id, str(formData, "id")));
  revalidatePath("/admin/utilisateurs");
}

export async function setOrderStatus(formData: FormData) {
  await requireRole("admin", "manager");
  await db
    .update(orders)
    .set({ status: str(formData, "status") })
    .where(eq(orders.id, str(formData, "id")));
  revalidatePath("/admin/commandes");
  revalidatePath("/app/commandes");
}

/* ----------------------------------------------------------------- Venue OS */

/**
 * Réservations qui mordent sur [début, fin[ et tiennent encore la table.
 *
 * La borne de fin se calcule en SQL (`starts_at + minutes`). Les dates sont
 * passées en ISO avec un cast explicite : dans un fragment brut, une `Date` JS
 * part telle quelle et Postgres refuse « Mon Sep 21 2026 … ».
 */
function overlaps(startsAt: Date, endsAt: Date) {
  return and(
    inArray(reservations.status, ["confirmed", "seated"]),
    lt(reservations.startsAt, endsAt),
    sql`${reservations.startsAt} + make_interval(mins => ${reservations.minutes}) > ${startsAt.toISOString()}::timestamptz`,
  );
}

export type ReservationResult =
  | { ok: true; reference: string; instruction?: string; deposit: number }
  | { ok: false; error: string };

/**
 * Retenue d'une table. La réservation naît en attente et la table n'est bloquée
 * qu'une fois l'acompte confirmé : sinon, il suffirait d'ouvrir l'écran de
 * paiement pour geler la salle un soir de match.
 */
export async function reserveTable(
  tableId: string,
  startsAtIso: string,
  minutes: number,
  players: number,
  phone: string,
  method: "om" | "momo",
  note = "",
): Promise<ReservationResult> {
  const user = await requireUser();

  const table = (await db.select().from(venueTables).where(eq(venueTables.id, tableId)).limit(1))[0];
  if (!table || !table.active) return { ok: false, error: "Table introuvable" };
  if (table.status === "closed") return { ok: false, error: "Cette table est fermée ce soir" };

  const startsAt = new Date(startsAtIso);
  if (Number.isNaN(startsAt.getTime())) return { ok: false, error: "Créneau invalide" };
  if (startsAt.getTime() < Date.now() - 60_000) return { ok: false, error: "Ce créneau est déjà passé" };
  if (minutes < 30 || minutes > 360) return { ok: false, error: "Durée entre 30 minutes et 6 heures" };

  const endsAt = new Date(startsAt.getTime() + minutes * 60_000);
  const clash = await db
    .select({ id: reservations.id })
    .from(reservations)
    .where(and(eq(reservations.tableId, tableId), overlaps(startsAt, endsAt)))
    .limit(1);
  if (clash[0]) return { ok: false, error: "Ce créneau vient d'être pris" };

  const id = uid();
  await db.insert(reservations).values({
    id,
    venueId: table.venueId,
    tableId,
    userId: user.id,
    startsAt,
    minutes,
    players,
    deposit: table.deposit,
    note: note.slice(0, 200),
    status: "pending",
  });

  const started = await startPayment({
    kind: "reservation",
    userId: user.id,
    amount: table.deposit,
    method,
    phone,
    description: `Table ${table.label}`,
    targetId: id,
  });
  if (!started.ok) return started;

  await db.update(reservations).set({ reference: started.reference }).where(eq(reservations.id, id));
  revalidatePath("/app/reservations");
  return { ok: true, reference: started.reference, instruction: started.instruction, deposit: table.deposit };
}

/** Annulation par le joueur. L'acompte reste acquis à la salle, comme annoncé. */
export async function cancelReservation(id: string) {
  const user = await requireUser();
  const booking = (await db.select().from(reservations).where(eq(reservations.id, id)).limit(1))[0];
  if (!booking || booking.userId !== user.id) return;
  if (!["pending", "confirmed"].includes(booking.status)) return;

  await db.update(reservations).set({ status: "cancelled" }).where(eq(reservations.id, id));
  if (booking.tableId) {
    await db.update(venueTables).set({ status: "free" }).where(eq(venueTables.id, booking.tableId));
  }
  revalidatePath("/app/reservations");
  revalidatePath("/gerant/salle");
}

/* ------------------------------------------------------- Venue OS · comptoir */

async function guardVenue(venueId: string) {
  const manager = await requireRole("manager", "admin");
  if (manager.role === "manager" && manager.venueId !== venueId) redirect("/gerant?refus=1");
  return manager;
}

/** Le client est arrivé : la table passe en service. */
export async function seatReservation(id: string) {
  const booking = (await db.select().from(reservations).where(eq(reservations.id, id)).limit(1))[0];
  if (!booking) return;
  await guardVenue(booking.venueId);

  await db
    .update(reservations)
    .set({ status: "seated", seatedAt: new Date() })
    .where(eq(reservations.id, id));

  const table = booking.tableId
    ? (await db.select().from(venueTables).where(eq(venueTables.id, booking.tableId)).limit(1))[0]
    : null;
  if (table) {
    await db.update(venueTables).set({ status: "occupied" }).where(eq(venueTables.id, table.id));
  }

  await notify(
    booking.userId,
    "Bonne partie",
    `${table ? `Table ${table.label}` : "Ta table"} est installée — l'acompte est déduit de ta note.`,
    "reservation",
    "/app/reservations",
  );

  const salle = (await db.select().from(venues).where(eq(venues.id, booking.venueId)).limit(1))[0];
  const { prevenirLesAmisQuIlJoue } = await import("@/lib/annonces");
  await prevenirLesAmisQuIlJoue(
    booking.userId,
    salle ? { name: salle.name, slug: salle.slug } : null,
    table ? `Il s'installe à la table ${table.label}.` : "Sa table vient d'être installée.",
  );

  revalidatePath("/gerant/salle");
  revalidatePath("/app/reservations");
}

/** Fin de partie : la table se libère. */
export async function closeReservation(id: string, outcome: "done" | "no_show" = "done") {
  const booking = (await db.select().from(reservations).where(eq(reservations.id, id)).limit(1))[0];
  if (!booking) return;
  await guardVenue(booking.venueId);

  await db
    .update(reservations)
    .set({ status: outcome, closedAt: new Date() })
    .where(eq(reservations.id, id));
  if (booking.tableId) {
    await db.update(venueTables).set({ status: "free" }).where(eq(venueTables.id, booking.tableId));
  }

  revalidatePath("/gerant/salle");
  revalidatePath("/gerant/service");
  revalidatePath("/app/reservations");
}

/** Ouverture, fermeture ou occupation directe d'une table depuis le comptoir. */
export async function setTableStatus(tableId: string, status: "free" | "occupied" | "closed") {
  const table = (await db.select().from(venueTables).where(eq(venueTables.id, tableId)).limit(1))[0];
  if (!table) return;
  await guardVenue(table.venueId);

  await db.update(venueTables).set({ status }).where(eq(venueTables.id, tableId));

  // `venues.free_tables` reste la valeur lue par l'app et l'accueil web.
  const free = await db
    .select({ n: sql<number>`count(*)` })
    .from(venueTables)
    .where(and(eq(venueTables.venueId, table.venueId), eq(venueTables.status, "free"), eq(venueTables.active, true)));
  await db
    .update(venues)
    .set({ freeTables: Number(free[0]?.n ?? 0) })
    .where(eq(venues.id, table.venueId));

  revalidatePath("/gerant/salle");
  revalidatePath("/app/salles");
}

/* ---------------------------------------------------------- Venue OS · admin */

export async function saveTable(formData: FormData) {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const values = {
    venueId: String(formData.get("venueId") ?? ""),
    label: String(formData.get("label") ?? "").trim(),
    kind: String(formData.get("kind") ?? "pool"),
    hourlyRate: Number(formData.get("hourlyRate") ?? 0),
    deposit: Number(formData.get("deposit") ?? 1000),
    seats: Number(formData.get("seats") ?? 4),
    sort: Number(formData.get("sort") ?? 0),
    active: formData.get("active") === "on",
  };
  if (!values.venueId || !values.label) return;

  if (id) await db.update(venueTables).set(values).where(eq(venueTables.id, id));
  else await db.insert(venueTables).values({ id: uid(), ...values });

  revalidatePath("/admin/tables");
  revalidatePath("/gerant/salle");
}

export async function deleteTable(formData: FormData) {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (id) await db.update(venueTables).set({ active: false }).where(eq(venueTables.id, id));
  revalidatePath("/admin/tables");
}

/* ------------------------------------------------------ Master Break Live */

const XP_MATCH_WIN = 120;
const XP_MATCH_PLAY = 30;

/**
 * Garde unique de la feuille de match : gérant ou arbitre de la salle, arbitre
 * habilité pour ce match ou son tournoi, joueur quand la salle ouvre
 * l'auto-arbitrage, direction partout. Voir `canScore` dans lib/live.ts.
 */
async function requireScorer(matchId: string): Promise<{ match: Match; by: User } | null> {
  const user = await requireUser();
  const match = (await db.select().from(matches).where(eq(matches.id, matchId)).limit(1))[0];
  if (!match) return null;

  const right = await canScore(user, match);
  if (!right.ok) return null;
  return { match, by: user };
}

/** Numéro d'ordre suivant dans la frise du match. */
async function nextSeq(matchId: string): Promise<number> {
  const row = (
    await db
      .select({ max: sql<number>`coalesce(max(${matchEvents.seq}), 0)` })
      .from(matchEvents)
      .where(eq(matchEvents.matchId, matchId))
  )[0];
  return Number(row?.max ?? 0) + 1;
}

export type MatchResult = { ok: true; id: string } | { ok: false; error: string };

/** Création d'une rencontre depuis la console du gérant. */
export async function createMatch(formData: FormData): Promise<MatchResult> {
  const manager = await requireRole("manager", "admin");
  const venueId = String(formData.get("venueId") ?? manager.venueId ?? "");
  if (!venueId) return { ok: false, error: "Aucune salle" };
  await guardVenue(venueId);

  const playerAId = String(formData.get("playerAId") ?? "");
  const playerBId = String(formData.get("playerBId") ?? "");
  if (!playerAId || !playerBId) return { ok: false, error: "Il faut deux joueurs" };
  if (playerAId === playerBId) return { ok: false, error: "Un joueur ne peut pas s'affronter lui-même" };

  // Une partie sèche est une course à une partie : le mode ne se stocke pas,
  // il se lit dans la cible. Une cible vide ne peut donc pas valoir zéro.
  const seche = String(formData.get("mode") ?? "") === "seche";
  const target = seche ? 1 : Math.min(21, Math.max(1, Number(formData.get("target") ?? 5)));
  const id = uid();

  await db.insert(matches).values({
    id,
    venueId,
    tableId: String(formData.get("tableId") ?? "") || null,
    kind: String(formData.get("kind") ?? "8-ball"),
    target,
    playerAId,
    playerBId,
    turnId: playerAId,
    label: String(formData.get("label") ?? "Amical").slice(0, 60) || "Amical",
    status: "scheduled",
    startsAt: new Date(),
    createdBy: manager.id,
  });

  revalidatePath("/gerant/live");
  revalidatePath("/app/live");
  return { ok: true, id };
}

/** Coup d'envoi. */
export async function startMatch(matchId: string) {
  const scorer = await requireScorer(matchId);
  if (!scorer || scorer.match.status !== "scheduled") return;
  const { match, by } = scorer;

  const now = new Date();
  await db
    .update(matches)
    .set({ status: "live", startedAt: now, updatedAt: now })
    .where(eq(matches.id, matchId));
  await db.insert(matchEvents).values({
    id: uid(),
    matchId,
    byId: by.id,
    kind: "start",
    seq: await nextSeq(matchId),
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    detail: "Coup d'envoi",
  });

  await prevenirLesAmis(match.playerAId, match.playerBId, matchId);

  revalidatePath("/gerant/live");
  revalidatePath("/app/live");
}

/**
 * Les amis des deux joueurs apprennent que la partie commence.
 *
 * C'est tout l'intérêt d'avoir une liste d'amis dans une application de
 * salle : savoir qu'un proche est à la table maintenant, pas le lendemain.
 * Un ami des deux n'est prévenu qu'une fois — deux notifications pour le même
 * match, c'est le genre de détail qui fait couper les notifications.
 */
async function prevenirLesAmis(aId: string, bId: string, matchId: string) {
  const { idsDesAmis } = await import("@/lib/joueurs");
  const [amisA, amisB, gens] = await Promise.all([
    idsDesAmis(aId),
    idsDesAmis(bId),
    db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, [aId, bId])),
  ]);

  const nom = (id: string) => gens.find((g) => g.id === id)?.name ?? "Un joueur";
  const aPrevenir = new Map<string, string>();
  for (const ami of amisA) if (ami !== bId) aPrevenir.set(ami, nom(aId));
  for (const ami of amisB) if (ami !== aId && !aPrevenir.has(ami)) aPrevenir.set(ami, nom(bId));

  for (const [qui, lequel] of aPrevenir) {
    await notify(
      qui,
      `${lequel} joue`,
      `${nom(aId)} contre ${nom(bId)} — la partie vient de commencer.`,
      "system",
      `/app/live/${matchId}`,
    );
  }
}

/**
 * Une manche marquée. C'est le geste central de la console : il met à jour le
 * score, pousse la frise et termine le match dès que la cible est atteinte.
 */
export async function scoreRack(matchId: string, playerId: string, delta: 1 | -1 = 1) {
  const scorer = await requireScorer(matchId);
  if (!scorer || scorer.match.status !== "live") return;
  const { match, by } = scorer;

  const isA = playerId === match.playerAId;
  if (!isA && playerId !== match.playerBId) return;

  const scoreA = Math.max(0, match.scoreA + (isA ? delta : 0));
  const scoreB = Math.max(0, match.scoreB + (isA ? 0 : delta));
  const now = new Date();
  const reached = scoreA >= match.target || scoreB >= match.target;

  await db
    .update(matches)
    .set({
      scoreA,
      scoreB,
      // La main passe à l'adversaire de celui qui vient de marquer.
      turnId: isA ? match.playerBId : match.playerAId,
      updatedAt: now,
    })
    .where(eq(matches.id, matchId));

  await db.insert(matchEvents).values({
    id: uid(),
    matchId,
    playerId,
    byId: by.id,
    kind: delta > 0 ? "rack" : "note",
    seq: await nextSeq(matchId),
    scoreA,
    scoreB,
    detail: delta > 0 ? "Partie remportée" : "Partie retirée",
  });

  if (reached && delta > 0) {
    await finishMatch(matchId, scoreA >= match.target ? match.playerAId : match.playerBId);
    return;
  }

  revalidatePath(`/app/live/${matchId}`);
  revalidatePath("/gerant/live");
  revalidatePath("/app/live");
}

/** Faute, casse gagnante, sécurité, empochage : la matière des statistiques. */
export async function logMatchEvent(matchId: string, playerId: string, kind: string, detail = "") {
  const scorer = await requireScorer(matchId);
  if (!scorer || scorer.match.status !== "live") return;
  const { match, by } = scorer;
  if (!["foul", "break", "safety", "pot", "note"].includes(kind)) return;
  if (playerId !== match.playerAId && playerId !== match.playerBId) return;

  await db.insert(matchEvents).values({
    id: uid(),
    matchId,
    playerId,
    byId: by.id,
    kind,
    seq: await nextSeq(matchId),
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    detail: detail.slice(0, 120),
  });

  // La main change sur une faute ou une sécurité.
  const passes = kind === "foul" || kind === "safety";
  await db
    .update(matches)
    .set({
      updatedAt: new Date(),
      ...(passes ? { turnId: playerId === match.playerAId ? match.playerBId : match.playerAId } : {}),
    })
    .where(eq(matches.id, matchId));

  revalidatePath(`/app/live/${matchId}`);
  revalidatePath("/gerant/live");
}

/** Fin de match : vainqueur, points Master et notifications aux deux joueurs. */
export async function finishMatch(matchId: string, winnerId?: string) {
  const scorer = await requireScorer(matchId);
  if (!scorer || scorer.match.status === "done") return;
  const { match, by } = scorer;

  const winner =
    winnerId ?? (match.scoreA === match.scoreB ? null : match.scoreA > match.scoreB ? match.playerAId : match.playerBId);
  const now = new Date();

  await db
    .update(matches)
    .set({ status: "done", winnerId: winner, endedAt: now, updatedAt: now, turnId: null })
    .where(eq(matches.id, matchId));

  await db.insert(matchEvents).values({
    id: uid(),
    matchId,
    byId: by.id,
    kind: "end",
    seq: await nextSeq(matchId),
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    detail: "Fin de match",
  });

  for (const playerId of [match.playerAId, match.playerBId]) {
    const won = playerId === winner;
    await db
      .update(users)
      .set({ points: sql`${users.points} + ${won ? XP_MATCH_WIN : XP_MATCH_PLAY}` })
      .where(eq(users.id, playerId));
    await notify(
      playerId,
      won ? "Match gagné" : "Match terminé",
      `${match.scoreA} – ${match.scoreB} · +${won ? XP_MATCH_WIN : XP_MATCH_PLAY} points Master`,
      "match",
      `/app/live/${matchId}`,
    );
  }

  revalidatePath(`/app/live/${matchId}`);
  revalidatePath("/gerant/live");
  revalidatePath("/app/live");
  revalidatePath("/app/rewards");
}

export async function cancelMatch(matchId: string) {
  const scorer = await requireScorer(matchId);
  if (!scorer || scorer.match.status === "done") return;
  const { match } = scorer;

  await db
    .update(matches)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(matches.id, match.id));

  revalidatePath("/gerant/live");
  revalidatePath("/app/live");
}

/* -------------------------------------------------- Arbitrage : qui marque */

/**
 * Habilite quelqu'un à tenir la feuille : sur un match précis, ou sur tout un
 * tournoi. Réservé au gérant de la salle et à la direction.
 */
export async function assignOfficial(matchId: string, userId: string, scope: "match" | "event" = "match") {
  const match = (await db.select().from(matches).where(eq(matches.id, matchId)).limit(1))[0];
  if (!match) return;
  await guardVenue(match.venueId);
  const by = await requireRole("manager", "admin");

  if (scope === "event" && !match.eventId) return;

  const already = (
    await db
      .select({ id: matchOfficials.id })
      .from(matchOfficials)
      .where(
        and(
          eq(matchOfficials.userId, userId),
          scope === "event" ? eq(matchOfficials.eventId, match.eventId!) : eq(matchOfficials.matchId, matchId),
        ),
      )
      .limit(1)
  )[0];
  if (already) return;

  await db.insert(matchOfficials).values({
    id: uid(),
    matchId: scope === "match" ? matchId : null,
    eventId: scope === "event" ? match.eventId : null,
    userId,
    role: "referee",
    createdBy: by.id,
  });

  await notify(
    userId,
    "Feuille de match confiée",
    scope === "event" ? "Tu arbitres ce tournoi." : "Tu arbitres cette rencontre.",
    "match",
    `/arbitre/${matchId}`,
  );

  revalidatePath(`/gerant/live`);
  revalidatePath(`/arbitre/${matchId}`);
}

export async function removeOfficial(officialId: string) {
  const row = (await db.select().from(matchOfficials).where(eq(matchOfficials.id, officialId)).limit(1))[0];
  if (!row) return;

  const match = row.matchId
    ? (await db.select().from(matches).where(eq(matches.id, row.matchId)).limit(1))[0]
    : (await db.select().from(matches).where(eq(matches.eventId, row.eventId!)).limit(1))[0];
  if (!match) return;

  await guardVenue(match.venueId);
  await db.delete(matchOfficials).where(eq(matchOfficials.id, officialId));
  revalidatePath("/gerant/live");
}

/**
 * Invitation d'arbitrage : un lien signé, valable deux heures, que le gérant
 * envoie à un bénévole. Le lien n'est pas une autorisation en soi — il inscrit
 * celui qui l'ouvre comme arbitre, ce qui laisse une trace révocable, au lieu
 * d'un droit anonyme qui circulerait de téléphone en téléphone.
 */
export async function createScoringInvite(matchId: string, scope: "match" | "event" = "match"): Promise<string> {
  const match = (await db.select().from(matches).where(eq(matches.id, matchId)).limit(1))[0];
  if (!match) return "";
  await guardVenue(match.venueId);

  return signPass(
    { k: "score", i: matchId, c: scope, u: match.venueId },
    INVITE_TTL,
  );
}

export type InviteCheck =
  | { ok: true; matchId: string; scope: "match" | "event"; a: string; b: string; venue: string; label: string }
  | { ok: false; error: string };

/**
 * Lecture seule : ce que vaut une invitation, sans rien inscrire. La page peut
 * donc l'appeler pendant son rendu — accepter reste un geste explicite.
 */
export async function inspectScoringInvite(token: string): Promise<InviteCheck> {
  const check = verifyPass(token);
  if (!check.ok) {
    return {
      ok: false,
      error: check.reason === "expired" ? "Cette invitation a expiré." : "Invitation invalide.",
    };
  }
  if (check.claims.k !== "score") return { ok: false, error: "Invitation invalide." };

  const card = await getMatch(check.claims.i);
  if (!card) return { ok: false, error: "Match introuvable." };
  if (card.match.status === "done") return { ok: false, error: "Ce match est déjà terminé." };

  return {
    ok: true,
    matchId: card.match.id,
    scope: check.claims.c === "event" && card.match.eventId ? "event" : "match",
    a: card.a.name,
    b: card.b.name,
    venue: card.venue.name,
    label: card.match.label,
  };
}

export type InviteResult = { ok: true; matchId: string } | { ok: false; error: string };

/**
 * Acceptation de l'invitation : c'est ici qu'on inscrit l'arbitre. Appelée
 * depuis un formulaire, jamais pendant un rendu — une mutation ne doit pas
 * partir d'un simple chargement de page, ne serait-ce que pour qu'un
 * préchargement de lien n'enrôle personne au passage.
 */
export async function acceptScoringInvite(token: string): Promise<InviteResult> {
  const user = await requireUser();
  const check = verifyPass(token);
  if (!check.ok) {
    return {
      ok: false,
      error: check.reason === "expired" ? "Cette invitation a expiré." : "Invitation invalide.",
    };
  }
  if (check.claims.k !== "score") return { ok: false, error: "Invitation invalide." };

  const matchId = check.claims.i;
  const match = (await db.select().from(matches).where(eq(matches.id, matchId)).limit(1))[0];
  if (!match) return { ok: false, error: "Match introuvable." };
  if (match.status === "done") return { ok: false, error: "Ce match est déjà terminé." };

  const scope = check.claims.c === "event" && match.eventId ? "event" : "match";
  const already = (
    await db
      .select({ id: matchOfficials.id })
      .from(matchOfficials)
      .where(
        and(
          eq(matchOfficials.userId, user.id),
          scope === "event" ? eq(matchOfficials.eventId, match.eventId!) : eq(matchOfficials.matchId, matchId),
        ),
      )
      .limit(1)
  )[0];

  if (!already) {
    await db.insert(matchOfficials).values({
      id: uid(),
      matchId: scope === "match" ? matchId : null,
      eventId: scope === "event" ? match.eventId : null,
      userId: user.id,
      role: "referee",
      createdBy: match.createdBy,
    });
  }

  revalidatePath("/arbitre");
  return { ok: true, matchId };
}

/** La salle ouvre ou ferme l'auto-arbitrage par les joueurs. */
export async function setSelfScoring(venueId: string, allowed: boolean) {
  await guardVenue(venueId);
  await db.update(venues).set({ selfScoring: allowed }).where(eq(venues.id, venueId));
  revalidatePath("/gerant/live");
}

/* --------------------------------------------- Master Break Live · la vidéo */

export type StreamCreated = { ok: true; id: string } | { ok: false; error: string };

/** Ouvre un direct : chemin public, clé d'ingestion, niveau et accès. */
export async function createStream(formData: FormData): Promise<StreamCreated> {
  // Filmer une table n'est plus réservé au comptoir : un joueur qui a atteint
  // « Cogneur » pose son téléphone sur un trépied et diffuse, contre une part
  // des billets vidéo. C'est le niveau qui ouvre la porte, pas le rôle.
  const auteur = await requireUser();
  const { peutDiffuser } = await import("@/lib/niveaux");
  const duComptoir = auteur.role === "manager" || auteur.role === "admin";
  if (!duComptoir && !peutDiffuser(auteur.points)) {
    return { ok: false, error: "La diffusion s'ouvre au niveau Cogneur." };
  }

  const manager = auteur;
  const venueId = String(formData.get("venueId") ?? manager.venueId ?? "");
  if (!venueId) return { ok: false, error: "Choisis la salle depuis laquelle tu filmes" };
  // Le gérant reste borné à sa salle ; un joueur filme là où il joue.
  if (duComptoir) await guardVenue(venueId);

  const venue = (await db.select().from(venues).where(eq(venues.id, venueId)).limit(1))[0];
  if (!venue) return { ok: false, error: "Salle introuvable" };

  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 3) return { ok: false, error: "Donne un titre au direct" };

  const level = String(formData.get("level") ?? "phone");
  const access = String(formData.get("access") ?? "free");
  const price = access === "ppv" ? Math.max(100, Number(formData.get("price") ?? 500)) : 0;
  if (access === "ppv" && !price) return { ok: false, error: "Prix du billet vidéo manquant" };

  const id = uid();
  await db.insert(streams).values({
    id,
    venueId,
    matchId: String(formData.get("matchId") ?? "") || null,
    title: title.slice(0, 120),
    level,
    access,
    price,
    path: newStreamPath(venue.slug),
    streamKey: newStreamKey(),
    status: "idle",
    createdBy: manager.id,
  });

  revalidatePath("/gerant/direct");
  revalidatePath("/direct");
  return { ok: true, id };
}

/** Régénère la clé : le geste qu'on fait quand une clé a fuité. */
export async function rotateStreamKey(streamId: string) {
  const stream = (await db.select().from(streams).where(eq(streams.id, streamId)).limit(1))[0];
  if (!stream) return;
  await guardVenue(stream.venueId);

  await db
    .update(streams)
    .set({ streamKey: newStreamKey(), updatedAt: new Date() })
    .where(eq(streams.id, streamId));
  revalidatePath("/gerant/direct");
}

/** Arrêt manuel, quand la source n'a pas prévenu. */
export async function endStream(streamId: string) {
  const stream = (await db.select().from(streams).where(eq(streams.id, streamId)).limit(1))[0];
  if (!stream) return;
  await guardVenue(stream.venueId);

  await db
    .update(streams)
    .set({ status: "ended", endedAt: new Date(), viewers: 0, updatedAt: new Date() })
    .where(eq(streams.id, streamId));
  revalidatePath("/gerant/direct");
  revalidatePath("/direct");
}

export async function deleteStream(streamId: string) {
  const stream = (await db.select().from(streams).where(eq(streams.id, streamId)).limit(1))[0];
  if (!stream) return;
  await guardVenue(stream.venueId);
  await db.delete(streams).where(eq(streams.id, streamId));
  revalidatePath("/gerant/direct");
}

export type WatchTicket =
  | { ok: true; hls: string; whep: string; access: string }
  | { ok: false; reason: "members" | "ppv" | "gone"; price: number };

/**
 * Billet de lecture. La page le redemande quand il approche de l'expiration :
 * c'est ce qui permet de couper un direct payant en cours de route.
 */
export async function requestWatchTicket(streamId: string): Promise<WatchTicket> {
  const user = await requireUser();
  const stream = (await db.select().from(streams).where(eq(streams.id, streamId)).limit(1))[0];
  if (!stream) return { ok: false, reason: "gone", price: 0 };

  const access = await canWatch(user, stream);
  if (!access.ok) return { ok: false, reason: access.reason, price: access.price };

  const ticket = watchTicket(stream.id, user.id);
  return { ok: true, hls: hlsUrl(stream, ticket), whep: whepUrl(stream, ticket), access: access.as };
}

export type VideoTicketResult =
  | { ok: true; reference: string; instruction?: string; amount: number }
  | { ok: false; error: string };

/** Achat d'un billet vidéo : même chemin de paiement que le reste. */
export async function buyStreamPass(
  streamId: string,
  phone: string,
  method: "om" | "momo" = "momo",
): Promise<VideoTicketResult> {
  const user = await requireUser();
  const stream = (await db.select().from(streams).where(eq(streams.id, streamId)).limit(1))[0];
  if (!stream) return { ok: false, error: "Direct introuvable" };
  if (stream.access !== "ppv") return { ok: false, error: "Ce direct n'est pas payant" };

  const existing = (
    await db
      .select()
      .from(streamPasses)
      .where(and(eq(streamPasses.streamId, streamId), eq(streamPasses.userId, user.id)))
      .limit(1)
  )[0];
  if (existing?.status === "paid") return { ok: false, error: "Tu as déjà ton billet" };

  // Ce que touchera celui qui filme, figé à l'achat : un direct repris ou
  // supprimé plus tard ne réécrit pas ce qu'on lui doit pour ce soir.
  const part = {
    hostId: stream.createdBy,
    commission: stream.createdBy ? Math.round(stream.price * COMMISSION_RATE) : stream.price,
  };

  const passId = existing?.id ?? uid();
  if (existing) {
    await db
      .update(streamPasses)
      .set({ status: "pending", amount: stream.price, ...part })
      .where(eq(streamPasses.id, passId));
  } else {
    await db.insert(streamPasses).values({
      id: passId,
      streamId,
      userId: user.id,
      amount: stream.price,
      ...part,
      status: "pending",
    });
  }

  const started = await startPayment({
    kind: "stream",
    userId: user.id,
    amount: stream.price,
    method,
    phone,
    description: "Direct Master Break",
    targetId: passId,
  });
  if (!started.ok) return started;

  await db.update(streamPasses).set({ reference: started.reference }).where(eq(streamPasses.id, passId));
  return { ok: true, reference: started.reference, instruction: started.instruction, amount: stream.price };
}

/* --------------------------------------------------------- écrans de salle */

/**
 * Le gérant adopte un écran.
 *
 * Le code vient d'un QR scanné ou d'une saisie à la main : `codeDepuisQr`
 * accepte les deux, y compris l'URL entière que porte le QR.
 */
export async function adoptScreen(_prev: unknown, formData: FormData) {
  const manager = await requireRole("manager", "admin");
  if (!manager.venueId) return { ok: false as const, error: "Aucune salle rattachée à ce compte." };

  const { adopterEcran, codeDepuisQr } = await import("@/lib/screens");
  const code = codeDepuisQr(str(formData, "code"));
  const nom = str(formData, "name");

  const adopte = await adopterEcran(code, manager.venueId, nom);
  if (!adopte.ok) return { ok: false as const, error: adopte.error };

  revalidatePath("/gerant/ecrans");
  return { ok: true as const, name: adopte.screen.name };
}

/** Ce qu'un écran doit montrer. `streamId` vide le met en veille. */
export async function setScreenStream(screenId: string, streamId: string | null) {
  const manager = await requireRole("manager", "admin");
  if (!manager.venueId) redirect("/gerant?refus=1");

  // La salle est vérifiée des deux côtés : on ne pilote pas l'écran d'autrui,
  // et on n'y envoie pas le direct d'une autre salle.
  if (streamId) {
    const stream = (await db.select().from(streams).where(eq(streams.id, streamId)).limit(1))[0];
    if (!stream || stream.venueId !== manager.venueId) redirect("/gerant/ecrans?refus=1");
  }

  await db
    .update(screens)
    .set({ streamId })
    .where(and(eq(screens.id, screenId), eq(screens.venueId, manager.venueId)));

  revalidatePath("/gerant/ecrans");
  return { ok: true as const };
}

export async function renameScreen(screenId: string, name: string) {
  const manager = await requireRole("manager", "admin");
  if (!manager.venueId) redirect("/gerant?refus=1");

  await db
    .update(screens)
    .set({ name: name.trim().slice(0, 40) || "Écran" })
    .where(and(eq(screens.id, screenId), eq(screens.venueId, manager.venueId)));

  revalidatePath("/gerant/ecrans");
  return { ok: true as const };
}

/**
 * Retirer un écran.
 *
 * On supprime la ligne plutôt que de la détacher : son jeton meurt avec elle,
 * et un téléviseur revendu ne revient pas dans la salle par surprise. Il
 * redemandera un code s'il est rebranché.
 */
export async function removeScreen(screenId: string) {
  const manager = await requireRole("manager", "admin");
  if (!manager.venueId) redirect("/gerant?refus=1");

  await db.delete(screens).where(and(eq(screens.id, screenId), eq(screens.venueId, manager.venueId)));
  revalidatePath("/gerant/ecrans");
  return { ok: true as const };
}

/* ------------------------------------------------------- cours de billard */

/**
 * S'inscrire à un cours.
 *
 * Le prix est figé sur l'inscription au moment où elle naît : un tarif révisé
 * en cours de trimestre ne doit pas réécrire ce qu'un élève déjà inscrit a
 * payé. Les places sont recomptées à la confirmation du paiement, pas ici —
 * le cours peut se remplir pendant que l'élève valide sur son téléphone.
 */
export async function startEnrollment(
  courseId: string,
  method: "om" | "momo",
  phone: string,
): Promise<StartResult> {
  const user = await requireUser();
  const cours = (await db.select().from(courses).where(eq(courses.id, courseId)).limit(1))[0];
  if (!cours || !cours.active) return { ok: false, error: "Ce cours n'est plus proposé." };

  const deja = (
    await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.courseId, courseId), eq(enrollments.userId, user.id), eq(enrollments.status, "paid")))
      .limit(1)
  )[0];
  if (deja) return { ok: false, error: "Tu es déjà inscrit à ce cours." };

  const pris = (
    await db
      .select({ n: sql<number>`count(*)` })
      .from(enrollments)
      .where(and(eq(enrollments.courseId, courseId), eq(enrollments.status, "paid")))
  )[0];
  if (Number(pris?.n ?? 0) >= cours.capacity) return { ok: false, error: "Ce cours est complet." };

  const id = uid();
  await db.insert(enrollments).values({
    id,
    courseId,
    userId: user.id,
    price: cours.price,
    // Qui sera payé, et ce que la maison prend : figés ici, avec le prix. Un
    // cours repris par un autre coach ne réécrit pas les inscriptions d'hier.
    coachId: cours.coachId,
    commission: cours.coachId ? Math.round(cours.price * COMMISSION_RATE) : cours.price,
    status: "pending",
  });

  const started = await startPayment({
    kind: "course",
    userId: user.id,
    amount: cours.price,
    method,
    phone,
    description: `Cours ${cours.title}`,
    targetId: id,
  });
  if (!started.ok) return started;

  await db.update(enrollments).set({ reference: started.reference }).where(eq(enrollments.id, id));
  revalidatePath("/app/cours");
  return { ok: true, reference: started.reference, instruction: started.instruction, amount: cours.price };
}

/**
 * Créer ou modifier un cours.
 *
 * Enseigner n'est pas un rôle qu'on attribue, c'est un niveau qu'on atteint :
 * un joueur classé « Requin de table » sait tenir une table et peut la
 * montrer. S'y ajoutent ceux qui tiennent déjà une salle ou un catalogue, et
 * l'administration. Le cours appartient à son auteur — c'est lui qu'on paie et
 * lui qu'on prévient quand un élève s'inscrit.
 */
/**
 * Retirer un cours de l'affiche.
 *
 * On le masque plutôt que de l'effacer : des inscriptions payées y renvoient,
 * et une séance sans cours est une ligne qu'on ne sait plus expliquer.
 */
/**
 * Rappeler un cours aux joueurs.
 *
 * Un cours reste ouvert des semaines, et personne ne fouille le catalogue : le
 * prof peut le remettre sous les yeux de tout le monde. Une fois par semaine
 * au plus — une réclame quotidienne ferait couper les notifications, et c'est
 * la dernière chose qu'on veuille.
 */
const ENTRE_DEUX_ANNONCES = 7 * 24 * 60 * 60 * 1000;

export async function annoncerLeCours(
  formData: FormData,
): Promise<{ ok: true; joueurs: number } | { ok: false; error: string }> {
  // Une notification qui part à tout le monde est la ressource la plus fragile
  // de l'application : trois de trop et les gens les coupent, pour toujours.
  // Elle reste donc entre les mains de l'administration, quelle que soit
  // l'activité annoncée — un prof demande, l'administration décide.
  const auteur = await requireRole("admin");
  const cours = (await db.select().from(courses).where(eq(courses.id, str(formData, "id"))).limit(1))[0];
  if (!cours) return { ok: false, error: "Cours introuvable." };
  if (!cours.active) return { ok: false, error: "Publie le cours avant de l'annoncer." };

  const mot = str(formData, "message").slice(0, 180);
  const { annoncerATous } = await import("@/lib/annonces");
  const joueurs = await annoncerATous({
    titre: `Cours · ${cours.title}`,
    corps:
      mot ||
      [
        cours.coachName ? `Avec ${cours.coachName}.` : null,
        cours.schedule,
        cours.price > 0 ? `${cours.price.toLocaleString("fr-FR")} F` : "Gratuit",
        "Il reste des places.",
      ]
        .filter(Boolean)
        .join(" · "),
    kind: "event",
    href: `/app/cours/${cours.slug}`,
    sauf: auteur.id,
    repeterApres: ENTRE_DEUX_ANNONCES,
  });

  if (joueurs === 0) {
    return { ok: false, error: "Ce cours a déjà été annoncé cette semaine. Laisse-le reposer." };
  }

  revalidatePath("/app/prof");
  return { ok: true, joueurs };
}

export async function deleteCourse(formData: FormData) {
  const auteur = await requireUser();
  const id = str(formData, "id");
  const cours = (await db.select().from(courses).where(eq(courses.id, id)).limit(1))[0];
  if (!cours) return;
  if (auteur.role !== "admin" && cours.coachId !== auteur.id) redirect("/app/prof?refus=1");

  await db.update(courses).set({ active: false }).where(eq(courses.id, id));
  revalidatePath("/app/prof");
  revalidatePath("/admin/cours");
  revalidatePath("/app/cours");
  revalidatePath("/app/shop");
}

export async function saveCourse(formData: FormData) {
  const auteur = await requireUser();
  const { peutEnseigner } = await import("@/lib/niveaux");
  const habilite =
    auteur.role === "admin" ||
    auteur.role === "manager" ||
    auteur.role === "seller" ||
    peutEnseigner(auteur.points);
  if (!habilite) redirect("/app/prof?refus=1");

  const id = str(formData, "id");

  if (auteur.role !== "admin" && id) {
    const actuel = (await db.select().from(courses).where(eq(courses.id, id)).limit(1))[0];
    if (!actuel || actuel.coachId !== auteur.id) redirect("/app/prof?refus=1");
  }

  const sessions = Math.max(1, num(formData, "sessions"));
  const titre = str(formData, "title");
  const slug =
    str(formData, "slug") ||
    (await slugLibre(
      titre,
      async (essai) =>
        ((await db
          .select({ id: courses.id })
          .from(courses)
          .where(and(eq(courses.slug, essai), id ? ne(courses.id, id) : undefined))
          .limit(1))[0]?.id ?? null) !== null,
      "cours",
    ));

  const values = {
    slug,
    title: titre,
    coachName: str(formData, "coachName") || auteur.name,
    venueId: str(formData, "venueId") || null,
    level: str(formData, "level") || "debutant",
    format: str(formData, "format") || "forfait",
    sessions,
    schedule: str(formData, "schedule"),
    price: num(formData, "price"),
    image: str(formData, "image") || "/img/coach-1.jpg",
    description: str(formData, "description"),
    capacity: Math.max(1, num(formData, "capacity")),
    featured: bool(formData, "featured"),
    active: bool(formData, "active"),
  };

  // Le coach ne se choisit pas dans un formulaire, comme le vendeur d'un
  // article : à la création c'est l'auteur, à la modification on n'y touche pas.
  if (id) await db.update(courses).set(values).where(eq(courses.id, id));
  else {
    const recent = (
      await db.select().from(courses).where(eq(courses.title, values.title)).orderBy(desc(courses.createdAt)).limit(1)
    )[0];
    if (!dejaCree(recent?.createdAt)) {
      await db.insert(courses).values({
        id: uid(),
        ...values,
        // L'administration peut publier au nom d'un intervenant de passage ;
        // tout le reste du monde enseigne en son propre nom.
        coachId: auteur.role === "admin" ? null : auteur.id,
        coachName: values.coachName || (auteur.role === "admin" ? "" : auteur.name),
      });
    }
  }

  revalidatePath("/app/cours");
  revalidatePath("/app/shop");
  revalidatePath("/admin/cours");
  // L'espace du prof, où le cours vient d'apparaître : sans cette ligne, il
  // publiait et ne voyait rien changer.
  revalidatePath("/app/prof");
}

/* --------------------------------------------------------------- tournois */

/**
 * Créer ou modifier un tournoi. Réservé à l'administration et aux gérants.
 *
 * Un tournoi vit en double : le tableau des joueurs d'un côté, un événement
 * jumeau de l'autre. C'est l'événement que le public achète — la billetterie,
 * le scan à l'entrée et la recette existent déjà pour lui, et les refaire pour
 * les tournois aurait fait deux caisses au lieu d'une.
 */
export async function saveTournament(formData: FormData) {
  const auteur = await requireRole("admin", "manager");
  const id = str(formData, "id");
  const venueId = str(formData, "venueId") || auteur.venueId || "";
  if (auteur.role === "manager") {
    if (!auteur.venueId) redirect("/gerant?refus=1");
    if (venueId !== auteur.venueId) redirect("/gerant?refus=1");
    if (id) {
      const actuel = (await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1))[0];
      if (!actuel || actuel.venueId !== auteur.venueId) redirect("/gerant?refus=1");
    }
  }

  const title = str(formData, "title");
  const slug = str(formData, "slug") || slugify(title);
  const startsAt = date(formData, "startsAt");
  const closesAt = date(formData, "closesAt");
  const image = str(formData, "image") || "/img/table-rack.jpg";
  const cagnottes = lireCagnottes(formData);

  const values = {
    slug,
    title,
    venueId: venueId || null,
    discipline: str(formData, "discipline") || "8-ball",
    format: str(formData, "format") === "poules" ? "poules" : "direct",
    groupSize: Math.min(8, Math.max(3, num(formData, "groupSize") || 4)),
    qualifiers: Math.max(1, num(formData, "qualifiers") || 2),
    // Toute taille : le moteur complète à la puissance de 2 par des exemptions.
    size: Math.min(TAILLE_MAX, Math.max(2, num(formData, "size") || 16)),
    category: CATEGORIES[str(formData, "category")] ? str(formData, "category") : "open",
    // Sèche = une partie gagnante. Le tournoi entier suit la même règle, du
    // premier tour à la finale : on ne rallonge pas une sèche en demi-finale.
    // Une « course à 1 partie » saisie à la main est une sèche, et se range
    // d'elle-même du bon côté — le mode se lit dans la cible, nulle part ailleurs.
    raceTo: str(formData, "mode") === "seche" ? 1 : Math.max(1, num(formData, "raceTo") || 4),
    minLevel: Math.min(5, Math.max(0, num(formData, "minLevel"))),
    entryFee: Math.max(0, num(formData, "entryFee")),
    // Des cagnottes remplies : la dotation est leur somme, pas un second
    // chiffre à tenir d'accord à la main.
    prizePool: totalCagnottes(cagnottes) || Math.max(0, num(formData, "prizePool")),
    prizeSplit: str(formData, "prizeSplit"),
    cagnottes,
    presentation: str(formData, "presentation"),
    rules: str(formData, "rules"),
    image,
    startsAt,
    closesAt,
  };

  // Un second envoi du même formulaire tomberait ici avec le même titre : on
  // reprend le tournoi qui vient d'être créé plutôt que d'en ouvrir un jumeau,
  // qui traînerait ensuite dans la liste avec sa propre billetterie.
  const recent = !id
    ? (
        await db
          .select()
          .from(tournaments)
          .where(eq(tournaments.title, title))
          .orderBy(desc(tournaments.createdAt))
          .limit(1)
      )[0]
    : undefined;
  const repris = dejaCree(recent?.createdAt) ? recent : undefined;

  // Un tableau ajouté à un événement (« Dames » à côté de l'« Open ») : il
  // partage l'affiche et la billetterie du tableau principal.
  const parentId = str(formData, "parentId");
  const parent = !id && parentId
    ? (await db.select().from(tournaments).where(eq(tournaments.id, parentId)).limit(1))[0]
    : undefined;
  if (parent && auteur.role === "manager" && parent.venueId !== auteur.venueId) redirect("/gerant?refus=1");

  const tournoiId = id || repris?.id || uid();
  if (id) await db.update(tournaments).set(values).where(eq(tournaments.id, id));
  else if (!repris) {
    await db.insert(tournaments).values({
      ...values,
      // Deux tableaux ne peuvent pas porter le même lien.
      slug: parent ? `${slug}-${values.category}` : slug,
      id: tournoiId,
      organiserId: auteur.id,
      status: "brouillon",
      ...(parent ? { parentId: parent.id, eventId: parent.eventId, venueId: parent.venueId } : {}),
    });
  }

  await syncTwinEvent(tournoiId, formData);

  revalidatePath("/app/tournois");
  revalidatePath(`/app/tournois/${slug}`);
  revalidatePath("/admin/tournois");
  revalidatePath("/gerant/tournois");
  revalidatePath("/app/events");
}

/** Le jumeau côté public : c'est par lui que les spectateurs entrent. */
async function syncTwinEvent(tournamentId: string, formData: FormData) {
  const t = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1))[0];
  if (!t) return;
  // Un tableau ajouté vit sous l'affiche du principal : c'est lui qui la tient.
  if (t.parentId) {
    const principal = (await db.select().from(tournaments).where(eq(tournaments.id, t.parentId)).limit(1))[0];
    if (principal) await resumerTableaux(principal.id);
    return;
  }
  const jumeau = t.eventId
    ? (await db.select().from(events).where(eq(events.id, t.eventId)).limit(1))[0]
    : null;

  const prix = Math.max(0, num(formData, "ticketPrice"));
  const places = Math.max(1, num(formData, "ticketCapacity") || 100);
  const jour = t.startsAt
    ? t.startsAt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    : "Date à confirmer";
  const heures = str(formData, "hours");

  const commun = {
    title: t.title,
    subtitle: `Tournoi ${DISCIPLINES_LABELS[t.discipline] ?? t.discipline} · ${t.size} joueurs`,
    day: jour,
    hours: heures,
    venueId: t.venueId,
    price: prix,
    image: t.image,
    capacity: places,
    // Le texte de présentation s'il y en a un : le règlement entier n'est
    // pas ce qu'on a envie de lire sur une affiche.
    description: t.presentation || t.rules,
    tags: "tournoi",
    // Le public ne doit voir la billetterie qu'une fois le tournoi annoncé :
    // un brouillon ne se vend pas.
    active: t.status !== "brouillon" && t.status !== "annule",
    // Un tournoi fini ou annulé referme sa soirée ; le rouvrir la rouvre.
    endedAt: t.status === "termine" || t.status === "annule" ? (jumeau?.endedAt ?? new Date()) : null,
  };

  if (t.eventId) {
    await db.update(events).set(commun).where(eq(events.id, t.eventId));
    await resumerTableaux(t.id);
    return;
  }

  const eventId = uid();
  await db.insert(events).values({ ...commun, id: eventId, slug: `${t.slug}-spectateurs` });
  await db.update(tournaments).set({ eventId }).where(eq(tournaments.id, tournamentId));
}

/**
 * L'affiche d'un événement à plusieurs tableaux dit ce qu'il contient :
 * « Tournoi 8-ball · Open 64 · Dames 24 ». Sans ça, le public ne voyait que
 * la taille du premier tableau.
 */
async function resumerTableaux(principalId: string) {
  const principal = (await db.select().from(tournaments).where(eq(tournaments.id, principalId)).limit(1))[0];
  if (!principal?.eventId) return;
  const ajoutes = await db.select().from(tournaments).where(eq(tournaments.parentId, principalId));
  const tous = [principal, ...ajoutes.filter((x) => x.status !== "annule")];
  const discipline = DISCIPLINES_LABELS[principal.discipline] ?? principal.discipline;
  const subtitle =
    tous.length > 1
      ? `Tournoi ${discipline} · ${tous.map((x) => `${CATEGORIES[x.category] ?? x.category} ${x.size}`).join(" · ")}`
      : `Tournoi ${discipline} · ${principal.size} joueurs`;
  await db.update(events).set({ subtitle }).where(eq(events.id, principal.eventId));
}

/** Ouvrir les candidatures, les clore, annuler. */
export async function setTournamentStatus(id: string, status: string) {
  const auteur = await requireRole("admin", "manager");
  const t = (await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1))[0];
  if (!t) return { ok: false as const, error: "Tournoi introuvable." };
  if (auteur.role === "manager" && t.venueId !== auteur.venueId) redirect("/gerant?refus=1");

  const permis = ["brouillon", "inscriptions", "complet", "annule"];
  if (!permis.includes(status)) return { ok: false as const, error: "État impossible depuis ici." };
  if (t.status === "encours" || t.status === "termine") {
    return { ok: false as const, error: "Le tableau est lancé : on ne revient plus aux inscriptions." };
  }

  await db.update(tournaments).set({ status }).where(eq(tournaments.id, id));

  // La billetterie spectateurs suit l'état du tournoi — et un tournoi annulé
  // referme sa soirée au lieu de la laisser « en cours » indéfiniment. Un
  // tableau ajouté n'y touche pas : l'affiche appartient au principal.
  if (t.parentId) {
    await resumerTableaux(t.parentId);
  } else if (t.eventId) {
    await db
      .update(events)
      .set({
        active: status !== "brouillon" && status !== "annule",
        endedAt: status === "annule" ? new Date() : null,
      })
      .where(eq(events.id, t.eventId));
  }

  // Les candidatures ouvertes, le tournoi existe pour les joueurs : c'est le
  // moment de le leur dire, et le seul. Les états suivants — complet, en
  // cours — ne sont plus une nouvelle pour qui n'a pas postulé.
  if (status === "inscriptions") {
    const { annoncerATous } = await import("@/lib/annonces");
    const { DISCIPLINES: noms } = await import("@/lib/tournois");
    const { nomDuJeu } = await import("@/lib/regles");
    await annoncerATous({
      titre: `Tournoi · ${t.title}`,
      corps: [
        noms[t.discipline] ?? t.discipline,
        nomDuJeu(t.raceTo),
        t.prizePool > 0 ? `${t.prizePool.toLocaleString("fr-FR")} F de dotation` : null,
        "Candidatures ouvertes.",
      ]
        .filter(Boolean)
        .join(" · "),
      kind: "event",
      href: `/app/tournois/${t.slug}`,
      sauf: auteur.id,
    });
  }

  revalidatePath("/app/tournois");
  revalidatePath(`/app/tournois/${t.slug}`);
  revalidatePath("/admin/tournois");
  revalidatePath("/gerant/tournois");
  revalidatePath("/app/events");
  return { ok: true as const };
}

export type CandidatureState = { error: string; ok?: false } | { ok: true; error?: never } | null;

/**
 * Le formulaire du candidat.
 *
 * Un spectateur achète un billet ; un joueur, lui, se présente : surnom porté
 * au tableau, niveau annoncé, numéro auquel on le joint le soir du tirage.
 * La candidature n'est pas une inscription — l'organisateur accepte ou refuse.
 */
export async function postuler(_prev: CandidatureState, formData: FormData): Promise<CandidatureState> {
  const user = await requireUser();
  const tournamentId = str(formData, "tournamentId");
  const t = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1))[0];
  if (!t) return { error: "Tournoi introuvable." };
  if (t.status !== "inscriptions") return { error: "Les candidatures ne sont pas ouvertes." };

  // Le niveau se vérifie ici, pas seulement dans le formulaire : un bouton
  // grisé n'a jamais empêché personne d'envoyer la requête à la main.
  if (t.minLevel > 0) {
    const { ilManque, niveauDe, nomDuNiveau } = await import("@/lib/niveaux");
    if (niveauDe(user.points) < t.minLevel) {
      return {
        error: `Ce tournoi est réservé aux ${nomDuNiveau(t.minLevel)}s et plus. Il te manque ${ilManque(user.points, t.minLevel)} points — chaque jeton scanné en rapporte.`,
      };
    }
  }

  const deja = (
    await db
      .select({ id: tournamentPlayers.id, status: tournamentPlayers.status })
      .from(tournamentPlayers)
      .where(and(eq(tournamentPlayers.tournamentId, tournamentId), eq(tournamentPlayers.userId, user.id)))
      .limit(1)
  )[0];
  if (deja && deja.status !== "retire") return { error: "Ta candidature est déjà déposée." };

  const nickname = str(formData, "nickname").slice(0, 40);
  // Le champ est prérempli au format lisible — « 6 77 45 12 08 ». On le remet
  // en chiffres AVANT de le valider, sinon le formulaire refuse son propre
  // contenu par défaut.
  const phone = normalizePhone(str(formData, "phone") || user.phone);
  if (!isValidPhone(phone)) return { error: "Numéro invalide : 9 chiffres, commençant par 6." };

  const level = str(formData, "level") || "intermediaire";
  const note = str(formData, "note").slice(0, 400);

  // Le droit d'inscription est figé ici : une dotation revue plus tard ne
  // rattrape pas ceux qui se sont engagés au tarif annoncé.
  const champs = {
    nickname: nickname || user.name,
    phone,
    level,
    note,
    fee: t.entryFee,
    status: "candidat",
    payment: "impaye",
  };

  if (deja) await db.update(tournamentPlayers).set(champs).where(eq(tournamentPlayers.id, deja.id));
  else {
    await db.insert(tournamentPlayers).values({ ...champs, id: uid(), tournamentId, userId: user.id });
  }

  if (t.organiserId) {
    await notify(
      t.organiserId,
      `Candidature · ${t.title}`,
      `${champs.nickname} se présente au tableau.`,
      "event",
      "/gerant/tournois",
    );
  }

  revalidatePath(`/app/tournois/${t.slug}`);
  revalidatePath("/gerant/tournois");
  revalidatePath("/admin/tournois");
  return { ok: true };
}

/** Le joueur se retire — tant que le tableau n'est pas tiré. */
export async function retirerCandidature(tournamentId: string) {
  const user = await requireUser();
  const t = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1))[0];
  if (!t) return { ok: false as const, error: "Tournoi introuvable." };
  if (t.status === "encours" || t.status === "termine") {
    return { ok: false as const, error: "Le tableau est tiré : on ne se retire plus." };
  }

  await db
    .update(tournamentPlayers)
    .set({ status: "retire" })
    .where(and(eq(tournamentPlayers.tournamentId, tournamentId), eq(tournamentPlayers.userId, user.id)));

  revalidatePath(`/app/tournois/${t.slug}`);
  revalidatePath("/gerant/tournois");
  return { ok: true as const };
}

/** L'organisateur retient ou écarte un candidat. */
export async function deciderCandidat(playerId: string, decision: "accepte" | "refuse") {
  const auteur = await requireRole("admin", "manager");
  const ligne = (
    await db.select().from(tournamentPlayers).where(eq(tournamentPlayers.id, playerId)).limit(1)
  )[0];
  if (!ligne) return { ok: false as const, error: "Candidature introuvable." };

  const t = (await db.select().from(tournaments).where(eq(tournaments.id, ligne.tournamentId)).limit(1))[0];
  if (!t) return { ok: false as const, error: "Tournoi introuvable." };
  if (auteur.role === "manager" && t.venueId !== auteur.venueId) redirect("/gerant?refus=1");
  if (t.status === "encours" || t.status === "termine") {
    return { ok: false as const, error: "Le tableau est tiré : la liste est close." };
  }

  await db.update(tournamentPlayers).set({ status: decision }).where(eq(tournamentPlayers.id, playerId));

  await notify(
    ligne.userId,
    decision === "accepte" ? `Retenu · ${t.title}` : `Non retenu · ${t.title}`,
    decision === "accepte"
      ? t.entryFee > 0
        ? `Règle ton droit d'inscription de ${t.entryFee.toLocaleString("fr-FR")} F pour prendre ta place au tableau.`
        : "Ta place au tableau est retenue."
      : "Le tableau est complet pour cette édition. Retente à la prochaine.",
    "event",
    `/app/tournois/${t.slug}`,
  );

  revalidatePath(`/app/tournois/${t.slug}`);
  revalidatePath("/gerant/tournois");
  revalidatePath("/admin/tournois");
  return { ok: true as const };
}

/** Le droit d'inscription, par le même chemin de paiement que le reste. */
export async function payerInscription(
  tournamentId: string,
  method: "om" | "momo",
  phone: string,
): Promise<StartResult> {
  const user = await requireUser();
  const t = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1))[0];
  if (!t) return { ok: false, error: "Tournoi introuvable." };

  const ligne = (
    await db
      .select()
      .from(tournamentPlayers)
      .where(and(eq(tournamentPlayers.tournamentId, tournamentId), eq(tournamentPlayers.userId, user.id)))
      .limit(1)
  )[0];
  if (!ligne) return { ok: false, error: "Dépose d'abord ta candidature." };
  if (ligne.status !== "accepte") return { ok: false, error: "L'organisateur n'a pas encore retenu ta candidature." };
  if (ligne.payment === "paye") return { ok: false, error: "Ton inscription est déjà réglée." };
  if (ligne.fee <= 0) return { ok: false, error: "Ce tournoi est gratuit pour les joueurs." };

  const started = await startPayment({
    kind: "tournoi",
    userId: user.id,
    amount: ligne.fee,
    method,
    phone,
    description: `Tournoi ${t.title}`,
    targetId: ligne.id,
  });
  if (!started.ok) return started;

  await db
    .update(tournamentPlayers)
    .set({ reference: started.reference })
    .where(eq(tournamentPlayers.id, ligne.id));
  revalidatePath(`/app/tournois/${t.slug}`);
  return { ok: true, reference: started.reference, instruction: started.instruction, amount: ligne.fee };
}

/**
 * Le joueur retenu choisit de régler son droit au guichet, en espèces, le
 * jour du tournoi. L'organisateur le voit « à encaisser » dans sa console.
 */
export async function payerAuGuichet(tournamentId: string) {
  const user = await requireUser();
  const t = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1))[0];
  if (!t) return { ok: false as const, error: "Tournoi introuvable." };
  const ligne = (
    await db
      .select()
      .from(tournamentPlayers)
      .where(and(eq(tournamentPlayers.tournamentId, tournamentId), eq(tournamentPlayers.userId, user.id)))
      .limit(1)
  )[0];
  if (!ligne || ligne.status !== "accepte") return { ok: false as const, error: "Ta candidature n'est pas encore retenue." };
  if (ligne.payment === "paye") return { ok: false as const, error: "Ton inscription est déjà réglée." };
  if (ligne.fee <= 0) return { ok: false as const, error: "Ce tournoi est gratuit pour les joueurs." };

  await db.update(tournamentPlayers).set({ payment: "guichet" }).where(eq(tournamentPlayers.id, ligne.id));
  if (t.organiserId) {
    await notify(
      t.organiserId,
      `Au guichet · ${t.title}`,
      `${ligne.nickname} réglera ${ligne.fee.toLocaleString("fr-FR")} F sur place.`,
      "event",
      "/gerant/tournois",
    );
  }
  revalidatePath(`/app/tournois/${t.slug}`);
  revalidatePath("/gerant/tournois");
  revalidatePath("/admin/tournois");
  return { ok: true as const };
}

/**
 * L'organisateur a reçu le droit en espèces. La référence « guichet: » garde
 * cette somme hors de la recette en ligne : elle est déjà dans sa caisse.
 */
export async function encaisserAuGuichet(playerId: string) {
  const auteur = await requireRole("admin", "manager");
  const ligne = (await db.select().from(tournamentPlayers).where(eq(tournamentPlayers.id, playerId)).limit(1))[0];
  if (!ligne) return { ok: false as const, error: "Joueur introuvable." };
  const t = (await db.select().from(tournaments).where(eq(tournaments.id, ligne.tournamentId)).limit(1))[0];
  if (!t) return { ok: false as const, error: "Tournoi introuvable." };
  if (auteur.role === "manager" && t.venueId !== auteur.venueId) redirect("/gerant?refus=1");
  if (ligne.payment === "paye") return { ok: false as const, error: "Déjà réglé." };

  await db
    .update(tournamentPlayers)
    .set({ payment: "paye", reference: `guichet:${ligne.id}` })
    .where(eq(tournamentPlayers.id, ligne.id));
  await notify(
    ligne.userId,
    `Inscription réglée · ${t.title}`,
    `${ligne.fee.toLocaleString("fr-FR")} F reçus au guichet. Ta place au tableau est confirmée.`,
    "event",
    `/app/tournois/${t.slug}`,
  );
  revalidatePath(`/app/tournois/${t.slug}`);
  revalidatePath("/gerant/tournois");
  revalidatePath("/admin/tournois");
  return { ok: true as const };
}

/** Le tirage : les candidatures deviennent un tableau. */
export async function lancerTableau(tournamentId: string) {
  const auteur = await requireRole("admin", "manager");
  const t = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1))[0];
  if (!t) return { ok: false as const, error: "Tournoi introuvable." };
  if (auteur.role === "manager" && t.venueId !== auteur.venueId) redirect("/gerant?refus=1");

  const { tirerLeTableau, tirerLesPoules } = await import("@/lib/tournaments");
  const res =
    t.format === "poules" ? await tirerLesPoules(tournamentId) : await tirerLeTableau(tournamentId);
  if (!res.ok) return res;

  const joueurs = await db
    .select()
    .from(tournamentPlayers)
    .where(and(eq(tournamentPlayers.tournamentId, tournamentId), eq(tournamentPlayers.status, "accepte")));

  for (const j of joueurs) {
    if (j.seed === null) continue;
    const place =
      t.format === "poules" && j.groupe
        ? `Tu es dans la poule ${String.fromCharCode(64 + j.groupe)}, tête de série n°${j.seed}.`
        : `Tu entres en tête de série n°${j.seed}.`;
    await notify(j.userId, `Tirage · ${t.title}`, `${place} Le programme est en ligne.`, "event", `/app/tournois/${t.slug}`);
  }

  revalidatePath(`/app/tournois/${t.slug}`);
  revalidatePath("/gerant/tournois");
  revalidatePath("/admin/tournois");
  return res;
}


/** Les poules jouées, on ouvre le tableau entre les qualifiés. */
export async function ouvrirLeTableauFinal(tournamentId: string) {
  const auteur = await requireRole("admin", "manager");
  const t = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1))[0];
  if (!t) return { ok: false as const, error: "Tournoi introuvable." };
  if (auteur.role === "manager" && t.venueId !== auteur.venueId) redirect("/gerant?refus=1");

  const { ouvrirLeTableau } = await import("@/lib/tournaments");
  const res = await ouvrirLeTableau(tournamentId);
  if (!res.ok) return res;

  const qualifies = await db
    .select()
    .from(tournamentMatches)
    .where(and(eq(tournamentMatches.tournamentId, tournamentId), eq(tournamentMatches.stage, "tableau")));

  const ids = [...new Set(qualifies.flatMap((d) => [d.playerAId, d.playerBId]).filter(Boolean))] as string[];
  if (ids.length) {
    const joueurs = await db.select().from(tournamentPlayers).where(inArray(tournamentPlayers.id, ids));
    for (const j of joueurs) {
      await notify(
        j.userId,
        `Qualifié · ${t.title}`,
        "Tu sors de ta poule. Le tableau final est en ligne.",
        "reward",
        `/app/tournois/${t.slug}`,
      );
    }
  }

  revalidatePath(`/app/tournois/${t.slug}`);
  revalidatePath("/gerant/tournois");
  revalidatePath("/admin/tournois");
  return res;
}

/** Le résultat d'un duel, saisi par l'organisateur. */
export async function noterDuel(duelId: string, scoreA: number, scoreB: number) {
  const auteur = await requireRole("admin", "manager");
  const duel = (
    await db.select().from(tournamentMatches).where(eq(tournamentMatches.id, duelId)).limit(1)
  )[0];
  if (!duel) return { ok: false as const, error: "Duel introuvable." };

  const t = (await db.select().from(tournaments).where(eq(tournaments.id, duel.tournamentId)).limit(1))[0];
  if (!t) return { ok: false as const, error: "Tournoi introuvable." };
  if (auteur.role === "manager" && t.venueId !== auteur.venueId) redirect("/gerant?refus=1");

  const { noterResultat, getTournamentById } = await import("@/lib/tournaments");
  const res = await noterResultat(duelId, scoreA, scoreB);
  if (!res.ok) return res;

  // Le tournoi a pu se refermer sur ce résultat : on prévient le champion.
  const apres = await getTournamentById(duel.tournamentId);
  if (apres?.status === "termine" && apres.winnerId) {
    await notify(
      apres.winnerId,
      `Titre · ${apres.title}`,
      "Tu remportes le tournoi. Les points de classement sont crédités.",
      "reward",
      `/app/tournois/${apres.slug}`,
    );
  }

  revalidatePath(`/app/tournois/${t.slug}`);
  revalidatePath("/gerant/tournois");
  revalidatePath("/admin/tournois");
  revalidatePath("/app/classement");
  return res;
}

/* ----------------------------------------------------------- abonnements */

/**
 * Souscrire à l'abonnement Master Break.
 *
 * Le prix et la durée sont figés sur la souscription : un tarif révisé
 * pendant que le client valide sur son téléphone ne doit pas changer ce qu'il
 * a accepté. Rien ne se reconduit tout seul — au Cameroun le paiement mobile
 * se valide à chaque fois, et un abonnement qui se prélève sans qu'on le
 * demande n'y a pas sa place.
 */
export async function souscrire(
  planId: string,
  method: "om" | "momo",
  phone: string,
): Promise<StartResult> {
  const user = await requireUser();
  const plan = (await db.select().from(memberPlans).where(eq(memberPlans.id, planId)).limit(1))[0];
  if (!plan || !plan.active) return { ok: false, error: "Cette formule n'est plus proposée." };

  // Une souscription laissée en attente est reprise plutôt que doublée : le
  // client qui recommence après un échec ne doit pas s'en retrouver deux.
  const encours = (
    await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, user.id), eq(memberships.status, "pending")))
      .orderBy(sql`${memberships.createdAt} desc`)
      .limit(1)
  )[0];

  const id = encours?.id ?? uid();
  const champs = { planId: plan.id, months: plan.months, price: plan.price, status: "pending" };
  if (encours) await db.update(memberships).set(champs).where(eq(memberships.id, id));
  else await db.insert(memberships).values({ id, userId: user.id, ...champs });

  const started = await startPayment({
    kind: "abonnement",
    userId: user.id,
    amount: plan.price,
    method,
    phone,
    description: `Abonnement ${plan.name}`,
    targetId: id,
  });
  if (!started.ok) return started;

  await db.update(memberships).set({ reference: started.reference }).where(eq(memberships.id, id));
  revalidatePath("/app/abonnement");
  return { ok: true, reference: started.reference, instruction: started.instruction, amount: plan.price };
}

/** Créer ou modifier une formule d'abonnement. Administration seule. */
export async function savePlan(formData: FormData) {
  await requireRole("admin");
  const id = str(formData, "id");
  const name = str(formData, "name");

  const values = {
    slug: str(formData, "slug") || slugify(name),
    name,
    months: Math.max(1, num(formData, "months") || 1),
    price: Math.max(0, num(formData, "price")),
    perks: str(formData, "perks"),
    hint: str(formData, "hint"),
    badge: str(formData, "badge") || null,
    sort: num(formData, "sort"),
    active: bool(formData, "active"),
  };

  if (id) await db.update(memberPlans).set(values).where(eq(memberPlans.id, id));
  else await db.insert(memberPlans).values({ id: uid(), ...values });

  revalidatePath("/app/abonnement");
  revalidatePath("/admin/abonnements");
}

/* ---------------------------------------------------------------- amis */

/**
 * Demander quelqu'un en ami.
 *
 * Un seul lien par paire, quel que soit le sens : si l'autre m'a déjà
 * demandé, ma demande vaut acceptation. C'est ce que tout le monde attend, et
 * cela évite deux lignes qui se contredisent.
 */
export async function demanderAmi(autreId: string) {
  const moi = await requireUser();
  if (autreId === moi.id) return { ok: false as const, error: "On ne se demande pas soi-même." };

  const autre = (await db.select().from(users).where(eq(users.id, autreId)).limit(1))[0];
  if (!autre || autre.role !== "client") return { ok: false as const, error: "Joueur introuvable." };

  const existant = (
    await db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.requesterId, moi.id), eq(friendships.addresseeId, autreId)),
          and(eq(friendships.requesterId, autreId), eq(friendships.addresseeId, moi.id)),
        ),
      )
      .limit(1)
  )[0];

  if (existant?.status === "acceptee") return { ok: false as const, error: "Vous êtes déjà amis." };
  if (existant?.status === "bloquee") return { ok: false as const, error: "Demande impossible." };

  // L'autre m'avait demandé : ma demande vaut réponse.
  if (existant && existant.addresseeId === moi.id) {
    await db.update(friendships).set({ status: "acceptee" }).where(eq(friendships.id, existant.id));
    await notify(autreId, `${moi.name} t'a ajouté`, "Vous êtes amis sur Master Break.", "system", "/app/amis");
    revalidatePath("/app/amis");
    revalidatePath(`/app/joueurs/${autreId}`);
    return { ok: true as const, etat: "amis" as const };
  }

  if (existant) {
    await db.update(friendships).set({ status: "attente" }).where(eq(friendships.id, existant.id));
  } else {
    try {
      await db.insert(friendships).values({
        id: uid(),
        requesterId: moi.id,
        addresseeId: autreId,
        status: "attente",
      });
    } catch {
      // Les deux joueurs ont touché « Ajouter » en même temps : la base refuse
      // la seconde ligne, et c'est très bien — leur demande croisée vaut
      // acceptation, comme lorsqu'on répond à une demande déjà reçue.
      const croisee = (
        await db
          .select()
          .from(friendships)
          .where(and(eq(friendships.requesterId, autreId), eq(friendships.addresseeId, moi.id)))
          .limit(1)
      )[0];
      if (!croisee) return { ok: false as const, error: "Demande impossible pour le moment." };
      if (croisee.status !== "acceptee") {
        await db.update(friendships).set({ status: "acceptee" }).where(eq(friendships.id, croisee.id));
      }
      revalidatePath("/app/amis");
      revalidatePath(`/app/joueurs/${autreId}`);
      return { ok: true as const, etat: "amis" as const };
    }
  }

  await notify(autreId, "Demande d'ami", `${moi.name} veut t'ajouter.`, "system", "/app/amis");
  revalidatePath("/app/amis");
  revalidatePath(`/app/joueurs/${autreId}`);
  return { ok: true as const, etat: "envoyee" as const };
}

/** Accepter, refuser, ou retirer un lien. */
export async function repondreAmi(lienId: string, reponse: "acceptee" | "refusee" | "retirer") {
  const moi = await requireUser();
  const lien = (await db.select().from(friendships).where(eq(friendships.id, lienId)).limit(1))[0];
  if (!lien) return { ok: false as const, error: "Demande introuvable." };
  if (lien.requesterId !== moi.id && lien.addresseeId !== moi.id) {
    return { ok: false as const, error: "Ce lien ne te concerne pas." };
  }

  // Seul le destinataire accepte : sinon on s'ajouterait soi-même comme ami.
  if (reponse === "acceptee" && lien.addresseeId !== moi.id) {
    return { ok: false as const, error: "À l'autre d'accepter." };
  }

  if (reponse === "retirer") await db.delete(friendships).where(eq(friendships.id, lienId));
  else await db.update(friendships).set({ status: reponse }).where(eq(friendships.id, lienId));

  if (reponse === "acceptee") {
    await notify(
      lien.requesterId,
      `${moi.name} a accepté`,
      "Vous êtes amis : tu sauras quand il joue.",
      "system",
      "/app/amis",
    );
  }

  revalidatePath("/app/amis");
  revalidatePath(`/app/joueurs/${lien.requesterId === moi.id ? lien.addresseeId : lien.requesterId}`);
  return { ok: true as const };
}

/** Chercher un joueur par son nom, pour l'ajouter en ami. */
export async function chercherDesJoueurs(terme: string) {
  const moi = await requireUser();
  const { chercherJoueurs } = await import("@/lib/joueurs");
  return chercherJoueurs(terme, moi.id);
}

/* ------------------------------------------------------------- retraits */

export type RetraitResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Demander un versement.
 *
 * Le montant est vérifié côté serveur contre le solde réellement disponible :
 * un formulaire se bricole, et une demande supérieure à la recette de la
 * salle passerait sinon en caisse. Une demande en attente bloque son montant
 * — sans quoi on la déposerait deux fois avant que l'administration ne
 * regarde.
 */
export async function demanderRetrait(formData: FormData): Promise<RetraitResult> {
  const auteur = await requireRole("admin", "manager", "seller");
  const montant = Math.max(0, num(formData, "amount"));
  const method = str(formData, "method") || "momo";
  const phone = normalizePhone(str(formData, "phone") || auteur.phone);
  const note = str(formData, "note").slice(0, 300);

  if (method === "momo" || method === "om") {
    if (!isValidPhone(phone)) return { ok: false, error: "Numéro invalide : 9 chiffres, commençant par 6." };
  }

  const { RETRAIT_MINIMUM, getRecetteSalle, getSoldeRetirableVendeur } = await import("@/lib/caisse");
  if (montant < RETRAIT_MINIMUM) {
    return { ok: false, error: `Le minimum est de ${RETRAIT_MINIMUM.toLocaleString("fr-FR")} F.` };
  }

  // Un vendeur retire sur son propre solde ; un gérant, sur celui de sa salle
  // — mais s'il vend aussi des articles, il a deux bourses distinctes. C'est
  // le guichet d'où part la demande qui dit laquelle, pas le rôle : sinon un
  // gérant verrait le solde de sa boutique et retirerait celui de sa salle.
  const pourSalle = auteur.role !== "seller" && str(formData, "cible") !== "vendeur";
  const venueId = pourSalle ? str(formData, "venueId") || auteur.venueId || "" : "";
  if (pourSalle && !venueId) return { ok: false, error: "Aucune salle rattachée à ce compte." };
  if (pourSalle && auteur.role === "manager" && venueId !== auteur.venueId) redirect("/gerant?refus=1");

  const disponible = pourSalle
    ? (await getRecetteSalle(venueId)).disponible
    : (await getSoldeRetirableVendeur(auteur.id)).disponible;

  if (montant > disponible) {
    return {
      ok: false,
      error: `Tu ne peux retirer que ${disponible.toLocaleString("fr-FR")} F pour l'instant.`,
    };
  }

  const id = uid();
  await db.insert(payouts).values({
    id,
    venueId: pourSalle ? venueId : null,
    userId: auteur.id,
    amount: montant,
    method,
    phone,
    note,
    status: "demande",
  });

  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
  for (const a of admins) {
    await notify(
      a.id,
      "Demande de retrait",
      `${auteur.name} demande ${montant.toLocaleString("fr-FR")} F.`,
      "system",
      "/admin/retraits",
    );
  }

  revalidatePath("/gerant/caisse");
  revalidatePath("/vendeur");
  revalidatePath("/admin/retraits");
  return { ok: true, id };
}

/** L'administration verse, ou refuse. */
export async function traiterRetrait(payoutId: string, decision: "paye" | "refuse", reference = "") {
  const admin = await requireRole("admin");
  const ligne = (await db.select().from(payouts).where(eq(payouts.id, payoutId)).limit(1))[0];
  if (!ligne) return { ok: false as const, error: "Demande introuvable." };
  if (ligne.status !== "demande") return { ok: false as const, error: "Cette demande est déjà traitée." };

  await db
    .update(payouts)
    .set({
      status: decision,
      reference: reference.trim().slice(0, 80),
      processedBy: admin.id,
      paidAt: decision === "paye" ? new Date() : null,
    })
    .where(eq(payouts.id, payoutId));

  await notify(
    ligne.userId,
    decision === "paye" ? "Retrait versé" : "Retrait refusé",
    decision === "paye"
      ? `${ligne.amount.toLocaleString("fr-FR")} F envoyés sur ${displayPhoneServeur(ligne.phone)}.${reference ? ` Réf. ${reference.trim()}.` : ""}`
      : "Rapproche-toi de l'administration pour en connaître la raison.",
    decision === "paye" ? "reward" : "system",
    ligne.venueId ? "/gerant/caisse" : "/vendeur",
  );

  revalidatePath("/admin/retraits");
  revalidatePath("/gerant/caisse");
  revalidatePath("/vendeur");
  return { ok: true as const };
}

/** Le numéro tel qu'on l'écrit dans un message : lisible, jamais tronqué. */
const displayPhoneServeur = (brut: string) => {
  const d = normalizePhone(brut);
  return isValidPhone(d) ? `${d[0]} ${d.slice(1, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7)}` : brut;
};

/* ---------------------------------------------------- groupes de billard */

/** Créer un groupe. Le fondateur en est le chef, et son premier membre. */
export async function creerGroupe(formData: FormData) {
  const moi = await requireUser();
  const name = str(formData, "name").slice(0, 50);
  if (name.length < 2) return { ok: false as const, error: "Donne un nom à ton groupe." };

  // Le nom se répète volontiers — « Les Requins » existe dans trois quartiers.
  // On suffixe l'adresse plutôt que de refuser.
  const base = slugify(name) || "groupe";
  let slug = base;
  for (let i = 2; i < 40; i++) {
    const pris = (await db.select({ id: crews.id }).from(crews).where(eq(crews.slug, slug)).limit(1))[0];
    if (!pris) break;
    slug = `${base}-${i}`;
  }

  const id = uid();
  await db.insert(crews).values({
    id,
    slug,
    name,
    image: str(formData, "image"),
    devise: str(formData, "devise").slice(0, 120),
    ownerId: moi.id,
    venueId: str(formData, "venueId") || null,
  });
  await db.insert(crewMembers).values({ id: uid(), crewId: id, userId: moi.id, role: "chef", status: "membre" });

  revalidatePath("/app/groupes");
  return { ok: true as const, slug };
}

/** Modifier le nom, la photo, la devise ou la salle. Le chef seulement. */
export async function modifierGroupe(formData: FormData) {
  const moi = await requireUser();
  const id = str(formData, "id");
  const groupe = (await db.select().from(crews).where(eq(crews.id, id)).limit(1))[0];
  if (!groupe) return { ok: false as const, error: "Groupe introuvable." };
  if (groupe.ownerId !== moi.id) return { ok: false as const, error: "Seul le chef peut modifier le groupe." };

  // La porte et le lien de communauté ne se règlent que d'ici, donc par le
  // chef : ce sont les deux réglages qui engagent la bande entière.
  const porte = str(formData, "access");
  const lien = str(formData, "lien").slice(0, 300);
  // Une adresse, rien d'autre : un `javascript:` dans un lien qu'on met sous
  // le doigt de tous les membres n'a rien à faire ici.
  const lienPropre = !lien || /^https?:\/\/\S+$/i.test(lien) ? lien : groupe.lien;

  await db
    .update(crews)
    .set({
      name: str(formData, "name").slice(0, 50) || groupe.name,
      image: str(formData, "image"),
      devise: str(formData, "devise").slice(0, 120),
      venueId: str(formData, "venueId") || null,
      access: ["ouvert", "approbation", "invitation"].includes(porte) ? porte : groupe.access,
      lien: lienPropre,
    })
    .where(eq(crews.id, id));

  revalidatePath("/app/groupes");
  revalidatePath(`/app/groupes/${groupe.slug}`);
  return { ok: true as const };
}

/** Rejoindre un groupe, ou le quitter. */
export async function rejoindreGroupe(crewId: string, partir = false) {
  const moi = await requireUser();
  const groupe = (await db.select().from(crews).where(eq(crews.id, crewId)).limit(1))[0];
  if (!groupe) return { ok: false as const, error: "Groupe introuvable." };

  if (partir) {
    if (groupe.ownerId === moi.id) {
      return { ok: false as const, error: "Le chef ne quitte pas son groupe : passe la main d'abord." };
    }
    await db
      .delete(crewMembers)
      .where(and(eq(crewMembers.crewId, crewId), eq(crewMembers.userId, moi.id)));
  } else {
    const deja = (
      await db
        .select()
        .from(crewMembers)
        .where(and(eq(crewMembers.crewId, crewId), eq(crewMembers.userId, moi.id)))
        .limit(1)
    )[0];
    // Une invitation déjà reçue vaut passage, quelle que soit la porte : le
    // groupe a déjà dit oui. Sinon, c'est la porte qui décide.
    const invite = deja?.status === "invite";
    if (!invite && groupe.access === "invitation") {
      return { ok: false as const, error: "Cette bande n'entre que sur invitation." };
    }

    const entre = invite || groupe.access === "ouvert";
    const statut = entre ? "membre" : "demande";

    if (deja) await db.update(crewMembers).set({ status: statut }).where(eq(crewMembers.id, deja.id));
    else await db.insert(crewMembers).values({ id: uid(), crewId, userId: moi.id, status: statut });

    if (groupe.ownerId !== moi.id) {
      await notify(
        groupe.ownerId,
        entre ? `${moi.name} rejoint ${groupe.name}` : `${moi.name} demande à entrer`,
        entre ? "Un joueur de plus dans la bande." : "À toi d'accepter ou de refuser.",
        "system",
        `/app/groupes/${groupe.slug}`,
      );
    }
  }

  revalidatePath("/app/groupes");
  revalidatePath(`/app/groupes/${groupe.slug}`);
  return { ok: true as const };
}

/**
 * Le chef tranche une demande d'entrée.
 *
 * Refuser efface la ligne plutôt que de la marquer : une demande repoussée ne
 * doit pas rester affichée comme une dette, et le joueur peut redemander plus
 * tard s'il le veut.
 */
export async function repondreDemande(crewId: string, userId: string, oui: boolean) {
  const moi = await requireUser();
  const groupe = (await db.select().from(crews).where(eq(crews.id, crewId)).limit(1))[0];
  if (!groupe) return { ok: false as const, error: "Groupe introuvable." };
  if (groupe.ownerId !== moi.id) return { ok: false as const, error: "Seul le chef répond aux demandes." };

  const ligne = (
    await db
      .select()
      .from(crewMembers)
      .where(and(eq(crewMembers.crewId, crewId), eq(crewMembers.userId, userId)))
      .limit(1)
  )[0];
  if (!ligne || ligne.status !== "demande") return { ok: false as const, error: "Aucune demande en cours." };

  if (oui) await db.update(crewMembers).set({ status: "membre" }).where(eq(crewMembers.id, ligne.id));
  else await db.delete(crewMembers).where(eq(crewMembers.id, ligne.id));

  await notify(
    userId,
    oui ? `Bienvenue dans ${groupe.name}` : `${groupe.name} a décliné`,
    oui ? "Le chef t'a ouvert la porte." : "Ce sera peut-être pour une autre fois.",
    "system",
    oui ? `/app/groupes/${groupe.slug}` : "/app/groupes",
  );

  revalidatePath("/app/groupes");
  revalidatePath(`/app/groupes/${groupe.slug}`);
  return { ok: true as const };
}

/* ------------------------------------------------------- « rejoins-moi » */

/**
 * Inviter des amis à venir jouer.
 *
 * Une ligne par destinataire, même quand l'invitation part à tout un groupe :
 * chacun répond pour soi, et l'expéditeur voit qui vient. Les lignes d'un
 * même envoi partagent un `batchId`, pour n'afficher qu'un envoi de son côté.
 *
 * On n'invite que ses amis et les membres de ses groupes. Sans cette règle,
 * l'invitation deviendrait le moyen d'écrire à n'importe qui — et il n'en
 * faut pas plus pour transformer une application de salle en boîte à spam.
 */
export async function inviterAJouer(formData: FormData) {
  const moi = await requireUser();
  const message = str(formData, "message").slice(0, 200);
  const venueId = str(formData, "venueId") || null;
  const crewId = str(formData, "crewId") || null;
  const matchId = str(formData, "matchId") || null;

  const demandes = formData.getAll("amis").map(String).filter(Boolean);
  const { idsDesAmis } = await import("@/lib/joueurs");
  const amis = new Set(await idsDesAmis(moi.id));

  // Tout un groupe d'un coup : ses membres s'ajoutent aux destinataires.
  if (crewId) {
    const membres = await db
      .select({ userId: crewMembers.userId })
      .from(crewMembers)
      .where(and(eq(crewMembers.crewId, crewId), eq(crewMembers.status, "membre")));
    for (const m of membres) if (m.userId !== moi.id) amis.add(m.userId);
    if (demandes.length === 0) for (const m of membres) if (m.userId !== moi.id) demandes.push(m.userId);
  }

  const destinataires = [...new Set(demandes)].filter((id) => id !== moi.id && amis.has(id));
  if (destinataires.length === 0) {
    return { ok: false as const, error: "Choisis au moins un ami — ou rejoins un groupe." };
  }

  const salle = venueId
    ? (await db.select().from(venues).where(eq(venues.id, venueId)).limit(1))[0]
    : undefined;
  const groupe = crewId ? (await db.select().from(crews).where(eq(crews.id, crewId)).limit(1))[0] : undefined;

  const batchId = uid();
  await db.insert(invitations).values(
    destinataires.map((toId) => ({
      id: uid(),
      batchId,
      fromId: moi.id,
      toId,
      venueId,
      matchId,
      crewId,
      message,
      status: "envoyee",
    })),
  );

  // Le titre dit qui invite et où : c'est tout ce qu'on lit d'une bulle.
  const titre = groupe
    ? `${groupe.name} : rejoins-nous`
    : destinataires.length > 1
      ? `${moi.name} vous invite`
      : `${moi.name} t'invite`;
  const ou = salle ? ` au ${salle.name}` : "";
  const corps = message || (matchId ? `On est à la table${ou}. Viens.` : `Rejoins-nous${ou}.`);

  for (const toId of destinataires) {
    await notify(toId, titre, corps, "system", "/app/amis");
  }

  revalidatePath("/app/amis");
  return { ok: true as const, envoyees: destinataires.length };
}

/** Répondre à une invitation. */
export async function repondreInvitation(invitationId: string, reponse: "acceptee" | "refusee") {
  const moi = await requireUser();
  const ligne = (await db.select().from(invitations).where(eq(invitations.id, invitationId)).limit(1))[0];
  if (!ligne) return { ok: false as const, error: "Invitation introuvable." };
  if (ligne.toId !== moi.id) return { ok: false as const, error: "Cette invitation n'est pas pour toi." };

  await db.update(invitations).set({ status: reponse }).where(eq(invitations.id, invitationId));

  if (reponse === "acceptee") {
    await notify(
      ligne.fromId,
      `${moi.name} arrive`,
      "Il a accepté ton invitation.",
      "system",
      "/app/amis",
    );
  }

  revalidatePath("/app/amis");
  return { ok: true as const };
}

/** Dissoudre un groupe. Le chef seulement, et la bande est prévenue. */
export async function supprimerGroupe(crewId: string) {
  const moi = await requireUser();
  const groupe = (await db.select().from(crews).where(eq(crews.id, crewId)).limit(1))[0];
  if (!groupe) return { ok: false as const, error: "Groupe introuvable." };
  if (groupe.ownerId !== moi.id) return { ok: false as const, error: "Seul le chef peut dissoudre le groupe." };

  // Prévenir avant d'effacer : après la suppression, on ne sait plus qui
  // était dedans, et les gens verraient un groupe disparaître sans un mot.
  const membres = await db
    .select({ userId: crewMembers.userId })
    .from(crewMembers)
    .where(and(eq(crewMembers.crewId, crewId), ne(crewMembers.userId, moi.id)));

  for (const m of membres) {
    await notify(m.userId, `${groupe.name} est dissous`, `${moi.name} a fermé le groupe.`, "system", "/app/groupes");
  }

  await db.delete(crews).where(eq(crews.id, crewId));

  revalidatePath("/app/groupes");
  return { ok: true as const };
}

/**
 * Inviter dans un groupe.
 *
 * Trois façons de désigner les gens, parce que ce sont les trois qu'on a en
 * tête : tout le monde, tout le monde sauf untel, ou une poignée choisie.
 * La liste « tous mes amis » se recompose sur le serveur à chaque envoi —
 * calculée dans le navigateur, elle vieillirait entre l'ouverture de la page
 * et le clic.
 */
export async function inviterAuGroupe(formData: FormData) {
  const moi = await requireUser();
  const crewId = str(formData, "crewId");
  const mode = str(formData, "mode") || "tous";

  const groupe = (await db.select().from(crews).where(eq(crews.id, crewId)).limit(1))[0];
  if (!groupe) return { ok: false as const, error: "Groupe introuvable." };

  const suisMembre = (
    await db
      .select({ id: crewMembers.id })
      .from(crewMembers)
      .where(and(eq(crewMembers.crewId, crewId), eq(crewMembers.userId, moi.id), eq(crewMembers.status, "membre")))
      .limit(1)
  )[0];
  if (!suisMembre) return { ok: false as const, error: "Il faut être du groupe pour y inviter." };

  const { idsDesAmis } = await import("@/lib/joueurs");
  const amis = await idsDesAmis(moi.id);
  const coches = formData.getAll("ids").map(String).filter(Boolean);

  // Les envois en masse restent bornés aux amis : « tous mes amis » et « tous
  // sauf » ne doivent pas devenir un moyen d'arroser la ville. Mais une
  // invitation nominative peut viser n'importe quel joueur — on repère un bon
  // niveau au classement, on l'invite, et c'est lui qui décide. Vingt d'un
  // coup au maximum : au-delà, ce n'est plus du recrutement.
  const vises =
    mode === "tous"
      ? amis
      : mode === "sauf"
        ? amis.filter((id) => !coches.includes(id))
        : coches.slice(0, 20);

  const dedans = await db
    .select({ userId: crewMembers.userId })
    .from(crewMembers)
    .where(eq(crewMembers.crewId, crewId));
  const deja = new Set(dedans.map((d) => d.userId));

  // On n'invite que des comptes de joueur : un identifiant glissé à la main ne
  // doit pas faire entrer un compte de gestion dans une bande.
  const joueurs = vises.length
    ? (
        await db
          .select({ id: users.id })
          .from(users)
          .where(and(inArray(users.id, [...new Set(vises)]), eq(users.role, "client")))
      ).map((u) => u.id)
    : [];

  const nouveaux = joueurs.filter((id) => id !== moi.id && !deja.has(id));
  if (nouveaux.length === 0) {
    return {
      ok: false as const,
      error: amis.length === 0 ? "Ajoute d'abord des amis." : "Ils sont déjà tous dans le groupe.",
    };
  }

  await db.insert(crewMembers).values(
    nouveaux.map((userId) => ({ id: uid(), crewId, userId, role: "membre", status: "invite" })),
  );

  for (const userId of nouveaux) {
    await notify(
      userId,
      `${moi.name} t'invite dans ${groupe.name}`,
      groupe.devise || "Une bande de plus pour tes soirées.",
      "system",
      `/app/groupes/${groupe.slug}`,
    );
  }

  revalidatePath("/app/groupes");
  revalidatePath(`/app/groupes/${groupe.slug}`);
  return { ok: true as const, invites: nouveaux.length };
}

/* --------------------------------------------------------------------- défis */

export type DefiResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Défier un joueur.
 *
 * Le jeton est engagé comme pour n'importe quelle partie, et c'est celui qui
 * lance le défi qui le pose — on n'oblige pas quelqu'un à payer une rencontre
 * qu'il n'a pas demandée. Il n'est débité qu'à l'acceptation : un défi refusé
 * ne coûte rien.
 *
 * Le lieu se propose, il ne s'impose pas. Le défié voit l'adresse et peut en
 * proposer une autre ; la balle passe alors dans l'autre camp.
 */
export async function defier(formData: FormData): Promise<DefiResult> {
  const moi = await requireUser();
  const toId = str(formData, "toId");
  if (toId === moi.id) return { ok: false, error: "On ne se défie pas soi-même." };

  const autre = (await db.select().from(users).where(eq(users.id, toId)).limit(1))[0];
  if (!autre || autre.role !== "client") return { ok: false, error: "Joueur introuvable." };

  const { defiEnCours } = await import("@/lib/defis");
  if (await defiEnCours(moi.id, toId)) {
    return { ok: false, error: "Un défi est déjà en cours entre vous." };
  }

  const venueId = str(formData, "venueId");
  if (!venueId) return { ok: false, error: "Propose une salle où jouer." };
  const salle = (await db.select().from(venues).where(eq(venues.id, venueId)).limit(1))[0];
  if (!salle) return { ok: false, error: "Salle introuvable." };

  // Un défi sans jeton en poche serait une promesse en l'air : on le dit tout
  // de suite plutôt qu'au moment où l'autre accepte.
  const { getBalance } = await import("@/lib/queries");
  if ((await getBalance(moi.id)) < 1) {
    return { ok: false, error: "Il te faut au moins un jeton pour lancer un défi. Recharge d'abord." };
  }

  const seche = str(formData, "mode") === "seche" || !str(formData, "mode");
  const target = seche ? 1 : Math.min(21, Math.max(2, num(formData, "target") || 5));

  const id = uid();
  await db.insert(challenges).values({
    id,
    fromId: moi.id,
    toId,
    venueId,
    lieuParId: moi.id,
    kind: str(formData, "kind") || "8-ball",
    target,
    message: str(formData, "message").slice(0, 200),
    status: "propose",
  });

  const { nomDuJeu } = await import("@/lib/regles");
  await notify(
    toId,
    `${moi.name} te défie`,
    `${salle.name} · ${nomDuJeu(target)}. À toi de dire oui, ou de proposer une autre salle.`,
    "system",
    "/app/defis",
  );

  revalidatePath("/app/defis");
  revalidatePath(`/app/joueurs/${toId}`);
  return { ok: true, id };
}

/** Proposer une autre salle : la balle repasse dans l'autre camp. */
export async function changerLeLieu(defiId: string, venueId: string): Promise<DefiResult> {
  const moi = await requireUser();
  const defi = (await db.select().from(challenges).where(eq(challenges.id, defiId)).limit(1))[0];
  if (!defi) return { ok: false, error: "Défi introuvable." };
  if (defi.fromId !== moi.id && defi.toId !== moi.id) return { ok: false, error: "Ce défi ne te concerne pas." };
  if (defi.status !== "propose") return { ok: false, error: "Ce défi n'attend plus de réponse." };

  const salle = (await db.select().from(venues).where(eq(venues.id, venueId)).limit(1))[0];
  if (!salle) return { ok: false, error: "Salle introuvable." };

  await db
    .update(challenges)
    .set({ venueId, lieuParId: moi.id, updatedAt: new Date() })
    .where(eq(challenges.id, defiId));

  const autre = defi.fromId === moi.id ? defi.toId : defi.fromId;
  await notify(
    autre,
    `${moi.name} propose une autre salle`,
    `${salle.name}. Si ça te va, accepte le défi.`,
    "system",
    "/app/defis",
  );

  revalidatePath("/app/defis");
  return { ok: true, id: defiId };
}

/**
 * Accepter, refuser, annuler.
 *
 * À l'acceptation, le jeton du défieur est consommé et la rencontre naît :
 * même table, même feuille de match, même diffusion que si le comptoir l'avait
 * créée. Le passage est inscrit en caisse de la salle, puisqu'elle prête sa
 * table.
 */
export async function repondreDefi(
  defiId: string,
  reponse: "accepte" | "refuse" | "annule",
): Promise<DefiResult> {
  const moi = await requireUser();
  const defi = (await db.select().from(challenges).where(eq(challenges.id, defiId)).limit(1))[0];
  if (!defi) return { ok: false, error: "Défi introuvable." };
  if (defi.fromId !== moi.id && defi.toId !== moi.id) return { ok: false, error: "Ce défi ne te concerne pas." };
  if (defi.status !== "propose") return { ok: false, error: "Ce défi est déjà réglé." };

  const autre = defi.fromId === moi.id ? defi.toId : defi.fromId;

  if (reponse !== "accepte") {
    await db
      .update(challenges)
      .set({ status: reponse === "annule" ? "annule" : "refuse", updatedAt: new Date() })
      .where(eq(challenges.id, defiId));
    await notify(
      autre,
      reponse === "annule" ? `${moi.name} annule le défi` : `${moi.name} décline le défi`,
      "Ce sera pour une autre fois.",
      "system",
      "/app/defis",
    );
    revalidatePath("/app/defis");
    return { ok: true, id: defiId };
  }

  // Accepter, c'est répondre à la proposition de l'autre : celui qui vient de
  // proposer le lieu attend, il n'accepte pas sa propre proposition.
  if (defi.lieuParId === moi.id) {
    return { ok: false, error: "C'est à l'autre de répondre à ta proposition." };
  }
  if (!defi.venueId) return { ok: false, error: "Aucune salle n'est fixée." };

  // Le jeton du défieur, pris maintenant. S'il l'a dépensé entre-temps, on
  // refuse plutôt que de faire jouer une partie que personne n'a payée.
  const jeton = (
    await db
      .select()
      .from(tokens)
      .where(and(eq(tokens.userId, defi.fromId), eq(tokens.status, "active")))
      .orderBy(tokens.createdAt)
      .limit(1)
  )[0];
  if (!jeton) {
    return { ok: false, error: "Le défieur n'a plus de jeton. Qu'il recharge, et relance." };
  }

  const salle = (await db.select().from(venues).where(eq(venues.id, defi.venueId)).limit(1))[0];
  const maintenant = new Date();

  await db
    .update(tokens)
    .set({ status: "used", usedAt: maintenant, venueId: defi.venueId })
    .where(eq(tokens.id, jeton.id));

  // La salle prête sa table : le passage entre en caisse comme un scan du
  // comptoir, sans gérant puisque personne n'a scanné.
  await db.insert(scans).values({
    id: uid(),
    kind: "token",
    refId: jeton.id,
    code: jeton.code,
    userId: defi.fromId,
    venueId: defi.venueId,
    managerId: null,
    method: "code",
    amount: jeton.unitPrice ?? salle?.tokenPrice ?? 0,
  });

  const matchId = uid();
  await db.insert(matches).values({
    id: matchId,
    venueId: defi.venueId,
    kind: defi.kind,
    target: defi.target,
    playerAId: defi.fromId,
    playerBId: defi.toId,
    turnId: defi.fromId,
    label: "Défi",
    status: "scheduled",
    startsAt: maintenant,
    createdBy: defi.fromId,
  });

  await db
    .update(challenges)
    .set({ status: "accepte", matchId, updatedAt: maintenant })
    .where(eq(challenges.id, defiId));

  await notify(
    defi.fromId,
    `${moi.name} relève ton défi`,
    `${salle?.name ?? "La salle"} · ton jeton est engagé. La feuille de match est ouverte.`,
    "system",
    `/app/live/${matchId}`,
  );
  await notify(
    defi.toId,
    "Défi accepté",
    `${salle?.name ?? "La salle"}. Bonne partie — la feuille est ouverte.`,
    "system",
    `/app/live/${matchId}`,
  );

  revalidatePath("/app/defis");
  revalidatePath("/app/live");
  revalidatePath("/gerant/live");
  return { ok: true, id: matchId };
}

/**
 * Confier la feuille de match à quelqu'un.
 *
 * Deux joueurs qui se défient ne peuvent pas marquer et jouer en même temps :
 * ils désignent un tiers — un ami, un habitué du comptoir. Seuls les deux
 * joueurs du duel peuvent le faire, et seulement pour leur propre rencontre.
 */
export async function confierLaFeuille(matchId: string, userId: string): Promise<DefiResult> {
  const moi = await requireUser();
  const match = (await db.select().from(matches).where(eq(matches.id, matchId)).limit(1))[0];
  if (!match) return { ok: false, error: "Match introuvable." };
  if (match.playerAId !== moi.id && match.playerBId !== moi.id) {
    return { ok: false, error: "Seuls les joueurs du duel confient la feuille." };
  }
  if (match.status === "done" || match.status === "cancelled") {
    return { ok: false, error: "La rencontre est terminée." };
  }

  const arbitre = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!arbitre) return { ok: false, error: "Compte introuvable." };

  const deja = (
    await db
      .select({ id: matchOfficials.id })
      .from(matchOfficials)
      .where(and(eq(matchOfficials.matchId, matchId), eq(matchOfficials.userId, userId)))
      .limit(1)
  )[0];
  if (deja) return { ok: false, error: "Il tient déjà cette feuille." };

  await db.insert(matchOfficials).values({
    id: uid(),
    matchId,
    userId,
    role: "scorer",
    createdBy: moi.id,
  });

  await notify(
    userId,
    `${moi.name} te confie une feuille`,
    "Tu peux marquer les parties de ce duel depuis ton téléphone.",
    "system",
    `/arbitre/${matchId}`,
  );

  revalidatePath(`/app/live/${matchId}`);
  revalidatePath("/arbitre");
  return { ok: true, id: matchId };
}

/** Accepter ou décliner une invitation de groupe. */
export async function repondreGroupe(crewId: string, reponse: "acceptee" | "refusee") {
  const moi = await requireUser();
  const ligne = (
    await db
      .select()
      .from(crewMembers)
      .where(and(eq(crewMembers.crewId, crewId), eq(crewMembers.userId, moi.id)))
      .limit(1)
  )[0];
  if (!ligne || ligne.status !== "invite") return { ok: false as const, error: "Aucune invitation en cours." };

  if (reponse === "refusee") await db.delete(crewMembers).where(eq(crewMembers.id, ligne.id));
  else {
    await db.update(crewMembers).set({ status: "membre" }).where(eq(crewMembers.id, ligne.id));
    const groupe = (await db.select().from(crews).where(eq(crews.id, crewId)).limit(1))[0];
    if (groupe) {
      await notify(
        groupe.ownerId,
        `${moi.name} rejoint ${groupe.name}`,
        "Un joueur de plus dans la bande.",
        "system",
        `/app/groupes/${groupe.slug}`,
      );
    }
  }

  revalidatePath("/app/groupes");
  return { ok: true as const };
}

/**
 * Suivre un diffuseur, ou cesser de le suivre.
 *
 * Le geste n'engage que celui qui le fait : pas de demande, pas de réponse à
 * attendre, contrairement à l'amitié. Le diffuseur est prévenu — c'est ce qui
 * donne envie de rallumer la caméra le mardi suivant.
 */
export async function suivreDiffuseur(hostId: string, arreter = false) {
  const moi = await requireUser();
  if (hostId === moi.id) return { ok: false as const, error: "On ne se suit pas soi-même." };

  const { follows } = await import("@/db");
  const cible = (await db.select({ id: users.id }).from(users).where(eq(users.id, hostId)).limit(1))[0];
  if (!cible) return { ok: false as const, error: "Ce compte n'existe pas." };

  if (arreter) {
    await db.delete(follows).where(and(eq(follows.followerId, moi.id), eq(follows.hostId, hostId)));
  } else {
    // `onConflictDoNothing` plutôt qu'une lecture puis un écrit : deux clics
    // rapides ne doivent pas créer deux liens ni lever une erreur.
    await db
      .insert(follows)
      .values({ id: uid(), followerId: moi.id, hostId })
      .onConflictDoNothing({ target: [follows.followerId, follows.hostId] });

    const { nombreDAbonnes, prevenirLeDiffuseur } = await import("@/lib/suivis");
    await prevenirLeDiffuseur(hostId, moi.name, await nombreDAbonnes(hostId));
  }

  revalidatePath("/direct");
  revalidatePath("/app/diffuseurs");
  revalidatePath(`/app/joueurs/${hostId}`);
  return { ok: true as const, suivi: !arreter };
}
