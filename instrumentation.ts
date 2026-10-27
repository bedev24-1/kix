export async function register() {
  // Le runtime Edge n'a ni système de fichiers ni SQLite : rien à préparer.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { bootstrapDatabase } = await import("./db/bootstrap");
  await bootstrapDatabase();

  // Le tour de garde : notifications des promotions (au début, rappel la
  // veille) et rappels de tournoi. Toutes les dix minutes, sans bloquer le
  // démarrage.
  const garde = globalThis as unknown as { mbGardePromo?: ReturnType<typeof setInterval> };
  if (!garde.mbGardePromo) {
    garde.mbGardePromo = setInterval(() => {
      void import("./lib/promotions")
        .then((m) => m.tourDeGarde())
        .catch((e) => console.error("[mb] tour de garde des promotions", e));
      // Les rappels de tournoi : J-2, J-1, le jour J, une heure avant.
      void import("./lib/tournoi-avis")
        .then((m) => m.rappelsDesTournois())
        .catch((e) => console.error("[mb] rappels de tournoi", e));
    }, 10 * 60_000);
  }
}
