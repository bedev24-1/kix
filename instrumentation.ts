export async function register() {
  // Le runtime Edge n'a ni système de fichiers ni SQLite : rien à préparer.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { bootstrapDatabase } = await import("./db/bootstrap");
  await bootstrapDatabase();

  // Le tour de garde des promotions : notifications au début, rappel la
  // veille. Toutes les dix minutes, sans bloquer le démarrage.
  const garde = globalThis as unknown as { mbGardePromo?: ReturnType<typeof setInterval> };
  if (!garde.mbGardePromo) {
    garde.mbGardePromo = setInterval(() => {
      void import("./lib/promotions")
        .then((m) => m.tourDeGarde())
        .catch((e) => console.error("[mb] tour de garde des promotions", e));
    }, 10 * 60_000);
  }
}
