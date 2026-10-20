/**
 * Démo locale : un tournoi mixte de 88 joueurs — 64 hommes et 24 dames, deux
 * tableaux sous la même affiche, en poules. `npx tsx scripts/demo-mixte.ts`
 *
 * Pour voir les écrans d'un vrai tournoi sans attendre qu'il ait lieu. Ne
 * jamais lancer sur la base de production : il crée 88 comptes de test.
 */
import { loadEnv } from "../db/env";
loadEnv();

async function main() {
  const { createDb } = await import("../db/client");
  const { events, tournaments, tournamentPlayers, tournamentMatches, users, venues, matchOfficials } = await import("../db/schema");
  const db = createDb();
  const { hashPassword } = await import("../lib/password");
  const { tirerLesPoules, noterResultat, ouvrirLeTableau } = await import("../lib/tournoi-moteur");
  const { eq, like, and } = await import("drizzle-orm");
  const { randomUUID: uid } = await import("node:crypto");

  if (/vps\.buyticle|supabase-db/.test(process.env.DATABASE_URL ?? "")) throw new Error("Pas sur la production.");

  const salle = (await db.select().from(venues).limit(1))[0];
  const hash = await hashPassword("masterbreak");
  const photos = ["/img/p-ariel.jpg", "/img/p-yannick.jpg", "/img/p-champion.jpg", "/img/coach-1.jpg", "/img/coach-2.jpg", "/img/player-cut.jpg"];
  const prenomsH = ["Arnaud", "Brice", "Cédric", "Didier", "Eric", "Franck", "Gaël", "Hervé", "Ivan", "Junior", "Kevin", "Landry", "Marcel", "Nathan", "Olivier", "Patrick"];
  const prenomsF = ["Aïcha", "Brenda", "Carine", "Diane", "Estelle", "Flora", "Grace", "Hélène", "Inès", "Josiane", "Kelly", "Laura"];
  const noms = ["N.", "M.", "T.", "K.", "B.", "E.", "F.", "A."];

  // Nettoyage d'un passage précédent.
  await db.delete(tournaments).where(like(tournaments.slug, "madiba-demo%"));
  await db.delete(events).where(like(events.slug, "madiba-demo%"));
  await db.delete(users).where(like(users.phone, "6990%"));

  const creer = async (n: number, prenoms: string[], prefixe: string) => {
    const lignes = Array.from({ length: n }, (_, i) => ({
      id: uid(),
      code: String(100000 + Math.floor(Math.random() * 899999)),
      passwordHash: hash,
      name: `${prenoms[i % prenoms.length]} ${noms[Math.floor(i / prenoms.length) % noms.length]}`,
      phone: `6990${prefixe}${String(i).padStart(4, "0")}`,
      avatar: i % 3 === 0 ? photos[i % photos.length] : null,
      role: "client" as const,
      points: 1500 - i * 13,
      venueId: null,
    }));
    await db.insert(users).values(lignes);
    return lignes;
  };
  const hommes = await creer(64, prenomsH, "1");
  const dames = await creer(24, prenomsF, "2");

  const eventId = uid();
  const debut = new Date(Date.now() + 3 * 86_400_000);
  await db.insert(events).values({
    id: eventId, slug: "madiba-demo-spectateurs", title: "Madiba Pool Tournament", subtitle: "Tournoi 8-ball · Hommes 64 · Dames 24",
    day: "du samedi au dimanche", hours: "14:00 → 23:00", checkin: "dès 13:30", venueId: salle.id, price: 1000,
    image: "/img/hall-neon.jpg", capacity: 100, attendees: 0, description: "Le grand tournoi mixte de Douala.", tags: "tournoi", active: true,
  });

  // Trois arbitres, annoncés pour l'événement.
  const arbitres = await creer(3, ["Roger", "Simon", "Thierry"], "3");
  await db.insert(matchOfficials).values(arbitres.map((a) => ({ id: uid(), eventId, userId: a.id, role: "referee" })));

  const tournoi = async (slug: string, title: string, category: string, parentId: string | null, joueurs: typeof hommes, avance: boolean) => {
    const id = uid();
    await db.insert(tournaments).values({
      id, slug, title, eventId, venueId: salle.id, discipline: "8-ball", format: "poules", groupSize: 4, qualifiers: 2,
      size: joueurs.length, category, parentId, raceTo: 3, entryFee: 0, prizePool: category === "hommes" ? 600000 : 280000,
      cagnottes: [], presentation: "", prizeSplit: "", rules: "", image: "/img/hall-neon.jpg", status: "complet",
      startsAt: debut, endsAt: new Date(debut.getTime() + 86_400_000),
    });
    await db.insert(tournamentPlayers).values(
      joueurs.map((u) => ({ id: uid(), tournamentId: id, userId: u.id, nickname: u.name, phone: u.phone, level: "intermediaire", note: "", status: "accepte", fee: 0, payment: "paye" })),
    );
    const r = await tirerLesPoules(db, id);
    if (!r.ok) throw new Error(r.error);
    // Une partie des duels de poule joués, pour voir des classements vivants.
    const duels = await db.select().from(tournamentMatches).where(and(eq(tournamentMatches.tournamentId, id), eq(tournamentMatches.stage, "poule")));
    for (const [i, d] of duels.entries()) {
      // Les duels qui restent à jouer reçoivent un arbitre et une table.
      if (!avance && i % 3 === 2) {
        await db.update(tournamentMatches).set({ refereeId: arbitres[i % 3].id, tableLabel: String((i % 8) + 1) }).where(eq(tournamentMatches.id, d.id));
        continue;
      }
      const aGagne = (i * 7) % 5 < 3;
      await noterResultat(db, d.id, aGagne ? 3 : i % 3, aGagne ? i % 3 : 3);
      if (avance) await db.update(tournamentMatches).set({ refereeId: arbitres[i % 3].id }).where(eq(tournamentMatches.id, d.id));
    }
    if (avance) {
      // Poules finies : on ouvre le tableau final et on joue la moitié du premier tour.
      const o = await ouvrirLeTableau(db, id);
      if (!o.ok) throw new Error(o.error);
      const tour1 = await db.select().from(tournamentMatches).where(and(eq(tournamentMatches.tournamentId, id), eq(tournamentMatches.stage, "tableau"), eq(tournamentMatches.round, 1)));
      for (const [i, d] of tour1.entries()) {
        if (!d.playerAId || !d.playerBId) continue;
        if (i % 2 === 0) {
          await noterResultat(db, d.id, 3, i % 3);
          await db.update(tournamentMatches).set({ refereeId: arbitres[i % 3].id }).where(eq(tournamentMatches.id, d.id));
        } else {
          await db.update(tournamentMatches).set({ refereeId: arbitres[i % 3].id, tableLabel: String((i % 8) + 1) }).where(eq(tournamentMatches.id, d.id));
        }
      }
    }
    return { id, poules: r.poules, duels: r.duels };
  };

  const h = await tournoi("madiba-demo", "Madiba Pool Tournament", "hommes", null, hommes, true);
  const d = await tournoi("madiba-demo-dames", "Madiba Pool Tournament", "dames", h.id, dames, false);
  console.log("Hommes :", h, "\nDames :", d, "\nPage : /t/madiba-demo  ·  /app/tournois/madiba-demo");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
