import { eq, sql } from "drizzle-orm";
import { db, popups } from "@/db";

const UUID = /^[0-9a-f-]{36}$/i;

/** Compter une vue, un clic ou une fermeture : c'est ce qui dit si la promotion marche. */
export async function POST(request: Request) {
  const corps = (await request.json().catch(() => null)) as { id?: string; quoi?: string } | null;
  if (!corps?.id || !UUID.test(corps.id)) return Response.json({ ok: false }, { status: 400 });
  const colonne = corps.quoi === "clic" ? popups.clics : corps.quoi === "fermeture" ? popups.fermetures : popups.vues;
  const champ = corps.quoi === "clic" ? "clics" : corps.quoi === "fermeture" ? "fermetures" : "vues";
  await db.update(popups).set({ [champ]: sql`${colonne} + 1` }).where(eq(popups.id, corps.id));
  return Response.json({ ok: true });
}
