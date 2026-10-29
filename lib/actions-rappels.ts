"use server";

import { eq } from "drizzle-orm";
import { db, rappelsDirect } from "@/db";
import { requireUser } from "@/lib/session";

/** Poser ou retirer le rappel « Me prévenir au prochain direct ». Rend l'état obtenu. */
export async function basculerRappel(voulu: boolean): Promise<boolean> {
  const user = await requireUser();
  if (voulu) {
    await db.insert(rappelsDirect).values({ userId: user.id }).onConflictDoNothing();
  } else {
    await db.delete(rappelsDirect).where(eq(rappelsDirect.userId, user.id));
  }
  return voulu;
}
