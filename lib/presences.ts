import "server-only";
import { and, eq, gt, inArray } from "drizzle-orm";
import { db, matches, presences, reservations, users } from "@/db";

/**
 * Qui joue en ce moment dans une salle.
 *
 * Trois façons d'y être, sans rien inventer : s'être signalé présent (et ne
 * pas être reparti), avoir une partie en direct sur une table, ou être
 * installé à une table réservée. Un même joueur ne compte qu'une fois.
 */
export type Actif = {
  id: string;
  name: string;
  avatar: string | null;
  points: number;
  // present | en_jeu | a_table
  comment: "present" | "en_jeu" | "a_table";
};

const ORDRE = { en_jeu: 0, a_table: 1, present: 2 } as const;

async function lignes(venueIds?: string[]) {
  const now = new Date();
  const surSalles = <T,>(col: T) => (venueIds ? inArray(col as never, venueIds) : undefined);
  const [pres, enJeu, aTable] = await Promise.all([
    db
      .select({ venueId: presences.venueId, userId: presences.userId })
      .from(presences)
      .where(and(gt(presences.expiresAt, now), surSalles(presences.venueId))),
    db
      .select({ venueId: matches.venueId, a: matches.playerAId, b: matches.playerBId })
      .from(matches)
      .where(and(eq(matches.status, "live"), surSalles(matches.venueId))),
    db
      .select({ venueId: reservations.venueId, userId: reservations.userId })
      .from(reservations)
      .where(and(eq(reservations.status, "seated"), surSalles(reservations.venueId))),
  ]);
  const out: { venueId: string; userId: string; comment: Actif["comment"] }[] = [];
  for (const r of enJeu) {
    out.push({ venueId: r.venueId, userId: r.a, comment: "en_jeu" });
    out.push({ venueId: r.venueId, userId: r.b, comment: "en_jeu" });
  }
  for (const r of aTable) out.push({ venueId: r.venueId, userId: r.userId, comment: "a_table" });
  for (const r of pres) out.push({ venueId: r.venueId, userId: r.userId, comment: "present" });
  return out;
}

/** Le nombre de joueurs actifs, salle par salle. */
export async function comptesActifs(venueIds?: string[]): Promise<Map<string, number>> {
  const parSalle = new Map<string, Set<string>>();
  for (const l of await lignes(venueIds)) {
    if (!parSalle.has(l.venueId)) parSalle.set(l.venueId, new Set());
    parSalle.get(l.venueId)!.add(l.userId);
  }
  return new Map([...parSalle].map(([v, s]) => [v, s.size]));
}

/** Les joueurs actifs d'une salle, ceux qui jouent d'abord. */
export async function joueursActifs(venueId: string): Promise<Actif[]> {
  const meilleur = new Map<string, Actif["comment"]>();
  for (const l of await lignes([venueId])) {
    const avant = meilleur.get(l.userId);
    if (!avant || ORDRE[l.comment] < ORDRE[avant]) meilleur.set(l.userId, l.comment);
  }
  if (meilleur.size === 0) return [];
  const qui = await db
    .select({ id: users.id, name: users.name, avatar: users.avatar, points: users.points })
    .from(users)
    .where(inArray(users.id, [...meilleur.keys()]));
  return qui
    .map((u) => ({ ...u, comment: meilleur.get(u.id)! }))
    .sort((a, b) => ORDRE[a.comment] - ORDRE[b.comment] || b.points - a.points);
}

/** La présence en cours du joueur, s'il s'est signalé quelque part. */
export async function maPresence(userId: string) {
  return (
    await db
      .select()
      .from(presences)
      .where(and(eq(presences.userId, userId), gt(presences.expiresAt, new Date())))
      .limit(1)
  )[0] ?? null;
}
