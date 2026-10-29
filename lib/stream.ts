import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, matches, streamPasses, streams, users, venues, type Stream, type User } from "@/db";
import { signPass, verifyPass } from "@/lib/pass";

/**
 * Master Break Live — la vidéo.
 *
 * Le serveur média est MediaMTX, posé sur le même VPS que Supabase. Il ingère
 * en RTMP (OBS, caméra IP) et en WHIP (le navigateur d'un téléphone), et
 * diffuse en HLS et en WebRTC. Il ne décide rien tout seul : à chaque connexion
 * il demande à cette application si elle autorise, via son crochet HTTP —
 * l'autorisation vit donc au même endroit que le reste des droits.
 */

const env = (key: string, fallback = "") => process.env[key]?.trim() || fallback;

export const media = () => ({
  /** Adresse publique du serveur média, vue depuis un navigateur. */
  publicUrl: env("MB_MEDIA_URL", "http://localhost:8888").replace(/\/+$/, ""),
  /** Adresse d'ingestion RTMP, montrée au diffuseur. */
  rtmpUrl: env("MB_MEDIA_RTMP", "rtmp://localhost:1935"),
  /** Adresse WHIP (WebRTC), pour diffuser depuis un navigateur. */
  whipUrl: env("MB_MEDIA_WHIP", env("MB_MEDIA_URL", "http://localhost:8889")).replace(/\/+$/, ""),
  /** Secret partagé avec MediaMTX pour son crochet d'authentification. */
  hookSecret: env("MB_MEDIA_HOOK_SECRET"),
  configured: Boolean(env("MB_MEDIA_URL")),
});

/** Durée d'un billet de lecture. Court : le lecteur en redemande un tout seul. */
const TICKET_TTL = 4 * 3600;

export type StreamLevel = "phone" | "venue" | "production";
export type StreamAccess = "free" | "members" | "ppv";

export const levelLabel: Record<StreamLevel, string> = {
  phone: "Téléphone",
  venue: "Caméra de salle",
  production: "Production",
};

export const accessLabel: Record<StreamAccess, string> = {
  free: "Accès libre",
  members: "Abonnés",
  ppv: "Billet vidéo",
};

/* ------------------------------------------------------------------ adresses */

/** URL HLS, la lecture qui passe partout. */
export const hlsUrl = (stream: Pick<Stream, "path">, ticket: string) =>
  `${media().publicUrl}/${stream.path}/index.m3u8?mb=${encodeURIComponent(ticket)}`;

/** URL WHEP, la lecture basse latence quand le navigateur suit. */
export const whepUrl = (stream: Pick<Stream, "path">, ticket: string) =>
  `${media().whipUrl}/${stream.path}/whep?mb=${encodeURIComponent(ticket)}`;

/** Ce qu'on colle dans OBS : serveur + clé. */
export const ingest = (stream: Pick<Stream, "path" | "streamKey">) => ({
  server: `${media().rtmpUrl}/${stream.path}`,
  key: stream.streamKey,
  /** Depuis un navigateur : WHIP, avec la clé en jeton porteur. */
  whip: `${media().whipUrl}/${stream.path}/whip`,
});

export const newStreamKey = () => randomBytes(24).toString("base64url");

/** Chemin lisible et unique : `salle-slug-a1b2c3`. */
export function newStreamPath(slug: string): string {
  const base = slug.replace(/[^a-z0-9-]/gi, "-").toLowerCase().slice(0, 32) || "live";
  return `${base}-${randomBytes(3).toString("hex")}`;
}

/* ------------------------------------------------------------------ billets */

/**
 * Billet de lecture signé. Il porte le spectateur et le direct : MediaMTX nous
 * le renverra tel quel, et c'est ce qui nous permet de refuser une URL partagée
 * pour un direct payant.
 */
export const watchTicket = (streamId: string, userId: string) =>
  signPass({ k: "score", i: streamId, c: "watch", u: userId }, TICKET_TTL);

export type TicketCheck = { ok: true; streamId: string; userId: string } | { ok: false; reason: string };

export function readTicket(raw: string): TicketCheck {
  const check = verifyPass(raw);
  if (!check.ok) return { ok: false, reason: check.reason === "expired" ? "billet expiré" : "billet invalide" };
  if (check.claims.c !== "watch") return { ok: false, reason: "billet invalide" };
  return { ok: true, streamId: check.claims.i, userId: check.claims.u };
}

/* ------------------------------------------------------------------- accès */

export type Access =
  | { ok: true; as: "free" | "member" | "ticket" | "owner" }
  | { ok: false; reason: "members" | "ppv"; price: number };

/**
 * Qui peut regarder. Un seul endroit, comme pour l'arbitrage : la page, le
 * lecteur et le crochet de MediaMTX posent tous la même question.
 */
export async function canWatch(user: User, stream: Stream): Promise<Access> {
  if (user.role === "admin") return { ok: true, as: "owner" };
  if (user.role === "manager" && user.venueId === stream.venueId) return { ok: true, as: "owner" };
  if (stream.access === "free") return { ok: true, as: "free" };

  const member = user.memberUntil && user.memberUntil.getTime() > Date.now();
  if (stream.access === "members") {
    return member ? { ok: true, as: "member" } : { ok: false, reason: "members", price: 0 };
  }

  // Un abonné entre aussi sur les directs payants : c'est l'intérêt de l'abonnement.
  if (member) return { ok: true, as: "member" };

  const pass = (
    await db
      .select({ id: streamPasses.id })
      .from(streamPasses)
      .where(
        and(
          eq(streamPasses.streamId, stream.id),
          eq(streamPasses.userId, user.id),
          eq(streamPasses.status, "paid"),
        ),
      )
      .limit(1)
  )[0];

  return pass ? { ok: true, as: "ticket" } : { ok: false, reason: "ppv", price: stream.price };
}

/* ----------------------------------------------------------------- lectures */

export type StreamCard = {
  stream: Stream;
  venue: { name: string; slug: string; image: string };
  match: { id: string; a: string; b: string; scoreA: number; scoreB: number } | null;
};

export async function hydrate(rows: Stream[]): Promise<StreamCard[]> {
  if (rows.length === 0) return [];

  const venueIds = [...new Set(rows.map((s) => s.venueId))];
  const matchIds = rows.map((s) => s.matchId).filter((x): x is string => Boolean(x));

  const [halls, games] = await Promise.all([
    db
      .select({ id: venues.id, name: venues.name, slug: venues.slug, image: venues.image })
      .from(venues)
      .where(inArray(venues.id, venueIds)),
    matchIds.length ? db.select().from(matches).where(inArray(matches.id, matchIds)) : Promise.resolve([]),
  ]);

  const playerIds = [...new Set(games.flatMap((m) => [m.playerAId, m.playerBId]))];
  const people = playerIds.length
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, playerIds))
    : [];
  const name = (id: string) => people.find((p) => p.id === id)?.name ?? "Joueur";

  return rows.map((stream) => {
    const game = games.find((m) => m.id === stream.matchId);
    return {
      stream,
      venue: halls.find((v) => v.id === stream.venueId) ?? {
        name: "Salle",
        slug: "",
        image: "/img/hall-dark.jpg",
      },
      match: game
        ? { id: game.id, a: name(game.playerAId), b: name(game.playerBId), scoreA: game.scoreA, scoreB: game.scoreB }
        : null,
    };
  });
}

export async function getLiveStreams(): Promise<{ live: StreamCard[]; replays: StreamCard[] }> {
  const [live, replays] = await Promise.all([
    db.select().from(streams).where(eq(streams.status, "live")).orderBy(desc(streams.startedAt)),
    db
      .select()
      .from(streams)
      .where(and(eq(streams.status, "ended"), inArray(streams.access, ["free", "members", "ppv"])))
      .orderBy(desc(streams.endedAt))
      .limit(12),
  ]);

  const [l, r] = await Promise.all([hydrate(live), hydrate(replays)]);
  return { live: l, replays: r };
}

export async function getStream(id: string): Promise<StreamCard | null> {
  const row = (await db.select().from(streams).where(eq(streams.id, id)).limit(1))[0];
  if (!row) return null;
  return (await hydrate([row]))[0] ?? null;
}

export async function getStreamByPath(path: string): Promise<Stream | null> {
  return (await db.select().from(streams).where(eq(streams.path, path)).limit(1))[0] ?? null;
}

export async function getVenueStreams(venueId: string): Promise<StreamCard[]> {
  const rows = await db
    .select()
    .from(streams)
    .where(eq(streams.venueId, venueId))
    .orderBy(desc(streams.updatedAt))
    .limit(20);
  return hydrate(rows);
}

/** Signature du tableau des directs, pour le flux SSE. */
export async function streamSignature(): Promise<string> {
  const rows = await db
    .select({ id: streams.id, at: streams.updatedAt, viewers: streams.viewers })
    .from(streams)
    .where(inArray(streams.status, ["live", "idle"]));
  return rows
    .map((r) => `${r.id}:${r.at.getTime()}:${r.viewers}`)
    .sort()
    .join("|");
}

/* ------------------------------------------------------------- la vitrine */

export const disciplineLabel: Record<string, string> = {
  "8-ball": "8-ball",
  "9-ball": "9-ball",
  snooker: "Snooker",
  killer: "Killer",
  ambiance: "Ambiance de salle",
};

export type Shelf = { id: string; title: string; href: string; cards: StreamCard[] };
export type Rubric = { id: string; label: string; image: string; live: number };

/**
 * La vitrine des directs, en rayons — comme une page de chaînes.
 *
 * Un même direct peut apparaître dans plusieurs rayons : c'est voulu, on range
 * par angle d'entrée (ce qui se joue, la salle, la discipline), pas par
 * exclusivité.
 */
/**
 * Ce qui passe à l'instant, pour la bande de l'accueil.
 *
 * Partagé entre la page et son flux SSE : deux calculs séparés finiraient par
 * diverger, et l'accueil annoncerait autre chose que ce qu'il montre une
 * seconde plus tard.
 */
export async function getDirectsEnCours() {
  const rows = await db
    .select({ stream: streams, venue: venues })
    .from(streams)
    .innerJoin(venues, eq(venues.id, streams.venueId))
    .where(eq(streams.status, "live"))
    .orderBy(desc(streams.viewers))
    .limit(8);

  // Le match filmé, quand il y en a un : les joueurs et le score font
  // l'affiche de l'accueil.
  const matchIds = rows.map((r) => r.stream.matchId).filter((x): x is string => Boolean(x));
  const jeux = matchIds.length ? await db.select().from(matches).where(inArray(matches.id, matchIds)) : [];
  const joueurIds = [...new Set(jeux.flatMap((m) => [m.playerAId, m.playerBId]))];
  const gens = joueurIds.length
    ? await db.select({ id: users.id, name: users.name, avatar: users.avatar }).from(users).where(inArray(users.id, joueurIds))
    : [];
  const qui = (id: string) => {
    const g = gens.find((p) => p.id === id);
    return { nom: g?.name ?? "Joueur", avatar: g?.avatar ?? null };
  };

  return {
    total: rows.length,
    spectateurs: rows.reduce((n, r) => n + r.stream.viewers, 0),
    directs: rows.map(({ stream, venue }) => {
      const jeu = jeux.find((m) => m.id === stream.matchId);
      return {
        id: stream.id,
        titre: stream.title,
        salle: venue.name,
        logo: venue.logo,
        image: stream.poster ?? venue.image,
        rubrique: disciplineLabel[stream.discipline] ?? stream.discipline,
        spectateurs: stream.viewers,
        match: jeu
          ? {
              etiquette: jeu.label,
              course: jeu.target,
              a: { ...qui(jeu.playerAId), score: jeu.scoreA, aLaTable: jeu.turnId === jeu.playerAId },
              b: { ...qui(jeu.playerBId), score: jeu.scoreB, aLaTable: jeu.turnId === jeu.playerBId },
            }
          : null,
      };
    }),
  };
}

export type Encours = Awaited<ReturnType<typeof getDirectsEnCours>>;

/**
 * Les dernières rediffusions, pour l'accueil quand aucune caméra ne tourne :
 * on n'a rien en direct, on propose de revoir.
 */
export async function dernieresRediffusions(limite = 4) {
  const rows = await db
    .select({ stream: streams, venue: venues })
    .from(streams)
    .innerJoin(venues, eq(venues.id, streams.venueId))
    .where(eq(streams.status, "ended"))
    .orderBy(desc(streams.endedAt))
    .limit(limite);

  return rows.map(({ stream, venue }) => ({
    id: stream.id,
    titre: stream.title,
    salle: venue.name,
    image: stream.poster ?? venue.image,
    finiLe: stream.endedAt?.getTime() ?? null,
    minutes:
      stream.startedAt && stream.endedAt
        ? Math.max(1, Math.round((stream.endedAt.getTime() - stream.startedAt.getTime()) / 60000))
        : null,
    vues: stream.peakViewers,
  }));
}

export type Rediffusion = Awaited<ReturnType<typeof dernieresRediffusions>>[number];

export async function getShowcase(): Promise<{
  featured: StreamCard[];
  rail: StreamCard[];
  shelves: Shelf[];
  rubrics: Rubric[];
  replays: StreamCard[];
}> {
  const rows = await db
    .select()
    .from(streams)
    .where(inArray(streams.status, ["live", "idle", "ended"]))
    .orderBy(desc(streams.viewers), desc(streams.updatedAt))
    .limit(60);

  const cards = await hydrate(rows);
  const live = cards.filter((c) => c.stream.status === "live");
  const replays = cards.filter((c) => c.stream.status === "ended").slice(0, 12);

  const shelves: Shelf[] = [];
  const push = (id: string, title: string, list: StreamCard[]) => {
    if (list.length > 0) shelves.push({ id, title, href: `/direct?rayon=${id}`, cards: list });
  };

  push("matchs", "Matchs en direct", live.filter((c) => c.match));
  push("venue", "Venue Cast — l'ambiance des salles", live.filter((c) => c.stream.level === "venue"));
  push("production", "Productions et tournois", live.filter((c) => c.stream.level === "production"));

  // Par discipline. Un rayon d'une seule vignette fait pauvre : en dessous de
  // deux, la discipline reste accessible par les étiquettes des cartes.
  for (const discipline of ["8-ball", "9-ball", "snooker", "killer"]) {
    const list = live.filter((c) => c.stream.discipline === discipline);
    if (list.length >= 2) push(discipline, disciplineLabel[discipline] ?? discipline, list);
  }

  // Par salle : la vitrine d'un soir se lit aussi par lieu.
  const byVenue = new Map<string, StreamCard[]>();
  for (const card of live) {
    const list = byVenue.get(card.venue.slug) ?? [];
    list.push(card);
    byVenue.set(card.venue.slug, list);
  }
  for (const [slug, list] of byVenue) {
    if (list.length >= 2) push(`salle-${slug}`, list[0].venue.name, list);
  }

  const rubrics: Rubric[] = Object.entries(disciplineLabel).map(([id, label]) => ({
    id,
    label,
    image:
      live.find((c) => c.stream.discipline === id)?.stream.poster ??
      cards.find((c) => c.stream.discipline === id)?.stream.poster ??
      "/img/table-blue.jpg",
    live: live.filter((c) => c.stream.discipline === id).length,
  }));

  return {
    featured: live.slice(0, 5),
    rail: live,
    shelves,
    rubrics,
    replays,
  };
}


/* --------------------------------------------------------------- diffuseur */

export type SoldeDiffuseur = { brut: number; commission: number; net: number; billets: number };

/**
 * Ce qu'un direct a rapporté à celui qui l'a tenu.
 *
 * Les billets vidéo n'allaient nulle part : ils se payaient, et l'argent
 * restait sans propriétaire. Il revient maintenant à celui qui filme, moins la
 * part de la maison — ce qui donne une raison de poser son téléphone sur un
 * trépied un mardi soir.
 */
export async function getSoldeDiffuseur(hostId: string): Promise<SoldeDiffuseur> {
  const { db, streamPasses } = await import("@/db");
  const { and, eq, sql } = await import("drizzle-orm");

  const ligne = (
    await db
      .select({
        brut: sql<number>`coalesce(sum(${streamPasses.amount}), 0)`,
        commission: sql<number>`coalesce(sum(${streamPasses.commission}), 0)`,
        billets: sql<number>`count(*)`,
      })
      .from(streamPasses)
      .where(and(eq(streamPasses.hostId, hostId), eq(streamPasses.status, "paid")))
  )[0];

  const brut = Number(ligne?.brut ?? 0);
  const commission = Number(ligne?.commission ?? 0);
  return { brut, commission, net: brut - commission, billets: Number(ligne?.billets ?? 0) };
}

/** Les directs qu'un joueur a ouverts lui-même. */
export async function getStreamsDuJoueur(userId: string) {
  const { db, streams, venues } = await import("@/db");
  const { desc, eq } = await import("drizzle-orm");

  return db
    .select({ stream: streams, venue: venues })
    .from(streams)
    .leftJoin(venues, eq(venues.id, streams.venueId))
    .where(eq(streams.createdBy, userId))
    .orderBy(desc(streams.createdAt));
}
