import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, lt, ne, sql } from "drizzle-orm";
import {
  courses,
  db,
  enrollments,
  events,
  memberPlans,
  memberships,
  profilsSpeciaux,
  orderItems,
  orders,
  payments,
  reservations,
  products,
  productVariants,
  purchases,
  streamPasses,
  streams,
  tickets,
  tokens,
  tournaments,
  tournamentPlayers,
  users,
  venueTables,
  type Payment,
} from "@/db";
import { freshCode, notify, uid, type Executor } from "@/lib/domain";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { paymentProvider, providerNamed } from ".";
import { shortRef } from "./pawapay";
import { methodLabel, type Outcome, type PaymentMethod, type PaymentStatus } from "./types";

/** Durée pendant laquelle le client peut encore valider sur son téléphone. */
const WINDOW_MINUTES = 10;

const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} F`;

/**
 * La référence d'un paiement est un UUID v4 : c'est le `depositId` attendu par
 * pawaPay, et c'est lui qui rend leur endpoint idempotent. La forme courte
 * montrée au client (MB-XXXXXXXX) en est dérivée.
 */
const newReference = () => randomUUID();

export type PaymentKind =
  | "pack"
  | "order"
  | "ticket"
  | "reservation"
  | "stream"
  | "course"
  | "tournoi"
  | "abonnement"
  | "profil";

export type StartInput = {
  kind: PaymentKind;
  userId: string;
  amount: number;
  method: PaymentMethod;
  phone: string;
  description: string;
  /** Ligne métier déjà créée en attente (recharge, commande, billet). */
  targetId: string;
};

export type StartResult =
  | { ok: true; reference: string; status: PaymentStatus; instruction?: string; provider: string }
  | { ok: false; error: string };

/**
 * Pousse une demande de débit chez l'opérateur. La ligne métier existe déjà, en
 * attente : rien n'est crédité ni décompté avant la confirmation.
 */
export async function startPayment(input: StartInput): Promise<StartResult> {
  const phone = normalizePhone(input.phone);
  if (!isValidPhone(phone)) return { ok: false, error: "Numéro Mobile Money invalide." };
  if (input.amount <= 0) return { ok: false, error: "Montant invalide." };

  const provider = paymentProvider();
  const reference = newReference();

  await db.insert(payments).values({
    id: uid(),
    reference,
    provider: provider.name,
    kind: input.kind,
    targetId: input.targetId,
    userId: input.userId,
    amount: input.amount,
    method: input.method,
    phone,
    status: "pending",
    expiresAt: new Date(Date.now() + WINDOW_MINUTES * 60_000),
  });

  const charge = await provider.charge({
    reference,
    amount: input.amount,
    phone,
    method: input.method,
    description: input.description,
    callbackUrl: callbackUrl(provider.name),
  });

  if (!charge.ok) {
    await settlePayment(reference, { status: "failed", failureReason: charge.error, detail: charge.detail });
    return { ok: false, error: charge.error };
  }

  await db
    .update(payments)
    .set({ providerRef: charge.providerRef, detail: charge.detail ?? null, updatedAt: new Date() })
    .where(eq(payments.reference, reference));

  // Certains opérateurs confirment immédiatement (compte de test, solde pré-autorisé).
  if (charge.status === "paid") {
    await settlePayment(reference, { status: "paid", providerRef: charge.providerRef, detail: charge.detail });
  }

  return {
    ok: true,
    reference,
    status: charge.status,
    instruction: charge.instruction,
    provider: provider.name,
  };
}

/** Où l'encaisseur doit nous prévenir : une route par encaisseur. */
function callbackUrl(provider: string): string | undefined {
  const base = process.env.MB_PUBLIC_URL?.trim().replace(/\/+$/, "");
  return base ? `${base}/api/webhooks/${provider}` : undefined;
}

/**
 * Applique un résultat de paiement. Idempotent : c'est le même chemin pour le
 * webhook, pour l'interrogation depuis l'app et pour l'expiration, et un
 * paiement déjà réglé ne bouge plus. Le verrou de ligne empêche qu'une
 * notification et une interrogation simultanées créditent deux fois.
 */
export async function settlePayment(reference: string, outcome: Outcome): Promise<Payment | null> {
  return db.transaction(async (tx) => {
    const current = (
      await tx.select().from(payments).where(eq(payments.reference, reference)).limit(1).for("update")
    )[0];
    if (!current) return null;
    if (current.status !== "pending") return current; // déjà réglé : on ne rejoue rien

    if (outcome.status === "pending") return current;

    if (outcome.status === "paid") {
      await fulfil(tx, current);
    } else {
      await cancelTarget(tx, current, outcome.status);
    }

    const updated = await tx
      .update(payments)
      .set({
        status: outcome.status,
        providerRef: outcome.providerRef ?? current.providerRef,
        failureReason: outcome.failureReason ?? null,
        detail: outcome.detail ?? current.detail,
        paidAt: outcome.status === "paid" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, current.id))
      .returning();

    return updated[0] ?? current;
  });
}

type Tx = Exclude<Executor, typeof db>;

/* ------------------------------------------------------------------ livraison */

async function fulfil(tx: Tx, payment: Payment) {
  if (payment.kind === "pack") return fulfilPack(tx, payment);
  if (payment.kind === "order") return fulfilOrder(tx, payment);
  if (payment.kind === "ticket") return fulfilTicket(tx, payment);
  if (payment.kind === "reservation") return fulfilReservation(tx, payment);
  if (payment.kind === "stream") return fulfilStreamPass(tx, payment);
  if (payment.kind === "course") return fulfilEnrollment(tx, payment);
  if (payment.kind === "tournoi") return fulfilTournamentEntry(tx, payment);
  if (payment.kind === "abonnement") return fulfilMembership(tx, payment);
  if (payment.kind === "profil") return fulfilProfil(tx, payment);
}

async function fulfilPack(tx: Tx, payment: Payment) {
  const purchase = (await tx.select().from(purchases).where(eq(purchases.id, payment.targetId!)).limit(1))[0];
  if (!purchase || purchase.status === "paid") return;

  await tx.update(purchases).set({ status: "paid" }).where(eq(purchases.id, purchase.id));

  // Chaque jeton porte ce qu'il a coûté. Le scan lira cette valeur plutôt que
  // le tarif unitaire de la salle : un pack à 1000 F pour trois jetons ne fait
  // pas entrer 1500 F en caisse.
  const { repartirPrix } = await import("@/lib/tokens");
  const valeurs = repartirPrix(purchase.amount, purchase.tokens);

  for (let i = 0; i < purchase.tokens; i++) {
    await tx.insert(tokens).values({
      id: uid(),
      code: await freshCode(tx),
      userId: purchase.userId,
      venueId: purchase.venueId,
      purchaseId: purchase.id,
      unitPrice: valeurs[i],
      status: "active",
    });
  }

  await notify(
    purchase.userId,
    `${purchase.tokens} jetons crédités`,
    `Paiement de ${fcfa(purchase.amount)} par ${methodLabel[payment.method as PaymentMethod]} · réf. ${shortRef(payment.reference)}.`,
    "token",
    "/app/pass",
    tx,
  );
}

async function fulfilOrder(tx: Tx, payment: Payment) {
  const order = (await tx.select().from(orders).where(eq(orders.id, payment.targetId!)).limit(1))[0];
  if (!order || order.status !== "pending") return;

  await tx.update(orders).set({ status: "paid" }).where(eq(orders.id, order.id));

  const lines = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  for (const line of lines) {
    await tx
      .update(products)
      .set({ stock: sql`greatest(0, ${products.stock} - ${line.qty})` })
      .where(eq(products.id, line.productId));
    // La déclinaison tient son propre stock : vendre trois mangues ne doit pas
    // entamer les menthes, et le total de l'article suit quand même.
    if (line.variantId) {
      await tx
        .update(productVariants)
        .set({ stock: sql`greatest(0, ${productVariants.stock} - ${line.qty})` })
        .where(eq(productVariants.id, line.variantId));
    }
  }

  await notify(
    order.userId,
    "Commande confirmée",
    `${lines.length} article${lines.length > 1 ? "s" : ""} · ${fcfa(order.total)} · ${
      order.fulfillment === "pickup" ? "retrait en salle" : "livraison Douala"
    }.`,
    "order",
    "/app/commandes",
    tx,
  );
}

/**
 * Une inscription à un cours, une fois payée.
 *
 * Le cours a pu se remplir pendant que l'élève validait sur son téléphone :
 * on refuse alors plutôt que de vendre une place qui n'existe plus, et on le
 * dit — un débit sans place est la pire des surprises.
 */
async function fulfilEnrollment(tx: Tx, payment: Payment) {
  const inscription = (
    await tx.select().from(enrollments).where(eq(enrollments.id, payment.targetId!)).limit(1)
  )[0];
  if (!inscription || inscription.status !== "pending") return;

  const cours = (await tx.select().from(courses).where(eq(courses.id, inscription.courseId)).limit(1))[0];

  const places = (
    await tx
      .select({ n: sql<number>`count(*)` })
      .from(enrollments)
      .where(and(eq(enrollments.courseId, inscription.courseId), eq(enrollments.status, "paid")))
  )[0];

  if (cours && Number(places?.n ?? 0) >= cours.capacity) {
    await tx.update(enrollments).set({ status: "failed" }).where(eq(enrollments.id, inscription.id));
    await notify(
      inscription.userId,
      `Complet · ${cours.title}`,
      "Le cours s'est rempli pendant le paiement. Aucun montant n'a été retenu.",
      "event",
      "/app/cours",
      tx,
    );
    return;
  }

  await tx.update(enrollments).set({ status: "paid" }).where(eq(enrollments.id, inscription.id));

  // Le prof apprend qu'un élève arrive. Sans cela, il découvrait sa classe le
  // jour de la séance, ce qui n'est pas une façon d'enseigner.
  if (inscription.coachId) {
    const eleve = (await tx.select({ name: users.name }).from(users).where(eq(users.id, inscription.userId)).limit(1))[0];
    await notify(
      inscription.coachId,
      `Nouvel élève · ${cours?.title ?? "ton cours"}`,
      `${eleve?.name ?? "Un joueur"} vient de s'inscrire. ${fcfa(inscription.price - inscription.commission)} pour toi.`,
      "system",
      "/app/prof",
      tx,
    );
  }

  await notify(
    inscription.userId,
    `Inscrit · ${cours?.title ?? "ton cours"}`,
    cours ? `${cours.sessions} séance${cours.sessions > 1 ? "s" : ""} avec ${cours.coachName}. ${cours.schedule}` : "",
    "event",
    "/app/cours",
    tx,
  );
}

async function fulfilTicket(tx: Tx, payment: Payment) {
  const ticket = (await tx.select().from(tickets).where(eq(tickets.id, payment.targetId!)).limit(1))[0];
  if (!ticket || ticket.status !== "pending") return;

  const event = (await tx.select().from(events).where(eq(events.id, ticket.eventId)).limit(1))[0];

  // La salle a pu se remplir pendant que le client validait sur son téléphone.
  if (event && event.attendees >= event.capacity) {
    await tx.update(tickets).set({ status: "failed" }).where(eq(tickets.id, ticket.id));
    await notify(
      ticket.userId,
      `Complet · ${event.title}`,
      "L'événement s'est rempli pendant le paiement. Aucun montant n'a été retenu.",
      "event",
      "/app/events",
      tx,
    );
    return;
  }

  await tx.update(tickets).set({ status: "valid" }).where(eq(tickets.id, ticket.id));
  await tx
    .update(events)
    .set({ attendees: sql`${events.attendees} + 1` })
    .where(eq(events.id, ticket.eventId));

  await notify(
    ticket.userId,
    `Billet · ${event?.title ?? "événement"}`,
    `${event?.day ?? ""} · code ${ticket.code}`,
    "event",
    "/app/billets",
    tx,
  );
}

/** Billet vidéo payé : l'accès au direct s'ouvre. */
async function fulfilStreamPass(tx: Tx, payment: Payment) {
  const pass = (
    await tx.select().from(streamPasses).where(eq(streamPasses.id, payment.targetId!)).limit(1)
  )[0];
  if (!pass || pass.status === "paid") return;

  await tx.update(streamPasses).set({ status: "paid" }).where(eq(streamPasses.id, pass.id));

  const stream = (await tx.select().from(streams).where(eq(streams.id, pass.streamId)).limit(1))[0];
  await notify(
    pass.userId,
    "Billet vidéo confirmé",
    `${stream?.title ?? "Le direct"} · ${fcfa(pass.amount)}`,
    "stream",
    `/direct/${pass.streamId}`,
    tx,
  );
}

/** L'acompte est encaissé : la table est retenue pour de bon. */
async function fulfilReservation(tx: Tx, payment: Payment) {
  const booking = (
    await tx.select().from(reservations).where(eq(reservations.id, payment.targetId!)).limit(1)
  )[0];
  if (!booking || booking.status !== "pending") return;

  // La table a pu être prise pendant que le client validait sur son téléphone.
  const clash = booking.tableId
    ? (
        await tx
          .select({ id: reservations.id })
          .from(reservations)
          .where(
            and(
              eq(reservations.tableId, booking.tableId),
              ne(reservations.id, booking.id),
              inArray(reservations.status, ["confirmed", "seated"]),
              lt(reservations.startsAt, new Date(booking.startsAt.getTime() + booking.minutes * 60_000)),
              // Dans un fragment brut, une `Date` JS part telle quelle : ISO + cast.
              sql`${reservations.startsAt} + make_interval(mins => ${reservations.minutes}) > ${booking.startsAt.toISOString()}::timestamptz`,
            ),
          )
          .limit(1)
      )[0]
    : null;

  if (clash) {
    await tx.update(reservations).set({ status: "cancelled" }).where(eq(reservations.id, booking.id));
    await notify(
      booking.userId,
      "Table déjà prise",
      "Le créneau est parti pendant le paiement. Aucun acompte n'a été retenu.",
      "reservation",
      "/app/reservations",
      tx,
    );
    return;
  }

  await tx.update(reservations).set({ status: "confirmed" }).where(eq(reservations.id, booking.id));
  if (booking.tableId) {
    await tx.update(venueTables).set({ status: "reserved" }).where(eq(venueTables.id, booking.tableId));
  }

  await notify(
    booking.userId,
    "Table réservée",
    `${booking.minutes} minutes · acompte de ${fcfa(booking.deposit)} déduit de ta note.`,
    "reservation",
    "/app/reservations",
    tx,
  );
}

/**
 * Le droit d'inscription d'un joueur à un tournoi.
 *
 * Le montant a été figé sur la candidature : une dotation revue à la hausse
 * après coup ne doit pas rattraper ceux qui ont déjà payé. On ne touche ni au
 * statut de la candidature ni au tableau — l'organisateur reste maître de qui
 * entre.
 */
async function fulfilTournamentEntry(tx: Tx, payment: Payment) {
  const candidat = (
    await tx.select().from(tournamentPlayers).where(eq(tournamentPlayers.id, payment.targetId!)).limit(1)
  )[0];
  if (!candidat || candidat.payment === "paye") return;

  await tx.update(tournamentPlayers).set({ payment: "paye" }).where(eq(tournamentPlayers.id, candidat.id));

  const tournoi = (
    await tx.select().from(tournaments).where(eq(tournaments.id, candidat.tournamentId)).limit(1)
  )[0];

  await notify(
    candidat.userId,
    `Inscription réglée · ${tournoi?.title ?? "tournoi"}`,
    `${fcfa(candidat.fee)} par ${methodLabel[payment.method as PaymentMethod]} · réf. ${shortRef(payment.reference)}. Ta place au tableau est retenue.`,
    "event",
    tournoi ? `/app/tournois/${tournoi.slug}` : "/app/tournois",
    tx,
  );
}

/**
 * L'abonnement Master Break.
 *
 * La date de fin se prolonge, elle ne se remplace pas : qui se réabonne trois
 * jours avant l'échéance garde ces trois jours. C'est le compte qui porte la
 * date — l'abonnement, lui, garde la trace de ce qui a été payé et quand.
 */
async function fulfilMembership(tx: Tx, payment: Payment) {
  const abo = (
    await tx.select().from(memberships).where(eq(memberships.id, payment.targetId!)).limit(1)
  )[0];
  if (!abo || abo.status !== "pending") return;

  const compte = (await tx.select().from(users).where(eq(users.id, abo.userId)).limit(1))[0];
  if (!compte) return;

  const { prolonger } = await import("@/lib/membres");
  const debut = compte.memberUntil && compte.memberUntil.getTime() > Date.now() ? compte.memberUntil : new Date();
  const fin = prolonger(compte.memberUntil, abo.months);

  await tx.update(memberships).set({ status: "paid", startsAt: debut, endsAt: fin }).where(eq(memberships.id, abo.id));
  await tx.update(users).set({ memberUntil: fin }).where(eq(users.id, abo.userId));

  const plan = abo.planId
    ? (await tx.select().from(memberPlans).where(eq(memberPlans.id, abo.planId)).limit(1))[0]
    : undefined;

  await notify(
    abo.userId,
    `Abonné jusqu'au ${fin.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`,
    `${plan?.name ?? `${abo.months} mois`} · ${fcfa(abo.price)} par ${methodLabel[payment.method as PaymentMethod]} · réf. ${shortRef(payment.reference)}. Tous les directs te sont ouverts.`,
    "reward",
    "/app/abonnement",
    tx,
  );
}

/** Profil spécial payé (pro, arbitre) : il s'active, ou se prolonge d'un mois. */
async function fulfilProfil(tx: Tx, payment: Payment) {
  const profil = (await tx.select().from(profilsSpeciaux).where(eq(profilsSpeciaux.id, payment.targetId!)).limit(1))[0];
  if (!profil) return;
  const { PROFILS, prolongerProfil } = await import("@/lib/profils");
  const regle = PROFILS[profil.type as keyof typeof PROFILS];
  if (!regle) return;
  // Un accord sans limite de l'administration ne se raccourcit pas en payant.
  const fin = profil.status === "actif" && profil.actifJusqu === null ? null : prolongerProfil(profil.status === "actif" ? profil.actifJusqu : null, regle.jours);
  await tx
    .update(profilsSpeciaux)
    .set({ status: "actif", actifJusqu: fin, source: "paiement", updatedAt: new Date() })
    .where(eq(profilsSpeciaux.id, profil.id));
  await notify(
    profil.userId,
    `${regle.nom} · profil actif`,
    `${fin ? `Jusqu'au ${fin.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}` : "Sans limite"} · ${fcfa(payment.amount)} · réf. ${shortRef(payment.reference)}.`,
    "reward",
    "/app/rewards",
    tx,
  );
}

async function cancelTarget(tx: Tx, payment: Payment, status: "failed" | "expired") {
  if (!payment.targetId) return;
  if (payment.kind === "pack") {
    await tx.update(purchases).set({ status }).where(eq(purchases.id, payment.targetId));
  } else if (payment.kind === "order") {
    await tx.update(orders).set({ status: "cancelled" }).where(eq(orders.id, payment.targetId));
  } else if (payment.kind === "ticket") {
    await tx.update(tickets).set({ status: "failed" }).where(eq(tickets.id, payment.targetId));
  } else if (payment.kind === "reservation") {
    await tx.update(reservations).set({ status: "failed" }).where(eq(reservations.id, payment.targetId));
  } else if (payment.kind === "stream") {
    await tx.update(streamPasses).set({ status: "failed" }).where(eq(streamPasses.id, payment.targetId));
  } else if (payment.kind === "course") {
    await tx.update(enrollments).set({ status: "failed" }).where(eq(enrollments.id, payment.targetId));
  } else if (payment.kind === "abonnement") {
    await tx.update(memberships).set({ status }).where(eq(memberships.id, payment.targetId));
  } else if (payment.kind === "tournoi") {
    // La candidature survit à un paiement manqué : le joueur peut réessayer.
    await tx
      .update(tournamentPlayers)
      .set({ payment: "impaye", reference: null })
      .where(eq(tournamentPlayers.id, payment.targetId));
  }
}

/* --------------------------------------------------------------- interrogation */

export type PaymentView = {
  reference: string;
  status: PaymentStatus;
  amount: number;
  method: PaymentMethod;
  phone: string;
  failureReason: string | null;
  targetId: string | null;
  kind: PaymentKind;
  /** Forme courte affichable : MB-XXXXXXXX. */
  short: string;
};

const view = (p: Payment): PaymentView => ({
  reference: p.reference,
  short: shortRef(p.reference),
  status: p.status as PaymentStatus,
  amount: p.amount,
  method: p.method as PaymentMethod,
  phone: p.phone,
  failureReason: p.failureReason,
  targetId: p.targetId,
  kind: p.kind as PaymentKind,
});

/**
 * État d'un paiement pour le compte donné. Tant qu'il est en attente, on
 * interroge l'opérateur : le webhook peut se perdre, l'app ne doit pas rester
 * bloquée pour autant.
 */
export async function refreshPayment(reference: string, userId: string): Promise<PaymentView | null> {
  const current = (
    await db
      .select()
      .from(payments)
      .where(and(eq(payments.reference, reference), eq(payments.userId, userId)))
      .limit(1)
  )[0];
  if (!current) return null;
  if (current.status !== "pending") return view(current);

  if (current.expiresAt.getTime() < Date.now()) {
    const expired = await settlePayment(reference, {
      status: "expired",
      failureReason: "Aucune validation reçue à temps.",
    });
    return expired ? view(expired) : null;
  }

  const result = await providerNamed(current.provider).verify({
    reference: current.reference,
    providerRef: current.providerRef,
    phone: current.phone,
    amount: current.amount,
    method: current.method as PaymentMethod,
    createdAt: current.createdAt,
  });

  if (!result.ok || result.status === "pending") return view(current);

  const settled = await settlePayment(reference, result);
  return settled ? view(settled) : view(current);
}

/**
 * Règle un paiement d'après ce que dit l'opérateur, sans rien croire de ce qui
 * nous a été envoyé. C'est le chemin du callback : la notification ne sert qu'à
 * nous donner la référence à vérifier.
 */
export async function confirmFromProvider(reference: string): Promise<Payment | null> {
  const current = (
    await db.select().from(payments).where(eq(payments.reference, reference)).limit(1)
  )[0];
  if (!current) return null;
  if (current.status !== "pending") return current;

  const result = await providerNamed(current.provider).verify({
    reference: current.reference,
    providerRef: current.providerRef,
    phone: current.phone,
    amount: current.amount,
    method: current.method as PaymentMethod,
    createdAt: current.createdAt,
  });

  if (!result.ok) return current;
  return (await settlePayment(reference, result)) ?? current;
}

/** Passe en « expiré » les paiements que plus personne n'interroge. */
export async function expireStalePayments(): Promise<number> {
  const stale = await db
    .select({ reference: payments.reference })
    .from(payments)
    .where(and(eq(payments.status, "pending"), lt(payments.expiresAt, new Date())))
    .limit(200);

  for (const row of stale) {
    await settlePayment(row.reference, { status: "expired", failureReason: "Délai de validation dépassé." });
  }
  return stale.length;
}

/** Paiements en attente d'un client, pour réafficher l'écran d'attente. */
export async function pendingPayments(userId: string): Promise<PaymentView[]> {
  const rows = await db
    .select()
    .from(payments)
    .where(and(eq(payments.userId, userId), inArray(payments.status, ["pending"])))
    .orderBy(payments.createdAt);
  return rows.map(view);
}
