import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Schéma `mb` — Master Break.
 *
 * Le Supabase du VPS héberge plusieurs applications : chacune vit dans son
 * propre schéma, jamais dans `public`. Toutes les tables ci-dessous sont donc
 * préfixées `mb.` et les politiques RLS sont définies dans la migration
 * dédiée (db/migrations/*_rls.sql).
 */
export const mb = pgSchema("mb");

const id = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const venues = mb.table("venues", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  area: text("area").notNull(),
  city: text("city").notNull(),
  address: text("address").notNull().default(""),
  tables: integer("tables").notNull().default(6),
  freeTables: integer("free_tables").notNull().default(0),
  tokenPrice: integer("token_price").notNull().default(400),
  distanceKm: real("distance_km").notNull().default(0),
  image: text("image").notNull().default("/img/hall-dark.jpg"),
  /** La salle autorise les joueurs à tenir eux-mêmes la feuille de match. */
  selfScoring: boolean("self_scoring").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const users = mb.table(
  "users",
  {
    id: id(),
    /** Compte GoTrue correspondant (auth.users.id) quand Supabase Auth gère la connexion. */
    authId: uuid("auth_id").unique(),
    name: text("name").notNull(),
    /**
     * Le code à six chiffres qu'on donne de vive voix.
     *
     * Chercher par le nom fait remonter dix homonymes, et personne n'est
     * obligé d'inscrire son vrai nom. Le code désigne une personne et une
     * seule — c'est ce qu'on se dit à la table pour s'ajouter.
     */
    code: text("code").notNull(),
    phone: text("phone").notNull(),
    /** scrypt, format `scrypt$<sel>$<empreinte>` — nul si la connexion passe par GoTrue. */
    passwordHash: text("password_hash"),
    avatar: text("avatar"),
    // client | manager | admin
    role: text("role").notNull().default("client"),
    points: integer("points").notNull().default(0),
    venueId: uuid("venue_id").references(() => venues.id),
    /** Fin de l'abonnement Master Break : donne accès aux directs « membres ». */
    memberUntil: timestamp("member_until", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_phone_idx").on(t.phone), uniqueIndex("users_code_idx").on(t.code)],
);

export const packs = mb.table("packs", {
  id: id(),
  tokens: integer("tokens").notNull(),
  price: integer("price").notNull(),
  bonus: integer("bonus").notNull().default(0),
  hint: text("hint").notNull().default(""),
  badge: text("badge"),
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const purchases = mb.table(
  "purchases",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    packId: uuid("pack_id").references(() => packs.id),
    venueId: uuid("venue_id").references(() => venues.id),
    tokens: integer("tokens").notNull(),
    amount: integer("amount").notNull(),
    // om | momo
    method: text("method").notNull(),
    // pending | paid | failed | expired
    status: text("status").notNull().default("pending"),
    /** Référence du paiement (mb.payments.reference) — unique, sert à l'idempotence. */
    reference: text("reference").unique(),
    createdAt: createdAt(),
  },
  (t) => [index("purchases_user_idx").on(t.userId)],
);

export const tokens = mb.table(
  "tokens",
  {
    id: id(),
    code: text("code").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    venueId: uuid("venue_id").references(() => venues.id),
    purchaseId: uuid("purchase_id").references(() => purchases.id),
    /**
     * Ce que ce jeton a réellement coûté, en francs, figé à l'achat.
     *
     * Un pack à 1000 F pour trois jetons en vaut 333, pas le tarif unitaire
     * affiché par la salle. Le scan enregistrait ce dernier : la recette du
     * gérant gonflait d'un tiers à chaque partie. On fige la valeur ici plutôt
     * que de la recalculer au scan — un pack dont le prix change demain ne doit
     * pas réécrire les recettes d'hier.
     *
     * Nul pour les jetons d'avant cette colonne : le scan retombe alors sur le
     * tarif de la salle, faute de mieux.
     */
    unitPrice: integer("unit_price"),
    // active | used
    status: text("status").notNull().default("active"),
    tableNumber: integer("table_number"),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("tokens_user_idx").on(t.userId), index("tokens_code_idx").on(t.code)],
);

export const products = mb.table("products", {
  id: id(),
  /**
   * Le vendeur. Nul pour les articles de Master Break.
   *
   * Sans lui, la boutique n'était pas une place de marché mais un magasin :
   * seul l'administrateur pouvait créer un article, et personne n'en était
   * propriétaire.
   */
  sellerId: uuid("seller_id").references(() => users.id, { onDelete: "set null" }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  detail: text("detail").notNull().default(""),
  description: text("description").notNull().default(""),
  price: integer("price").notNull(),
  image: text("image").notNull(),
  // vapes | billard
  category: text("category").notNull().default("vapes"),
  badgeLabel: text("badge_label"),
  badgeTone: text("badge_tone"),
  stock: integer("stock").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

/**
 * Les images d'un article, au-delà de la première.
 *
 * Une puff se vend sur sa photo : une seule image, prise de face, ne dit ni la
 * taille, ni la contenance, ni ce qu'il y a dans la boîte. `products.image`
 * reste la vignette — celle des listes et du panier —, et cette table porte la
 * galerie de la fiche, dans l'ordre choisi par le vendeur.
 */
export const productImages = mb.table(
  "product_images",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    sort: integer("sort").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("product_images_product_idx").on(t.productId, t.sort)],
);

/**
 * Les déclinaisons d'un article : une saveur, une contenance, une couleur.
 *
 * Un vendeur de puffs n'a pas dix articles, il en a un en dix parfums — et
 * chacun a son propre stock, parfois son propre prix. Sans cette table, il
 * fallait créer dix fiches, ou mentir sur le stock.
 *
 * Le prix est porté ici en entier plutôt qu'en écart : un écart se relit mal
 * six mois plus tard, et une promotion sur une seule saveur devient un calcul
 * mental. Une déclinaison sans prix propre reprend celui de l'article.
 */
export const productVariants = mb.table(
  "product_variants",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Ce qui la distingue, en clair : « Mangue glacée », « 50 cl », « Bleu ». */
    name: text("name").notNull(),
    /** Le prix de cette déclinaison. Nul : on prend celui de l'article. */
    price: integer("price"),
    stock: integer("stock").notNull().default(0),
    /** Sa propre photo, quand la couleur change tout. */
    image: text("image"),
    sort: integer("sort").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("product_variants_product_idx").on(t.productId, t.sort)],
);

export const orders = mb.table(
  "orders",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    venueId: uuid("venue_id").references(() => venues.id),
    total: integer("total").notNull(),
    method: text("method").notNull().default("momo"),
    // pickup | delivery
    fulfillment: text("fulfillment").notNull().default("pickup"),
    // pending | paid | ready | done | cancelled | failed
    status: text("status").notNull().default("pending"),
    /** Référence du paiement (mb.payments.reference). */
    reference: text("reference").unique(),
    createdAt: createdAt(),
  },
  (t) => [index("orders_user_idx").on(t.userId)],
);

export const orderItems = mb.table("order_items", {
  id: id(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  /**
   * La déclinaison vendue, et son nom figé.
   *
   * Le nom est recopié ici : une saveur renommée, ou retirée du catalogue, ne
   * doit pas réécrire une commande d'hier — c'est la même règle que le prix
   * unitaire juste en dessous.
   */
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  variantLabel: text("variant_label").notNull().default(""),
  qty: integer("qty").notNull().default(1),
  unitPrice: integer("unit_price").notNull(),
  /**
   * À qui revient cette ligne, et ce que la plateforme y prend — figés au
   * moment de la vente.
   *
   * Un article revendu à un autre vendeur, ou un taux de commission revu
   * l'an prochain, ne doivent pas réécrire ce qu'on doit pour une vente
   * d'hier. C'est la même règle que le prix unitaire juste au-dessus, et que
   * les jetons : ce qui est dû se fige à l'instant de la transaction.
   */
  sellerId: uuid("seller_id").references(() => users.id, { onDelete: "set null" }),
  /** Part de la plateforme sur cette ligne, en francs. */
  commission: integer("commission").notNull().default(0),
});

/**
 * Un tournoi.
 *
 * Il double toujours un événement : c'est par lui que le public prend sa
 * place et paie son entrée. Le tournoi, lui, porte ce que l'événement ne sait
 * pas dire — la discipline, le format du tableau, la distance des courses, la
 * dotation, et l'arbre.
 *
 * Deux inscriptions cohabitent donc : un billet d'événement pour venir voir,
 * une candidature ici pour venir jouer. Ce ne sont pas les mêmes gens, ni le
 * même prix, ni le même formulaire.
 */
export const tournaments = mb.table("tournaments", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  /** L'événement jumeau, par lequel le public achète sa place. */
  eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
  venueId: uuid("venue_id").references(() => venues.id, { onDelete: "set null" }),
  /** Qui l'organise — administration ou gérant, jamais un joueur. */
  organiserId: uuid("organiser_id").references(() => users.id, { onDelete: "set null" }),
  // 8-ball | 9-ball | snooker | killer
  discipline: text("discipline").notNull().default("8-ball"),
  /** direct = élimination directe seule ; poules = phase de groupes puis tableau. */
  format: text("format").notNull().default("direct"),
  /** Joueurs par poule, et combien en sortent. Ignorés en élimination directe. */
  groupSize: integer("group_size").notNull().default(4),
  qualifiers: integer("qualifiers").notNull().default(2),
  /** Nombre de places au tableau : 8, 16, 32… Les manquants deviennent des exemptions. */
  size: integer("size").notNull().default(16),
  /** open | hommes | dames | mixte | juniors | veterans — voir CATEGORIES. */
  category: text("category").notNull().default("open"),
  /**
   * Le tableau principal de l'événement, pour un tableau ajouté (« 64 hommes
   * + 24 dames » : deux tableaux, une affiche). Il partage la billetterie du
   * principal au lieu d'en ouvrir une seconde.
   */
  parentId: uuid("parent_id").references((): AnyPgColumn => tournaments.id, { onDelete: "set null" }),
  /** Course à N manches gagnantes, au premier tour. Elle s'allonge vers la finale. */
  raceTo: integer("race_to").notNull().default(4),
  /**
   * Le niveau minimal exigé des candidats. 0 : ouvert à tous.
   *
   * Un classement qui ne sert qu'à s'afficher est un jeu de chiffres. Un
   * tournoi qu'on ne peut disputer qu'à partir d'un certain palier lui donne
   * sa raison d'être — et évite qu'un débutant s'inscrive à une compétition
   * où il prendra 6-0 au premier tour.
   */
  minLevel: integer("min_level").notNull().default(0),
  /** Droit d'inscription d'un joueur, en francs. */
  entryFee: integer("entry_fee").notNull().default(0),
  /** La dotation totale annoncée. */
  prizePool: integer("prize_pool").notNull().default(0),
  /** Comment elle se partage, en clair : « 60 / 30 / 10 ». */
  prizeSplit: text("prize_split").notNull().default(""),
  rules: text("rules").notNull().default(""),
  image: text("image").notNull().default("/img/table-rack.jpg"),
  /** brouillon | inscriptions | complet | encours | termine | annule */
  status: text("status").notNull().default("brouillon"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  /** Après quoi on ne s'inscrit plus, et le tableau peut être tiré. */
  closesAt: timestamp("closes_at", { withTimezone: true }),
  winnerId: uuid("winner_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

/**
 * Une candidature de joueur.
 *
 * Elle n'est pas un billet : elle demande un pseudo de tableau, un niveau
 * déclaré et un téléphone joignable le jour J. L'organisateur accepte ou
 * refuse — un tournoi n'est pas un guichet.
 */
export const tournamentPlayers = mb.table(
  "tournament_players",
  {
    id: id(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    /** Le nom porté au tableau : souvent un surnom de salle. */
    nickname: text("nickname").notNull().default(""),
    phone: text("phone").notNull().default(""),
    // debutant | intermediaire | confirme
    level: text("level").notNull().default("intermediaire"),
    note: text("note").notNull().default(""),
    /** Le rang de tête de série, posé au tirage. Nul tant qu'il n'a pas eu lieu. */
    seed: integer("seed"),
    /** La poule, à partir de 1. Nulle en élimination directe. */
    groupe: integer("groupe"),
    // candidat | accepte | refuse | retire
    status: text("status").notNull().default("candidat"),
    /** Le droit d'inscription, figé à la candidature. */
    fee: integer("fee").notNull().default(0),
    // impaye | guichet (réglera sur place) | paye
    payment: text("payment").notNull().default("impaye"),
    reference: text("reference").unique(),
    /** Le tour atteint, pour les points de classement. */
    reachedRound: integer("reached_round").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("tp_tournament_idx").on(t.tournamentId), index("tp_user_idx").on(t.userId)],
);

/** Un duel du tableau. */
export const tournamentMatches = mb.table(
  "tournament_matches",
  {
    id: id(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    /** poule | tableau — la phase à laquelle ce duel appartient. */
    stage: text("stage").notNull().default("tableau"),
    /** Le numéro de poule, pour un duel de poule. Nul sur le tableau. */
    groupe: integer("groupe"),
    round: integer("round").notNull(),
    slot: integer("slot").notNull(),
    playerAId: uuid("player_a_id").references(() => tournamentPlayers.id, { onDelete: "set null" }),
    playerBId: uuid("player_b_id").references(() => tournamentPlayers.id, { onDelete: "set null" }),
    winnerId: uuid("winner_id").references(() => tournamentPlayers.id, { onDelete: "set null" }),
    scoreA: integer("score_a").notNull().default(0),
    scoreB: integer("score_b").notNull().default(0),
    /** La course de CE duel : elle s'allonge vers la finale. */
    raceTo: integer("race_to").notNull().default(4),
    /** Le match arbitré correspondant, quand il est lancé sur une table. */
    matchId: uuid("match_id").references(() => matches.id, { onDelete: "set null" }),
    // attente | encours | termine | exempt
    status: text("status").notNull().default("attente"),
    createdAt: createdAt(),
  },
  (t) => [index("tm_tournament_idx").on(t.tournamentId, t.round)],
);

/**
 * Les cours de billard.
 *
 * Un cours n'est pas un produit : il a un coach, un niveau, un nombre de
 * séances et un créneau. Le ranger dans `products` aurait demandé cinq
 * colonnes nulles pour tout le reste du catalogue, et une case « c'est un
 * cours » à interpréter partout.
 */
export const courses = mb.table("courses", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  /** Le coach, s'il a un compte : c'est lui qu'on paie. */
  coachId: uuid("coach_id").references(() => users.id, { onDelete: "set null" }),
  /** Son nom affiché, même sans compte — un intervenant de passage en a un. */
  coachName: text("coach_name").notNull().default(""),
  venueId: uuid("venue_id").references(() => venues.id, { onDelete: "set null" }),
  // debutant | intermediaire | confirme
  level: text("level").notNull().default("debutant"),
  // seance | forfait | abonnement
  format: text("format").notNull().default("forfait"),
  /** Nombre de séances du forfait ; 1 pour une séance seule. */
  sessions: integer("sessions").notNull().default(1),
  /** Quand ça se passe, en clair : « Samedi · 10h → 12h ». */
  schedule: text("schedule").notNull().default(""),
  price: integer("price").notNull().default(0),
  image: text("image").notNull(),
  description: text("description").notNull().default(""),
  capacity: integer("capacity").notNull().default(10),
  /** Mis en avant en bannière dans la boutique. */
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

/**
 * Une inscription à un cours.
 *
 * `price` est figé ici : un tarif révisé en cours de trimestre ne doit pas
 * réécrire ce qu'un élève déjà inscrit a payé. Même règle que les jetons et
 * les lignes de vente.
 */
export const enrollments = mb.table(
  "enrollments",
  {
    id: id(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    /** Ce que l'élève a payé, figé à l'inscription. */
    price: integer("price").notNull().default(0),
    /**
     * À qui revient cette inscription, et ce que la plateforme y prend —
     * figés au moment du paiement.
     *
     * Même règle que pour une ligne de commande : un cours repris par un autre
     * coach, ou un taux de commission revu l'an prochain, ne doivent pas
     * réécrire ce qu'on doit pour une inscription d'hier.
     */
    coachId: uuid("coach_id").references(() => users.id, { onDelete: "set null" }),
    commission: integer("commission").notNull().default(0),
    // pending | paid | failed | cancelled
    status: text("status").notNull().default("pending"),
    reference: text("reference").unique(),
    createdAt: createdAt(),
  },
  (t) => [index("enrollments_course_idx").on(t.courseId), index("enrollments_user_idx").on(t.userId)],
);

export const events = mb.table("events", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  day: text("day").notNull(),
  hours: text("hours").notNull().default(""),
  checkin: text("checkin").notNull().default(""),
  venueId: uuid("venue_id").references(() => venues.id),
  address: text("address").notNull().default(""),
  price: integer("price").notNull().default(0),
  image: text("image").notNull(),
  capacity: integer("capacity").notNull().default(100),
  attendees: integer("attendees").notNull().default(0),
  description: text("description").notNull().default(""),
  tags: text("tags").notNull().default(""),
  active: boolean("active").notNull().default(true),
  /** À la une : l'événement mis en avant sur l'accueil du site et de l'application. Un seul à la fois. */
  featured: boolean("featured").notNull().default(false),
  /**
   * Quand la soirée s'est terminée.
   *
   * `day` est du texte libre — « Samedi 03 octobre » —, impossible à comparer
   * à une horloge : une soirée restait donc « en cours » pour toujours, et le
   * tournoi fini laissait derrière lui un événement qui vendait encore des
   * billets. Une date de fin, posée à la main par le gérant ou par la finale
   * du tournoi jumeau, referme l'affiche sans la faire disparaître.
   */
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const tickets = mb.table(
  "tickets",
  {
    id: id(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    code: text("code").notNull(),
    // pending | valid | used | failed | guichet (place gardée, à régler à l'entrée)
    status: text("status").notNull().default("valid"),
    /** Référence du paiement (mb.payments.reference) — nulle pour un billet gratuit. */
    reference: text("reference").unique(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("tickets_user_idx").on(t.userId)],
);

/**
 * Tables de billard, une ligne par table réelle.
 *
 * Le compteur `free_tables` de `venues` restait déclaratif : ici chaque table a
 * son état, sa réservation en cours et son tarif horaire, ce qui permet au
 * gérant de tenir son service et au joueur de voir ce qui est libre.
 */
export const venueTables = mb.table(
  "venue_tables",
  {
    id: id(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    /** Numéro affiché sur la table, tel que la salle l'appelle. */
    label: text("label").notNull(),
    // pool | snooker | billard francais
    kind: text("kind").notNull().default("pool"),
    /** Tarif horaire en francs, 0 quand la table se joue au jeton. */
    hourlyRate: integer("hourly_rate").notNull().default(0),
    /** Acompte demandé pour retenir la table. */
    deposit: integer("deposit").notNull().default(1000),
    // free | occupied | reserved | closed
    status: text("status").notNull().default("free"),
    seats: integer("seats").notNull().default(4),
    sort: integer("sort").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("venue_tables_venue_idx").on(t.venueId)],
);

/**
 * Réservations de table.
 *
 * L'acompte suit exactement le chemin des autres paiements : la réservation
 * naît en attente, la table n'est retenue qu'une fois l'acompte confirmé.
 */
export const reservations = mb.table(
  "reservations",
  {
    id: id(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    tableId: uuid("table_id").references(() => venueTables.id, { onDelete: "set null" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    /** Durée réservée, en minutes. */
    minutes: integer("minutes").notNull().default(60),
    players: integer("players").notNull().default(2),
    deposit: integer("deposit").notNull().default(0),
    // pending | confirmed | seated | done | cancelled | no_show | failed
    status: text("status").notNull().default("pending"),
    note: text("note").notNull().default(""),
    /** Référence du paiement de l'acompte (mb.payments.reference). */
    reference: text("reference").unique(),
    seatedAt: timestamp("seated_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("reservations_venue_idx").on(t.venueId),
    index("reservations_user_idx").on(t.userId),
    index("reservations_starts_idx").on(t.startsAt),
  ],
);

/**
 * Matchs — le cœur de Master Break Live.
 *
 * Un match vit sur une table d'une salle, oppose deux joueurs et se court en
 * « race to N ». Le score porté ici est la vérité affichée partout ; le détail
 * de la partie vit dans `match_events`, qui permet de rejouer la rencontre coup
 * par coup et d'en tirer les statistiques sans les dupliquer.
 */
export const matches = mb.table(
  "matches",
  {
    id: id(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    tableId: uuid("table_id").references(() => venueTables.id, { onDelete: "set null" }),
    /** Rattachement à un tournoi, quand la rencontre en fait partie. */
    eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
    // 8-ball | 9-ball | snooker | killer
    kind: text("kind").notNull().default("8-ball"),
    /** Race to N : le premier à N manches gagne. */
    target: integer("target").notNull().default(5),
    playerAId: uuid("player_a_id")
      .notNull()
      .references(() => users.id),
    playerBId: uuid("player_b_id")
      .notNull()
      .references(() => users.id),
    scoreA: integer("score_a").notNull().default(0),
    scoreB: integer("score_b").notNull().default(0),
    /** Joueur à la table, pour l'affichage en direct. */
    turnId: uuid("turn_id").references(() => users.id),
    // scheduled | live | done | cancelled
    status: text("status").notNull().default("scheduled"),
    winnerId: uuid("winner_id").references(() => users.id),
    /** Mise du défi, en francs — 0 pour un match amical. */
    stake: integer("stake").notNull().default(0),
    label: text("label").notNull().default("Amical"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    /** Change à chaque écriture : c'est ce que le flux en direct surveille. */
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    index("matches_venue_idx").on(t.venueId),
    index("matches_status_idx").on(t.status),
    index("matches_players_idx").on(t.playerAId, t.playerBId),
  ],
);

/**
 * Le déroulé d'un match, coup par coup : c'est à la fois la frise affichée en
 * direct et la source des statistiques. On y garde le score après chaque
 * événement pour pouvoir rejouer la rencontre sans tout recalculer.
 */
export const matchEvents = mb.table(
  "match_events",
  {
    id: id(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    playerId: uuid("player_id").references(() => users.id),
    /** Qui a saisi : gérant, arbitre ou joueur. La frise doit rester opposable. */
    byId: uuid("by_id").references(() => users.id),
    // start | rack | foul | break | safety | pot | note | end
    kind: text("kind").notNull(),
    seq: integer("seq").notNull().default(0),
    scoreA: integer("score_a").notNull().default(0),
    scoreB: integer("score_b").notNull().default(0),
    detail: text("detail").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("match_events_match_idx").on(t.matchId, t.seq)],
);

/**
 * Master Break Live — les directs vidéo.
 *
 * Deux axes indépendants, parce qu'ils ne décrivent pas la même chose :
 *
 *  · `level` — comment c'est produit. `phone` : un téléphone posé sur un
 *    trépied, diffusé depuis le navigateur, zéro matériel. `venue` : la caméra
 *    fixe de la salle, qui tourne toute la soirée (Venue Cast). `production` :
 *    un tournoi multi-caméra monté sous OBS, avec habillage.
 *  · `access` — qui a le droit de regarder. `free`, `members` (abonnés), ou
 *    `ppv` (payant à l'unité).
 *
 * `path` est public : c'est le chemin MediaMTX. `stream_key` est le secret
 * d'ingestion, qui ne quitte jamais la console du diffuseur.
 */
export const streams = mb.table(
  "streams",
  {
    id: id(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    matchId: uuid("match_id").references(() => matches.id, { onDelete: "set null" }),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    // phone | venue | production
    level: text("level").notNull().default("phone"),
    // free | members | ppv
    access: text("access").notNull().default("free"),
    /** Rubrique de la vitrine : 8-ball, 9-ball, snooker, killer, ambiance… */
    discipline: text("discipline").notNull().default("8-ball"),
    /** Vignette du direct ; à défaut, la photo de la salle. */
    poster: text("poster"),
    /** Prix du billet vidéo, en francs, quand l'accès est `ppv`. */
    price: integer("price").notNull().default(0),
    /** Chemin MediaMTX, public : /live/<path>. */
    path: text("path").notNull().unique(),
    /** Secret d'ingestion RTMP / WHIP. */
    streamKey: text("stream_key").notNull().unique(),
    // idle | live | ended
    status: text("status").notNull().default("idle"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    viewers: integer("viewers").notNull().default(0),
    peakViewers: integer("peak_viewers").notNull().default(0),
    /** Rediffusion, quand l'enregistrement est activé sur le serveur média. */
    replayUrl: text("replay_url"),
    createdBy: uuid("created_by").references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    index("streams_venue_idx").on(t.venueId),
    index("streams_status_idx").on(t.status),
    index("streams_match_idx").on(t.matchId),
  ],
);

/** Billet vidéo : qui a payé pour voir quel direct. */
export const streamPasses = mb.table(
  "stream_passes",
  {
    id: id(),
    streamId: uuid("stream_id")
      .notNull()
      .references(() => streams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull().default(0),
    /**
     * Qui diffuse, et ce que la plateforme prend — figés à l'achat.
     *
     * Un direct tenu par un joueur lui rapporte : c'est ce qui donne une
     * raison de poser son téléphone sur un trépied et de filmer une table un
     * mardi soir. Le bénéficiaire se fige ici, comme le vendeur d'une ligne de
     * commande ou le coach d'une inscription.
     */
    hostId: uuid("host_id").references(() => users.id, { onDelete: "set null" }),
    commission: integer("commission").notNull().default(0),
    /** Référence du paiement (mb.payments.reference). */
    reference: text("reference").unique(),
    // pending | paid | failed
    status: text("status").notNull().default("pending"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("stream_passes_unique").on(t.streamId, t.userId)],
);

/**
 * Suivre un diffuseur.
 *
 * Un direct se regarde une fois ; un diffuseur se suit. Celui qui pose son
 * téléphone sur un trépied tous les mardis finit par avoir son public, et ce
 * public veut être prévenu quand la caméra s'allume — pas tomber dessus par
 * hasard en ouvrant la vitrine.
 *
 * Une ligne par lien, unique dans le sens qu'elle porte : suivre n'est pas
 * réciproque, contrairement à l'amitié. On ne se suit pas soi-même.
 */
export const follows = mb.table(
  "follows",
  {
    id: id(),
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    hostId: uuid("host_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("follows_unique").on(t.followerId, t.hostId),
    index("follows_host_idx").on(t.hostId),
  ],
);

/**
 * Qui a le droit de tenir la feuille de match.
 *
 * Une ligne par habilitation, portée soit par un match précis, soit par un
 * tournoi entier — un arbitre de tournoi marque toutes ses rencontres sans
 * qu'on lui en assigne chacune. Le gérant et l'arbitre de salle n'ont pas
 * besoin de ligne : leur rattachement à la salle suffit.
 */
export const matchOfficials = mb.table(
  "match_officials",
  {
    id: id(),
    matchId: uuid("match_id").references(() => matches.id, { onDelete: "cascade" }),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // referee | scorer
    role: text("role").notNull().default("referee"),
    /** Qui a délivré l'habilitation. */
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    index("match_officials_match_idx").on(t.matchId),
    index("match_officials_event_idx").on(t.eventId),
    index("match_officials_user_idx").on(t.userId),
  ],
);

/**
 * Paiements Mobile Money.
 *
 * Une ligne par tentative, quelle que soit la chose payée : `kind` + `targetId`
 * désignent la recharge, la commande ou le billet correspondant. `reference` est
 * ce que l'on transmet à PowerPay et ce que son webhook nous renvoie — unique,
 * c'est la clé d'idempotence : deux notifications pour le même paiement ne
 * créditent qu'une fois.
 */
export const payments = mb.table(
  "payments",
  {
    id: id(),
    reference: text("reference").notNull().unique(),
    // powerpay | simulated
    provider: text("provider").notNull(),
    /** Identifiant de la transaction chez l'opérateur. */
    providerRef: text("provider_ref"),
    // pack | order | ticket
    kind: text("kind").notNull(),
    targetId: uuid("target_id"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    amount: integer("amount").notNull(),
    // om | momo
    method: text("method").notNull(),
    phone: text("phone").notNull(),
    // pending | paid | failed | expired
    status: text("status").notNull().default("pending"),
    failureReason: text("failure_reason"),
    /** Dernière charge utile reçue de l'opérateur, telle quelle. */
    detail: jsonb("detail"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_user_idx").on(t.userId), index("payments_status_idx").on(t.status)],
);

export const scans = mb.table(
  "scans",
  {
    id: id(),
    // token | ticket
    kind: text("kind").notNull(),
    refId: uuid("ref_id").notNull(),
    code: text("code").notNull(),
    userId: uuid("user_id").references(() => users.id),
    venueId: uuid("venue_id").references(() => venues.id),
    managerId: uuid("manager_id").references(() => users.id),
    // qr | code
    method: text("method").notNull().default("qr"),
    amount: integer("amount").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("scans_venue_idx").on(t.venueId), index("scans_created_idx").on(t.createdAt)],
);

export const notifications = mb.table(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    // token | order | event | reward | system
    kind: text("kind").notNull().default("system"),
    href: text("href"),
    read: boolean("read").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId)],
);

/** Sessions de l'authentification maison (remplacées par GoTrue si Supabase Auth prend la main). */
export const sessions = mb.table(
  "sessions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Empreinte SHA-256 du jeton de session : le jeton clair ne vit que dans le cookie. */
    tokenHash: text("token_hash").notNull().unique(),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/**
 * Les écrans d'une salle.
 *
 * Un navigateur ne peut pas parcourir le réseau local — c'est un interdit
 * volontaire, sans quoi n'importe quel site cartographierait le wifi de qui le
 * visite. Le dashboard ne peut donc pas « découvrir » les téléviseurs : ce sont
 * eux qui s'annoncent. Un écran ouvre /ecran, affiche un code, et le gérant
 * l'adopte depuis son tableau de bord.
 *
 * Tant qu'il n'est pas adopté, `venue_id` est nul : la ligne n'appartient à
 * personne et ne montre rien.
 */
export const screens = mb.table(
  "screens",
  {
    id: id(),
    /** Nul tant que l'écran n'a pas été adopté par une salle. */
    venueId: uuid("venue_id").references(() => venues.id, { onDelete: "cascade" }),
    /** Le nom que lui donne le gérant : « Bar gauche », « Fond de salle ». */
    name: text("name").notNull().default(""),
    /** Ce que l'écran doit montrer ; nul = veille. */
    streamId: uuid("stream_id").references(() => streams.id, { onDelete: "set null" }),
    /**
     * Code d'appairage affiché sur le téléviseur, à recopier dans le dashboard.
     * Effacé une fois l'écran adopté : il ne sert qu'une fois.
     */
    pairingCode: text("pairing_code").unique(),
    /** Le code expire : un téléviseur oublié allumé ne reste pas adoptable. */
    pairingExpiresAt: timestamp("pairing_expires_at", { withTimezone: true }),
    /** Empreinte SHA-256 du jeton que l'écran garde ; le jeton clair ne vit que sur l'écran. */
    tokenHash: text("token_hash").notNull().unique(),
    /** Dernier signe de vie : c'est lui qui décide de « en ligne », pas un ping. */
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("screens_venue_idx").on(t.venueId)],
);

/* ------------------------------------------------------------ abonnements */

/**
 * Les formules d'abonnement.
 *
 * Une table plutôt que des constantes : un tarif d'abonnement se révise, et
 * il se révise depuis l'administration, pas depuis un déploiement.
 */
export const memberPlans = mb.table("member_plans", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** Durée achetée, en mois. */
  months: integer("months").notNull().default(1),
  price: integer("price").notNull(),
  /** Ce que la formule apporte, une ligne par avantage, séparées par « | ». */
  perks: text("perks").notNull().default(""),
  hint: text("hint").notNull().default(""),
  badge: text("badge"),
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const memberships = mb.table(
  "memberships",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    planId: uuid("plan_id").references(() => memberPlans.id, { onDelete: "set null" }),
    /** Ce que l'abonné a payé et pour combien de mois, figés à l'achat. */
    months: integer("months").notNull().default(1),
    price: integer("price").notNull().default(0),
    // pending | paid | failed | expired
    status: text("status").notNull().default("pending"),
    reference: text("reference").unique(),
    /** Bornes effectives, posées à la confirmation du paiement. */
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("memberships_user_idx").on(t.userId)],
);

/* ----------------------------------------------------------------- amis */

/**
 * Le lien entre deux joueurs.
 *
 * Une seule ligne par paire, orientée par qui a demandé : c'est ce qui permet
 * de savoir à qui revient la réponse. L'index unique interdit les doublons
 * dans un sens ; le code vérifie l'autre avant d'insérer.
 */
/**
 * Un défi entre deux joueurs.
 *
 * Jusqu'ici, seul le comptoir créait un match : deux joueurs qui voulaient se
 * mesurer devaient trouver un gérant disponible, alors que le jeton, lui, est
 * automatisé depuis longtemps. Le défi est l'étape qui manquait — on repère
 * quelqu'un au classement, on lui propose une salle, il accepte ou propose
 * autre chose, et la rencontre naît d'elle-même.
 *
 * Le lieu se négocie : `venueId` porte la dernière proposition et `lieuParId`
 * dit de qui elle vient. Celui qui doit répondre est toujours l'autre — sans
 * cette paire, on ne saurait pas qui attend qui.
 */
export const challenges = mb.table(
  "challenges",
  {
    id: id(),
    fromId: uuid("from_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toId: uuid("to_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** La salle proposée pour jouer. */
    venueId: uuid("venue_id").references(() => venues.id, { onDelete: "set null" }),
    /** Qui a proposé ce lieu — l'autre est celui qui doit répondre. */
    lieuParId: uuid("lieu_par_id").references(() => users.id, { onDelete: "set null" }),
    // 8-ball | 9-ball | snooker | killer
    kind: text("kind").notNull().default("8-ball"),
    /** Parties gagnantes : 1 pour une sèche, N pour une course. */
    target: integer("target").notNull().default(1),
    message: text("message").notNull().default(""),
    // propose | accepte | refuse | annule
    status: text("status").notNull().default("propose"),
    /** La rencontre née du défi, une fois accepté. */
    matchId: uuid("match_id").references(() => matches.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("challenges_to_idx").on(t.toId, t.status),
    index("challenges_from_idx").on(t.fromId, t.status),
  ],
);

export const friendships = mb.table(
  "friendships",
  {
    id: id(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addresseeId: uuid("addressee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // attente | acceptee | refusee | bloquee
    status: text("status").notNull().default("attente"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("friendships_paire_idx").on(t.requesterId, t.addresseeId),
    index("friendships_addressee_idx").on(t.addresseeId),
  ],
);

/**
 * Un abonnement Web Push, tel que le navigateur le remet.
 *
 * L'endpoint identifie le navigateur : il change à chaque réinstallation, et
 * un même compte peut en avoir plusieurs — téléphone, ordinateur, tablette.
 */
export const pushSubscriptions = mb.table(
  "push_subscriptions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /**
     * Par où passe l'envoi : `web` pour le protocole standard, que l'on signe
     * nous-mêmes, `fcm` pour un jeton d'enregistrement Firebase. Les deux
     * cohabitent — un compte peut avoir un téléphone enregistré d'une façon
     * et un ordinateur de l'autre, selon ce qui était configuré ce jour-là.
     */
    provider: text("provider").notNull().default("web"),
    /** L'adresse de livraison : l'endpoint du navigateur, ou le jeton FCM. */
    endpoint: text("endpoint").notNull().unique(),
    /** Les clés de chiffrement du protocole standard. Vides pour un jeton FCM. */
    p256dh: text("p256dh").notNull().default(""),
    auth: text("auth").notNull().default(""),
    userAgent: text("user_agent").notNull().default(""),
    /** Dernier envoi accepté : un endpoint mort finit par être retiré. */
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("push_user_idx").on(t.userId)],
);

/* -------------------------------------------------------------- retraits */

/**
 * Une demande de retrait, puis son versement.
 *
 * La salle encaisse par la plateforme : les jetons, les billets et les droits
 * d'inscription arrivent sur le compte Mobile Money de Master Break, pas sur
 * le sien. Sans cette table, l'argent d'un gérant n'avait aucun chemin de
 * retour.
 */
export const payouts = mb.table(
  "payouts",
  {
    id: id(),
    /** La salle dont le solde est ponctionné — nul pour un vendeur. */
    venueId: uuid("venue_id").references(() => venues.id, { onDelete: "set null" }),
    /** Le bénéficiaire : le gérant qui demande, ou le vendeur. */
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    amount: integer("amount").notNull(),
    // om | momo | especes | virement
    method: text("method").notNull().default("momo"),
    phone: text("phone").notNull().default(""),
    // demande | paye | refuse
    status: text("status").notNull().default("demande"),
    note: text("note").notNull().default(""),
    /** Référence du versement chez l'opérateur, saisie par l'administration. */
    reference: text("reference").notNull().default(""),
    processedBy: uuid("processed_by").references(() => users.id, { onDelete: "set null" }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("payouts_venue_idx").on(t.venueId), index("payouts_user_idx").on(t.userId)],
);

/* ------------------------------------------------ groupes et invitations */

/**
 * Un groupe de billard : une bande qui se donne un nom.
 *
 * Rien à voir avec une équipe de tournoi — c'est le groupe d'amis qui se
 * retrouve le jeudi soir. Le nom et la photo suffisent à le faire exister ;
 * ce qu'il apportera ensuite se décidera en le voyant vivre.
 */
export const crews = mb.table("crews", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  image: text("image").notNull().default(""),
  devise: text("devise").notNull().default(""),
  /** Le fondateur, qui reste chef tant qu'il ne passe pas la main. */
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  /** La salle où la bande se retrouve, quand elle en a une. */
  venueId: uuid("venue_id").references(() => venues.id, { onDelete: "set null" }),
  /**
   * Qui peut entrer : `ouvert` (on se sert), `approbation` (le chef tranche),
   * `invitation` (on n'entre que si l'on est invité).
   *
   * Sans ce réglage, n'importe qui touchait « Rejoindre » et se retrouvait
   * dans la bande — une porte sans serrure. Le défaut reste ouvert, parce que
   * c'est ainsi que les groupes existants fonctionnaient.
   */
  access: text("access").notNull().default("ouvert"),
  /**
   * Le lien de la communauté — WhatsApp, Telegram, ce que la bande utilise.
   *
   * Une bande de billard vit d'abord dans un groupe de discussion : le lui
   * refuser, c'est l'obliger à se coordonner ailleurs et à oublier
   * l'application.
   */
  lien: text("lien").notNull().default(""),
  createdAt: createdAt(),
});

export const crewMembers = mb.table(
  "crew_members",
  {
    id: id(),
    crewId: uuid("crew_id")
      .notNull()
      .references(() => crews.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // chef | membre
    role: text("role").notNull().default("membre"),
    // invite | demande | membre | parti
    status: text("status").notNull().default("membre"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("crew_members_paire_idx").on(t.crewId, t.userId), index("crew_members_user_idx").on(t.userId)],
);

/**
 * « Rejoins-moi, je joue au Break Akwa. »
 *
 * Une ligne par destinataire, même quand l'invitation part à tout un groupe :
 * chacun répond pour soi, et l'expéditeur voit qui vient. `batchId` les
 * rassemble, pour n'afficher qu'un envoi côté expéditeur.
 */
export const invitations = mb.table(
  "invitations",
  {
    id: id(),
    /** Tous les destinataires d'un même envoi partagent cet identifiant. */
    batchId: uuid("batch_id").notNull(),
    fromId: uuid("from_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toId: uuid("to_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Où l'on se retrouve. */
    venueId: uuid("venue_id").references(() => venues.id, { onDelete: "set null" }),
    /** La partie en cours, quand l'invitation en part. */
    matchId: uuid("match_id").references(() => matches.id, { onDelete: "set null" }),
    /** Le groupe au nom duquel elle est lancée. */
    crewId: uuid("crew_id").references(() => crews.id, { onDelete: "set null" }),
    message: text("message").notNull().default(""),
    // envoyee | acceptee | refusee
    status: text("status").notNull().default("envoyee"),
    createdAt: createdAt(),
  },
  (t) => [index("invitations_to_idx").on(t.toId), index("invitations_batch_idx").on(t.batchId)],
);

export type Screen = typeof screens.$inferSelect;
export type Venue = typeof venues.$inferSelect;
export type User = typeof users.$inferSelect;
export type Pack = typeof packs.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type VenueTable = typeof venueTables.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type MatchEvent = typeof matchEvents.$inferSelect;
export type MatchOfficial = typeof matchOfficials.$inferSelect;
export type Stream = typeof streams.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type StreamPass = typeof streamPasses.$inferSelect;
export type Token = typeof tokens.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Crew = typeof crews.$inferSelect;
export type CrewMember = typeof crewMembers.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type Friendship = typeof friendships.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type Payout = typeof payouts.$inferSelect;
export type MemberPlan = typeof memberPlans.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Tournament = typeof tournaments.$inferSelect;
export type TournamentPlayer = typeof tournamentPlayers.$inferSelect;
export type TournamentMatch = typeof tournamentMatches.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type Scan = typeof scans.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Session = typeof sessions.$inferSelect;
