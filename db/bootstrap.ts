import "server-only";
import path from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb, createSql } from "./client";
import { venues } from "./schema";

/** Pannes qui se résolvent d'elles-mêmes : la base démarre encore, le DNS du
 *  réseau n'est pas prêt, le pare-feu n'a pas fini de s'ouvrir. */
const TRANSIENT = new Set(["EAI_AGAIN", "ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "ECONNRESET", "57P03"]);

const codeOf = (error: unknown): string | undefined => {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code ?? e?.cause?.code;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Prépare la base au démarrage : migrations, puis jeu de démonstration si le
 * schéma est vide.
 *
 * Dans un conteneur, l'application démarre souvent avant sa base — ou avant que
 * le nom de celle-ci soit résolvable sur le réseau. Abandonner au premier échec
 * laissait alors une application en marche mais incapable de servir une seule
 * page. On réessaie donc, en espaçant, tant que l'erreur est de celles qui
 * passent ; une erreur de configuration, elle, ne s'arrange pas en attendant et
 * s'affiche tout de suite.
 */
export async function bootstrapDatabase() {
  const attempts = Number(process.env.MB_DB_RETRIES ?? 10);

  // Drizzle applique ce qu'il trouve et se tait s'il ne trouve rien : un
  // dossier absent de l'image donnerait un démarrage silencieux et une base
  // vide. On le dit avant, pendant qu'on peut encore le relier à une cause.
  const { availableMigrations, MIGRATIONS_DIR } = await import("@/lib/migrations");
  const available = availableMigrations();
  if (available === 0) {
    console.error(
      `[mb] aucune migration trouvée dans ${MIGRATIONS_DIR} — le dossier db/migrations ` +
        "n'est pas dans l'image de déploiement. Rien ne sera créé en base.",
    );
  }

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const client = createSql();
    const db = createDb(client);

    try {
      await client`create schema if not exists mb`;
      await migrate(db, {
        migrationsFolder: path.join(process.cwd(), "db", "migrations"),
        migrationsSchema: "mb",
      });

      await finish(db);
      await client.end();
      if (attempt > 1) console.log(`[mb] base prête après ${attempt} tentatives`);
      else if (available > 0) console.log(`[mb] base prête — ${available} migrations au catalogue`);
      return;
    } catch (error) {
      await client.end().catch(() => {});
      const code = codeOf(error);

      if (!TRANSIENT.has(code ?? "")) {
        console.error(`[mb] démarrage impossible (${code ?? "erreur"}) :`, error);
        return;
      }

      if (attempt === attempts) {
        console.error(
          `[mb] base toujours injoignable après ${attempts} tentatives (${code}). ` +
            "L'application démarre quand même : /api/health dira ce qui bloque.",
        );
        return;
      }

      // 1 s, 2 s, 4 s… plafonnées à 15 s : on laisse le temps au réseau.
      const delay = Math.min(15_000, 1000 * 2 ** (attempt - 1));
      console.warn(`[mb] base injoignable (${code}), nouvelle tentative dans ${delay / 1000} s…`);
      await wait(delay);
    }
  }
}

/**
 * Le premier administrateur.
 *
 * Sur une base neuve, personne n'a les droits : il fallait jusqu'ici ouvrir
 * psql après s'être inscrit. `MB_ADMIN_PHONE` règle ça — le compte portant ce
 * numéro passe administrateur au démarrage, dès qu'il existe. On le journalise
 * toujours : une élévation de droits ne doit jamais être silencieuse.
 */
async function promoteAdmin(db: ReturnType<typeof createDb>) {
  const raw = process.env.MB_ADMIN_PHONE?.trim();
  if (!raw) return;

  const { normalizePhone, isValidPhone } = await import("@/lib/phone");
  const phone = normalizePhone(raw);
  if (!isValidPhone(phone)) {
    console.warn(`[mb] MB_ADMIN_PHONE « ${raw} » n'est pas un numéro camerounais valide`);
    return;
  }

  const { users } = await import("./schema");
  const { and, eq, ne } = await import("drizzle-orm");
  const changed = await db
    .update(users)
    .set({ role: "admin" })
    .where(and(eq(users.phone, phone), ne(users.role, "admin")))
    .returning({ name: users.name });

  if (changed[0]) console.log(`[mb] ${changed[0].name} (${phone}) est désormais administrateur`);
  else console.log(`[mb] MB_ADMIN_PHONE=${phone} : aucun compte à promouvoir (inscris-toi, puis redémarre)`);
}

/**
 * Les comptes du jeu de démonstration ont eu leur mot de passe affiché sur la
 * page de connexion : la connexion le refuse désormais, et on ferme ici les
 * sessions déjà ouvertes avec. Seuls les numéros du jeu sont examinés — un
 * scrypt par compte réel au démarrage serait trop lent.
 */
async function fermerSessionsDemo(db: ReturnType<typeof createDb>) {
  if (process.env.MB_DEMO === "1") return;
  const { users, sessions } = await import("./schema");
  const { inArray } = await import("drizzle-orm");
  const { verifyPassword } = await import("@/lib/password");
  const numeros = [
    "677451208", "699120345", "690000000", "678900011",
    "670000001", "670000002", "670000003", "670000004",
    ...Array.from({ length: 11 }, (_, i) => `6700001${String(i + 10).padStart(2, "0")}`),
  ];
  const comptes = await db
    .select({ id: users.id, phone: users.phone, hash: users.passwordHash })
    .from(users)
    .where(inArray(users.phone, numeros));
  const demo = process.env.MB_DEMO_PASSWORD ?? "masterbreak";
  const ouverts: string[] = [];
  for (const c of comptes) if (await verifyPassword(demo, c.hash)) ouverts.push(c.id);
  if (!ouverts.length) return;
  const fermees = await db.delete(sessions).where(inArray(sessions.userId, ouverts)).returning({ id: sessions.id });
  console.log(`[mb] comptes de démonstration : ${ouverts.length} fermé(s), ${fermees.length} session(s) coupée(s)`);
}

/** Ce qui suit les migrations : jeu de démonstration, ménage. */
async function finish(db: ReturnType<typeof createDb>) {
  if (process.env.MB_SKIP_SEED !== "1") {
    const rows = await db.select({ id: venues.id }).from(venues).limit(1);
    if (rows.length === 0) {
      console.log("[mb] schéma vide — chargement du jeu de démonstration");
      const { seed } = await import("./seed");
      await seed();
    }
  }

  await promoteAdmin(db);
  await fermerSessionsDemo(db);

  // Les sessions expirées ne servent plus qu'à grossir la table.
  const { purgeExpiredSessions } = await import("@/lib/auth");
  await purgeExpiredSessions();

  // Un paiement laissé en attente (onglet fermé, webhook perdu) doit finir
  // quelque part : on le passe en expiré au démarrage.
  const { expireStalePayments } = await import("@/lib/payments/service");
  const expired = await expireStalePayments();
  if (expired > 0) console.log(`[mb] ${expired} paiement(s) expiré(s)`);
}
